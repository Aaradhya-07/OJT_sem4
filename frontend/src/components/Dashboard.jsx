import React from 'react';
import { ShieldCheck, Crosshair, BarChart2 } from 'lucide-react';
import AnomalyScatter from './charts/AnomalyScatter';
import TimelineChart from './charts/TimelineChart';
import FeatureComparison from './charts/FeatureComparison';
import AnomalyTable from './AnomalyTable';

export default function Dashboard({ data, onReset }) {
  if (!data) return null;

  const { total_records, anomalies_found, anomaly_pct, results } = data;

  // Pre-process results to split them easily for charts
  const normalPoints = results.filter(r => r.is_anomaly === 0);
  const anomalousPoints = results.filter(r => r.is_anomaly === 1);

  return (
    <div className="animate-fade-in" style={{ paddingBottom: '4rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h2>Analysis Results</h2>
        <button className="btn-primary" onClick={onReset} style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }}>
          Analyze Another File
        </button>
      </div>

      {/* Top Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
        <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          <div style={{ background: 'rgba(255, 255, 255, 0.05)', padding: '1rem', borderRadius: '12px' }}>
            <Database size={28} color="var(--text-muted)" />
          </div>
          <div>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '0.25rem' }}>Total Readings</div>
            <div style={{ fontSize: '1.8rem', fontWeight: 700 }}>{total_records.toLocaleString()}</div>
          </div>
        </div>
        
        <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          <div style={{ background: 'var(--anomaly-glow)', padding: '1rem', borderRadius: '12px' }}>
            <Crosshair size={28} color="var(--anomaly)" />
          </div>
          <div>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '0.25rem' }}>Anomalies Detected</div>
            <div style={{ fontSize: '1.8rem', fontWeight: 700, color: 'var(--anomaly)' }}>{anomalies_found.toLocaleString()}</div>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          <div style={{ background: 'var(--accent-glow)', padding: '1rem', borderRadius: '12px' }}>
            <BarChart2 size={28} color="var(--accent)" />
          </div>
          <div>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '0.25rem' }}>Anomaly Rate</div>
            <div style={{ fontSize: '1.8rem', fontWeight: 700, color: 'var(--accent)' }}>{anomaly_pct}%</div>
          </div>
        </div>
      </div>

      {/* Main Charts */}
      <div className="grid grid-cols-2" style={{ marginBottom: '1.5rem' }}>
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <h3 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--anomaly)' }} />
            Anomaly Timeline (CO)
          </h3>
          <TimelineChart data={results} />
        </div>

        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <h3 style={{ marginBottom: '1rem' }}>CO vs NOx Density</h3>
          <AnomalyScatter normal={normalPoints} anomalies={anomalousPoints} />
        </div>
      </div>

      <div className="grid grid-cols-2">
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <h3 style={{ marginBottom: '1rem' }}>Feature Breakdown (Normal vs Anomaly)</h3>
          <FeatureComparison normal={normalPoints} anomalies={anomalousPoints} />
        </div>

        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <h3 style={{ marginBottom: '1rem' }}>Critical System Events (Top 10)</h3>
          <AnomalyTable anomalies={anomalousPoints} />
        </div>
      </div>
    </div>
  );
}

// Inline DB icon component for the dash
function Database(props) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={props.size} height={props.size} viewBox="0 0 24 24" fill="none" stroke={props.color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <ellipse cx="12" cy="5" rx="9" ry="3"></ellipse>
      <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"></path>
      <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"></path>
    </svg>
  );
}
