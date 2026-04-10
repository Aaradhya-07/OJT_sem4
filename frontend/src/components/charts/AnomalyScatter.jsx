import React from 'react';
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export default function AnomalyScatter({ normal, anomalies }) {
  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div style={{
          background: 'rgba(10, 10, 15, 0.9)',
          border: `1px solid ${data.is_anomaly === 1 ? 'var(--anomaly)' : 'var(--glass-border)'}`,
          padding: '1rem',
          borderRadius: '8px',
          color: '#fff',
          boxShadow: '0 4px 20px rgba(0,0,0,0.5)'
        }}>
          <div style={{ fontWeight: 600, marginBottom: '0.5rem', color: data.is_anomaly === 1 ? 'var(--anomaly)' : 'var(--accent)' }}>
            {data.is_anomaly === 1 ? '⚠️ Anomaly Detected' : '✅ Normal Reading'}
          </div>
          <div style={{ fontSize: '0.85rem' }}>
            <div style={{ marginBottom: '0.25rem' }}><strong>Date:</strong> {new Date(data.datetime).toLocaleString()}</div>
            <div style={{ marginBottom: '0.25rem' }}><strong>CO(GT):</strong> {data['CO(GT)']} mg/m³</div>
            <div><strong>NOx(GT):</strong> {data['NOx(GT)']} ppb</div>
            {data.is_anomaly === 1 && (
              <div style={{ marginTop: '0.25rem', color: '#ff8099' }}>
                <strong>Score:</strong> {data.anomaly_score.toFixed(3)}
              </div>
            )}
          </div>
        </div>
      );
    }
    return null;
  };

  // Recharts handles thousands of points poorly if unoptimized, but Scatter is quite fast.
  // We'll map the data to simple arrays.
  
  return (
    <div style={{ height: '350px', width: '100%' }}>
      <ResponsiveContainer width="100%" height="100%">
        <ScatterChart
          margin={{ top: 20, right: 20, bottom: 20, left: 10 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
          <XAxis 
            type="number" 
            dataKey="CO(GT)" 
            name="CO(GT)" 
            stroke="var(--text-muted)"
            tick={{ fill: 'var(--text-muted)', fontSize: 12 }}
            domain={['auto', 'auto']}
          >
            <title>CO (mg/m³)</title>
          </XAxis>
          <YAxis 
            type="number" 
            dataKey="NOx(GT)" 
            name="NOx(GT)" 
            stroke="var(--text-muted)"
            tick={{ fill: 'var(--text-muted)', fontSize: 12 }}
          />
          <Tooltip cursor={{ strokeDasharray: '3 3' }} content={<CustomTooltip />} />
          <Legend wrapperStyle={{ paddingTop: '20px' }}/>
          <Scatter 
            name="Normal" 
            data={normal} 
            fill="#3a86ff" 
            opacity={0.3}
            shape="circle"
          />
          <Scatter 
            name="Anomaly" 
            data={anomalies} 
            fill="var(--anomaly)"
            opacity={0.9} 
            shape="cross"
          />
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
}
