import React, { useRef, useState } from 'react';
import { UploadCloud, File, AlertTriangle } from 'lucide-react';

export default function UploadSection({ onUpload, loading, error }) {
  const [dragActive, setDragActive] = useState(false);
  const [file, setFile] = useState(null);
  const [contamination, setContamination] = useState(0.05);
  const inputRef = useRef(null);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleSubmit = () => {
    if (file) {
      onUpload(file, contamination);
    }
  };

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto' }}>
      <div 
        className={`glass-panel`} 
        style={{ 
          padding: '3rem 2rem', 
          textAlign: 'center',
          borderColor: dragActive ? 'var(--accent)' : 'var(--glass-border)',
          position: 'relative'
        }}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <div style={{ marginBottom: '2rem' }}>
          <div style={{ 
            display: 'inline-flex', 
            background: 'var(--glass-highlight)', 
            padding: '1.5rem', 
            borderRadius: '50%',
            marginBottom: '1rem',
            boxShadow: dragActive ? '0 0 20px var(--accent-glow)' : 'none',
            transition: 'var(--transition)'
          }}>
            <UploadCloud size={48} color={dragActive ? 'var(--accent)' : 'var(--text-muted)'} />
          </div>
          <h2>Upload Sensor Data</h2>
          <p>Drag and drop the UCI Air Quality CSV file here or click to browse.</p>
        </div>

        <input 
          ref={inputRef}
          type="file" 
          accept=".csv"
          onChange={handleChange}
          style={{ display: 'none' }} 
        />
        
        {file ? (
          <div style={{ 
            background: 'rgba(255, 255, 255, 0.05)', 
            padding: '1rem', 
            borderRadius: '12px', 
            display: 'flex', 
            alignItems: 'center', 
            gap: '1rem',
            marginBottom: '1.5rem',
            textAlign: 'left'
          }}>
            <File size={24} color="var(--accent)" />
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600 }}>{file.name}</div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                {(file.size / 1024 / 1024).toFixed(2)} MB
              </div>
            </div>
            <button 
              onClick={() => setFile(null)}
              style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
            >
              ✕
            </button>
          </div>
        ) : (
          <button 
            className="btn-primary" 
            style={{ marginBottom: '1.5rem' }}
            onClick={() => inputRef.current?.click()}
            disabled={loading}
          >
            Browse Files
          </button>
        )}

        <div style={{ textAlign: 'left', marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid var(--glass-border)' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>
            Contamination Rate: <span style={{ color: 'var(--accent)' }}>{(contamination * 100).toFixed(1)}%</span>
            <span style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 400, marginTop: '0.25rem' }}>
              The expected proportion of anomalies in the dataset.
            </span>
          </label>
          <input 
            type="range" 
            min="0.01" 
            max="0.2" 
            step="0.01" 
            value={contamination} 
            onChange={(e) => setContamination(parseFloat(e.target.value))}
            style={{ width: '100%', accentColor: 'var(--accent)', cursor: 'pointer' }}
            disabled={loading}
          />
        </div>
      </div>

      {error && (
        <div style={{ 
          marginTop: '1.5rem', 
          padding: '1rem', 
          background: 'rgba(255, 51, 102, 0.1)', 
          border: '1px solid var(--anomaly)', 
          borderRadius: '12px',
          display: 'flex',
          alignItems: 'center',
          gap: '1rem',
          color: '#ff8099'
        }}>
          <AlertTriangle />
          <span>{error}</span>
        </div>
      )}

      <div style={{ marginTop: '2rem', textAlign: 'center' }}>
        <button 
          className="btn-primary" 
          onClick={handleSubmit} 
          disabled={!file || loading}
          style={{ width: '100%', padding: '1rem', fontSize: '1.1rem' }}
        >
          {loading ? 'Analyzing Data...' : 'Run Isolation Forest Analysis'}
        </button>
      </div>
    </div>
  );
}
