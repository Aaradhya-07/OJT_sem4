import React, { useRef, useState } from 'react';
import { UploadCloud, File, AlertTriangle } from 'lucide-react';

export default function UploadSection({ onUpload, loading, error }) {
  const [dragActive, setDragActive] = useState(false);
  const [file, setFile] = useState(null);
  const contamination = "0.05";
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
    <div className="max-w-2xl mx-auto w-full px-4">
      <div 
        className={`bg-card rounded-xl border-2 border-dashed transition-all duration-200 p-12 text-center relative ${
          dragActive ? 'border-accent shadow-[0_0_20px_var(--accent)] bg-card/80' : 'border-card-border hover:border-text-secondary/50'
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <div className="mb-8">
          <div className={`inline-flex rounded-full p-6 mb-4 transition-all duration-200 ${
            dragActive ? 'bg-accent/20' : 'bg-page-bg'
          }`}>
            <UploadCloud size={48} className={dragActive ? 'text-accent' : 'text-text-secondary'} />
          </div>
          <h2 className="text-2xl font-bold text-text-primary mb-2">Upload Sensor Data</h2>
          <p className="text-text-secondary">Drag and drop the UCI Air Quality CSV file here or click to browse.</p>
        </div>

        <input 
          ref={inputRef}
          type="file" 
          accept=".csv"
          onChange={handleChange}
          className="hidden"
        />
        
        {file ? (
          <div className="bg-page-bg/50 border border-card-border p-4 rounded-xl flex items-center gap-4 mb-6 text-left">
            <File size={24} className="text-accent flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-text-primary truncate">{file.name}</div>
              <div className="text-sm text-text-secondary">
                {(file.size / 1024 / 1024).toFixed(2)} MB
              </div>
            </div>
            <button 
              onClick={() => setFile(null)}
              className="text-text-secondary hover:text-text-primary transition-colors flex-shrink-0"
            >
              ✕
            </button>
          </div>
        ) : (
          <button 
            className="bg-accent text-page-bg hover:bg-accent/90 font-semibold px-6 py-2.5 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed mb-6"
            onClick={() => inputRef.current?.click()}
            disabled={loading}
          >
            Browse Files
          </button>
        )}
      </div>

      {error && (
        <div className="mt-6 p-4 bg-critical/10 border border-critical rounded-xl flex items-center gap-4 text-critical">
          <AlertTriangle className="flex-shrink-0" />
          <span className="text-sm">{error}</span>
        </div>
      )}

      <div className="mt-8 text-center w-full">
        <button 
          className="bg-accent text-page-bg hover:bg-accent/90 font-bold px-8 py-4 rounded-xl w-full text-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          onClick={handleSubmit} 
          disabled={!file || loading}
        >
          {loading ? 'Analyzing Data...' : 'Run Isolation Forest Analysis'}
        </button>
      </div>
    </div>
  );
}
