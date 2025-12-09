import { useEffect, useState } from 'react';
import 'leaflet/dist/leaflet.css';
import Map from './components/Map';

function App() {
  const [status, setStatus] = useState<string>('Connecting...');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('http://localhost:8000/health')
      .then(res => res.json())
      .then(data => setStatus(data.message))
      .catch(err => {
        console.error(err);
        setError('Failed to connect to backend');
        setStatus('Error');
      });
  }, []);

  return (
    <div className="flex flex-col h-screen bg-slate-900 text-white overflow-hidden">
      <header className="flex flex-none items-center justify-between px-6 py-4 bg-slate-800 shadow-md z-10">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold text-white">GhostMap</h1>
          <div className="text-sm">
            Status: <span className={`font-semibold ${error ? 'text-red-400' : 'text-green-400'}`}>{status}</span>
            {error && <span className="ml-2 text-red-500">({error})</span>}
          </div>
        </div>
      </header>

      <main className="flex-1 w-full h-full relative">
        <Map />
      </main>
    </div>
  );
}

export default App;
