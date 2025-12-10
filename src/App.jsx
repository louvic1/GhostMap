import React, { useState } from 'react';
import Map from './components/Map';
import Sidebar from './components/Sidebar';
import Branding from './components/Branding';
import MenuTrigger from './components/MenuTrigger';
import * as turf from '@turf/turf';
import './App.css';

function App() {
  const [startCoords, setStartCoords] = useState(null);
  const [endCoords, setEndCoords] = useState(null);
  const [routeGeoJSON, setRouteGeoJSON] = useState(null);
  const [safeRouteGeoJSON, setSafeRouteGeoJSON] = useState(null);
  const [cameras, setCameras] = useState(null);
  const [routeStats, setRouteStats] = useState(null); // { standard: {time, cams}, safe: {time, cams} }
  const [isCalculated, setIsCalculated] = useState(false);
  const [isSidebarOpen, setSidebarOpen] = useState(false);

  // Load cameras on mount
  React.useEffect(() => {
    fetch('./camera.geojson')
      .then(res => res.json())
      .then(data => setCameras(data))
      .catch(err => console.error('Error loading cameras:', err));
  }, []);

  // Helper: Analyze Route stats (Paranoia Mode)
  const analyzeRoute = (route) => {
    if (!route) return { cams: 999, time: 0, distance: 0 };
    const durationMins = Math.round(route.duration / 60);
    const distanceKm = (route.distance / 1000).toFixed(2);
    let cameraCount = 0;

    if (cameras) {
      const routeLine = turf.lineString(route.geometry.coordinates);
      // KEEP 50m BUFFER
      const bufferedRoute = turf.buffer(routeLine, 50, { units: 'meters' });
      const pointsInRoute = turf.pointsWithinPolygon(cameras, bufferedRoute);
      cameraCount = pointsInRoute.features.length;
    }
    return {
      cams: cameraCount,
      time: durationMins,
      distance: distanceKm,
      route
    };
  };

  const handleReset = () => {
    setRouteGeoJSON(null);
    setSafeRouteGeoJSON(null);
    setRouteStats(null);
    setStartCoords(null);
    setEndCoords(null);
    setIsCalculated(false);
  };

  const calculateWithWaypoints = async (waypoints, token) => {
    // Helper to fetch multiple routes in parallel
    const promises = waypoints.map(async (wp) => {
      try {
        const q = await fetch(
          `https://api.mapbox.com/directions/v5/mapbox/walking/${startCoords[0]},${startCoords[1]};${wp[0]},${wp[1]};${endCoords[0]},${endCoords[1]}?steps=true&geometries=geojson&access_token=${token}`
        );
        const j = await q.json();
        if (j.routes && j.routes.length > 0) return analyzeRoute(j.routes[0]);
      } catch (e) { console.error('Detour failed', e); }
      return null;
    });
    const results = await Promise.all(promises);
    return results.filter(r => r !== null);
  };

  const handleCalculateRoutes = async () => {
    if (!startCoords || !endCoords) {
      console.warn('Start or End coordinates are missing.');
      return;
    }
    const token = import.meta.env.VITE_MAPBOX_TOKEN;

    try {
      console.log('--- Zero Tolerance Protocol Initiated ---');
      setRouteStats(null);
      setSafeRouteGeoJSON(null);

      // 1. Standard Route
      const queryStandard = await fetch(
        `https://api.mapbox.com/directions/v5/mapbox/walking/${startCoords[0]},${startCoords[1]};${endCoords[0]},${endCoords[1]}?steps=true&geometries=geojson&alternatives=true&access_token=${token}`
      );
      const jsonStandard = await queryStandard.json();
      if (!jsonStandard.routes || jsonStandard.routes.length === 0) {
        console.warn('No routes found.');
        return;
      }

      const standardRoute = jsonStandard.routes[0];
      const standardStats = analyzeRoute(standardRoute);
      console.log(`Standard Route: ${standardStats.time} min, ${standardStats.cams} cams.`);

      setRouteGeoJSON({
        type: 'Feature',
        properties: {},
        geometry: standardRoute.geometry
      });

      if (!cameras) { // Cannot do safe routing without cameras
        setRouteStats({
          standard: { time: standardStats.time, cams: '?', dist: standardStats.distance },
          safe: null
        });
        setIsCalculated(true);
        return;
      }

      // 2. PASS 1: WIDE NET (Standard waypoints)
      const startPoint = turf.point(startCoords);
      const endPoint = turf.point(endCoords);
      const mid = turf.midpoint(startPoint, endPoint);
      const [midLng, midLat] = mid.geometry.coordinates;

      const pass1Waypoints = [
        [midLng, midLat + 0.005], [midLng, midLat - 0.005],
        [midLng + 0.015, midLat], [midLng - 0.015, midLat],
        [midLng, midLat + 0.030], [midLng, midLat - 0.030],
        [midLng + 0.010, midLat + 0.010], [midLng - 0.010, midLat - 0.010]
      ];

      console.log(`Firing Wide Net (${pass1Waypoints.length} vectors)...`);
      let candidates = await calculateWithWaypoints(pass1Waypoints, token);

      // Add standard to candidates
      candidates.push(standardStats);

      // Sort Pass 1
      candidates.sort((a, b) => a.cams - b.cams || a.time - b.time);
      let bestCandidate = candidates[0];

      // 3. PASS 2: RESCUE (If Pass 1 failed to reach 0 cams)
      if (bestCandidate.cams > 0) {
        console.warn(`Pass 1 Failed (Best: ${bestCandidate.cams} cams). Initiating RESCUE PASS...`);

        // EXTREME offsets (+/- 0.04 deg ~4.5km)
        const extremeVal = 0.045;
        const pass2Waypoints = [
          [midLng, midLat + extremeVal],
          [midLng, midLat - extremeVal],
          [midLng + extremeVal, midLat],
          [midLng - extremeVal, midLat]
        ];

        const rescueCandidates = await calculateWithWaypoints(pass2Waypoints, token);
        if (rescueCandidates.length > 0) {
          rescueCandidates.sort((a, b) => a.cams - b.cams || a.time - b.time);
          const bestRescue = rescueCandidates[0];

          if (bestRescue.cams < bestCandidate.cams) {
            console.log(`Rescue Successful! dropping from ${bestCandidate.cams} to ${bestRescue.cams}`);
            bestCandidate = bestRescue;
          }
        }
      }

      console.log('Zero Tolerance Winner:', bestCandidate.cams, 'cams');

      // Set Safe Route
      if (bestCandidate.cams < standardStats.cams || (bestCandidate.cams === standardStats.cams && bestCandidate !== standardStats)) {
        setSafeRouteGeoJSON({
          type: 'Feature',
          properties: {},
          geometry: bestCandidate.route.geometry
        });
      } else {
        setSafeRouteGeoJSON(null);
      }

      setRouteStats({
        standard: { time: standardStats.time, cams: standardStats.cams, dist: standardStats.distance },
        safe: { time: bestCandidate.time, cams: bestCandidate.cams, dist: bestCandidate.distance }
      });

      setIsCalculated(true);

    } catch (err) {
      console.error('Error calculating routes:', err);
    }
  };

  return (
    <div>
      <Branding />
      <MenuTrigger onClick={() => setSidebarOpen(true)} />

      <Map
        startCoords={startCoords}
        endCoords={endCoords}
        routeGeoJSON={routeGeoJSON}
        safeRouteGeoJSON={safeRouteGeoJSON}
      />

      <Sidebar
        isOpen={isSidebarOpen}
        onClose={() => setSidebarOpen(false)}
        setStartCoords={setStartCoords}
        setEndCoords={setEndCoords}
        onCalculate={handleCalculateRoutes}
        routeStats={routeStats}
        isCalculated={isCalculated}
        onReset={handleReset}
      />
    </div>
  );
}

export default App;
