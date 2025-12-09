import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, Polyline } from 'react-leaflet';
import L from 'leaflet';

// Fix for default marker icons in React Leaflet with Vite
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});

// Custom Icons for Start (Green) and End (Red)
const greenIcon = new L.Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});

const redIcon = new L.Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

// Montreal coordinates
const position: [number, number] = [45.5017, -73.5673];

interface Camera {
    id: number;
    lat: number;
    lng: number;
    type?: string;
    operator?: string;
}

function LocationSelector({ setStart, setEnd }: { setStart: (latlng: [number, number]) => void, setEnd: (latlng: [number, number]) => void }) {
    useMapEvents({
        click(e) {
            setStart([e.latlng.lat, e.latlng.lng]);
        },
        contextmenu(e) {
            e.originalEvent.preventDefault();
            setEnd([e.latlng.lat, e.latlng.lng]);
        },
    });
    return null;
}

export default function Map() {
    const [cameras, setCameras] = useState<Camera[]>([]);
    const [startPoint, setStartPoint] = useState<[number, number] | null>(null);
    const [endPoint, setEndPoint] = useState<[number, number] | null>(null);
    const [fastPath, setFastPath] = useState<[number, number][]>([]);
    const [safePath, setSafePath] = useState<[number, number][]>([]);

    useEffect(() => {
        fetch('http://localhost:8000/api/cameras')
            .then(res => res.json())
            .then(data => {
                console.log('Fetched cameras:', data);
                setCameras(data);
            })
            .catch(err => console.error('Error fetching cameras:', err));
    }, []);

    useEffect(() => {
        if (startPoint && endPoint) {
            const url = `http://localhost:8000/api/route?start_lat=${startPoint[0]}&start_lon=${startPoint[1]}&end_lat=${endPoint[0]}&end_lon=${endPoint[1]}`;
            fetch(url)
                .then(res => {
                    if (!res.ok) throw new Error("Failed to fetch route");
                    return res.json();
                })
                .then(data => {
                    console.log("Fetched route:", data);
                    setFastPath(data.fast || []);
                    setSafePath(data.safe || []);
                })
                .catch(err => {
                    console.error("Error fetching route:", err);
                    setFastPath([]);
                    setSafePath([]);
                });
        }
    }, [startPoint, endPoint]);

    return (
        <div className="w-full h-full relative z-0">
            <MapContainer
                center={position}
                zoom={13}
                scrollWheelZoom={true}
                className="w-full h-full"
            >
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <LocationSelector setStart={setStartPoint} setEnd={setEndPoint} />

                {cameras.map(cam => (
                    <Marker key={cam.id} position={[cam.lat, cam.lng]}>
                        <Popup>
                            <div>
                                <strong>ID:</strong> {cam.id}<br />
                                <strong>Type:</strong> {cam.type || 'N/A'}<br />
                                <strong>Operator:</strong> {cam.operator || 'N/A'}
                            </div>
                        </Popup>
                    </Marker>
                ))}

                {startPoint && (
                    <Marker position={startPoint} icon={greenIcon}>
                        <Popup>Start Point</Popup>
                    </Marker>
                )}

                {endPoint && (
                    <Marker position={endPoint} icon={redIcon}>
                        <Popup>End Point</Popup>
                    </Marker>
                )}

                {/* Fastest Path (Blue, semi-transparent) */}
                {fastPath.length > 0 && (
                    <Polyline positions={fastPath} color="blue" weight={5} opacity={0.5}>
                        <Popup>Fastest Path</Popup>
                    </Polyline>
                )}

                {/* Safest/Ghost Path (Purple, bold) */}
                {safePath.length > 0 && (
                    <Polyline positions={safePath} color="purple" weight={6} opacity={0.9}>
                        <Popup>Ghost Mode (Safe) Path</Popup>
                    </Polyline>
                )}

                {/* Legend Overlay */}
                <div className="leaflet-bottom leaflet-right m-4 z-[1000] pointer-events-auto">
                    <div className="bg-white p-4 rounded shadow-lg text-sm text-slate-900 border border-slate-200">
                        <h4 className="font-bold mb-2">Legend</h4>
                        <div className="flex items-center gap-2 mb-1">
                            <span className="w-6 h-1 bg-blue-500 opacity-50 block"></span>
                            <span>Fastest Path</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="w-6 h-1 bg-purple-600 block"></span>
                            <span>Ghost Path</span>
                        </div>
                    </div>
                </div>

            </MapContainer>
        </div>
    );
}
