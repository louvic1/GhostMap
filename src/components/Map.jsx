import React, { useRef, useEffect, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

function Map({ startCoords, endCoords, routeGeoJSON, safeRouteGeoJSON }) {
    const mapContainerRef = useRef(null);
    const mapRef = useRef(null);
    const startMarkerRef = useRef(null);
    const endMarkerRef = useRef(null);
    const [styleLoaded, setStyleLoaded] = useState(false);

    // Initialize Map
    useEffect(() => {
        mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN;

        const map = new mapboxgl.Map({
            container: mapContainerRef.current,
            style: 'mapbox://styles/louvic/cmj0jnvhv003q01s99nyx3gz0',
            center: [-73.5673, 45.5017], // Montreal
            zoom: 11
        });

        mapRef.current = map;

        map.on('load', () => {
            setStyleLoaded(true);

            // Add camera source/layers initially
            map.addSource('cameras', {
                type: 'geojson',
                data: './camera.geojson',
                cluster: true,
                clusterMaxZoom: 14,
                clusterRadius: 50
            });

            // Clusters Layer
            map.addLayer({
                id: 'clusters',
                type: 'circle',
                source: 'cameras',
                filter: ['has', 'point_count'],
                paint: {
                    'circle-color': '#ff4d4d',
                    'circle-radius': ['step', ['get', 'point_count'], 15, 10, 20, 50, 25]
                }
            });

            // Cluster Count
            map.addLayer({
                id: 'cluster-count',
                type: 'symbol',
                source: 'cameras',
                filter: ['has', 'point_count'],
                layout: {
                    'text-field': '{point_count_abbreviated}',
                    'text-font': ['DIN Offc Pro Medium', 'Arial Unicode MS Bold'],
                    'text-size': 12
                },
                paint: { 'text-color': '#ffffff' }
            });

            // Unclustered Points
            map.addLayer({
                id: 'unclustered-point',
                type: 'circle',
                source: 'cameras',
                filter: ['!', ['has', 'point_count']],
                paint: {
                    'circle-color': '#00FF00',
                    'circle-radius': 6,
                    'circle-stroke-width': 1,
                    'circle-stroke-color': '#fff'
                }
            });

            // Interactions
            map.on('click', 'clusters', (e) => {
                const features = map.queryRenderedFeatures(e.point, { layers: ['clusters'] });
                const clusterId = features[0].properties.cluster_id;
                map.getSource('cameras').getClusterExpansionZoom(clusterId, (err, zoom) => {
                    if (err) return;
                    map.easeTo({ center: features[0].geometry.coordinates, zoom: zoom });
                });
            });

            map.on('mouseenter', 'clusters', () => map.getCanvas().style.cursor = 'pointer');
            map.on('mouseleave', 'clusters', () => map.getCanvas().style.cursor = '');
        });

        return () => map.remove();
    }, []);

    // Helper: Update Source & Layers
    const updateRouteSource = (id, data, colorGlow, colorCore, isDashed = false) => {
        const map = mapRef.current;
        if (!map || !styleLoaded) return;

        // Ensure data is valid GeoJSON Feature or FeatureCollection
        const geojsonData = data || { type: 'FeatureCollection', features: [] };

        // 1. Add Source if missing
        if (!map.getSource(id)) {
            map.addSource(id, {
                type: 'geojson',
                data: geojsonData
            });
        } else {
            map.getSource(id).setData(geojsonData);
        }

        // 2. Add Layers if missing (Standard Layers)
        const glowId = `${id}-glow`;
        const coreId = `${id}-core`;
        const beforeId = 'clusters'; // Render BELOW clusters

        if (!map.getLayer(glowId)) {
            map.addLayer({
                id: glowId,
                type: 'line',
                source: id,
                layout: { 'line-join': 'round', 'line-cap': 'round' },
                paint: {
                    'line-color': colorGlow,
                    'line-width': 10,
                    'line-blur': 2,
                    'line-opacity': 0.4
                }
            }, beforeId);
        }

        if (!map.getLayer(coreId)) {
            map.addLayer({
                id: coreId,
                type: 'line',
                source: id,
                layout: { 'line-join': 'round', 'line-cap': 'round' },
                paint: {
                    'line-color': colorCore,
                    'line-width': 4,
                    'line-opacity': 1,
                    ...(isDashed ? { 'line-dasharray': [2, 1] } : {})
                }
            }, beforeId);
        }
    };

    // React Effect: Render Routes
    useEffect(() => {
        if (!styleLoaded) return;

        // Standard Route (Cyan/White)
        if (routeGeoJSON) {
            updateRouteSource('route', routeGeoJSON, '#00FFFF', '#FFFFFF', false);
        }

        // Safe Route (Green/Neon Green)
        if (safeRouteGeoJSON) {
            updateRouteSource('safe-route', safeRouteGeoJSON, '#00FF00', '#39FF14', true);
        } else {
            // Clear if null
            updateRouteSource('safe-route', { type: 'FeatureCollection', features: [] }, '#00FF00', '#39FF14', true);
        }

        // Fit Bounds Logic
        const map = mapRef.current;
        const coords = [];

        if (routeGeoJSON?.geometry?.coordinates) {
            coords.push(...routeGeoJSON.geometry.coordinates);
        }
        if (safeRouteGeoJSON?.geometry?.coordinates) {
            coords.push(...safeRouteGeoJSON.geometry.coordinates);
        }

        if (coords.length > 0) {
            const bounds = new mapboxgl.LngLatBounds();
            coords.forEach(coord => bounds.extend(coord));
            map.fitBounds(bounds, { padding: 80 });
        }

    }, [routeGeoJSON, safeRouteGeoJSON, styleLoaded]);


    // Handle Markers (Start/End)
    useEffect(() => {
        if (!mapRef.current) return;
        if (startCoords) {
            if (!startMarkerRef.current) {
                startMarkerRef.current = new mapboxgl.Marker({ color: '#3FB1CE' })
                    .setLngLat(startCoords)
                    .addTo(mapRef.current);
            } else {
                startMarkerRef.current.setLngLat(startCoords);
            }
        }
        if (endCoords) {
            if (!endMarkerRef.current) {
                endMarkerRef.current = new mapboxgl.Marker({ color: '#FF0000' })
                    .setLngLat(endCoords)
                    .addTo(mapRef.current);
            } else {
                endMarkerRef.current.setLngLat(endCoords);
            }
        }
    }, [startCoords, endCoords]);

    return (
        <div
            ref={mapContainerRef}
            style={{ width: '100vw', height: '100vh', position: 'absolute', top: 0, left: 0 }}
        />
    );
}

export default Map;
