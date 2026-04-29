import React, { useState } from 'react';
import axios from 'axios';
import { ShieldAlert, Activity, Database, Leaf } from 'lucide-react';
import UploadSection from './components/UploadSection';
import Dashboard from './components/Dashboard';

function App() {
  const [analysisData, setAnalysisData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleFileUpload = async (file, contamination) => {
    setLoading(true);
    setError('');
    
    // Convert to FormData
    const formData = new FormData();
    formData.append('file', file);
    formData.append('contamination', contamination);

    try {
      const API_URL = import.meta.env.VITE_API_URL || 'https://ojt-sem4.onrender.com';
      const response = await axios.post(`${API_URL}/analyze`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      setAnalysisData(response.data);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.detail || 'An error occurred while uploading. Please check the backend connection.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container animate-fade-in">
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem', margin: '2rem 0 4rem 0' }}>
        <div style={{ background: 'rgba(0, 240, 255, 0.1)', padding: '1rem', borderRadius: '50%', border: '1px solid var(--accent)' }}>
          <Activity size={32} color="var(--accent)" />
        </div>
        <div>
          <h1>Air Quality Anomaly Detection</h1>
          <p style={{ marginTop: '0.25rem' }}>Isolation Forest Sensor Drift & Spike Detection</p>
        </div>
      </header>

      {!analysisData ? (
        <UploadSection onUpload={handleFileUpload} loading={loading} error={error} />
      ) : (
        <Dashboard data={analysisData} onReset={() => setAnalysisData(null)} />
      )}
    </div>
  );
}

export default App;
