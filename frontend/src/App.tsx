import { useEffect, useState } from 'react';

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
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-900 text-white">
      <h1 className="text-4xl font-bold mb-4">GhostMap</h1>
      <p className="text-lg text-slate-300">
        Backend Status: <span className={`font-semibold ${error ? 'text-red-400' : 'text-green-400'}`}>{status}</span>
      </p>
      {error && <p className="text-sm text-red-500 mt-2">{error}</p>}
    </div>
  );
}

export default App;
