import React, { useState, useMemo } from 'react';
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const FEATURES = ["CO(GT)", "C6H6(GT)", "NOx(GT)", "NO2(GT)", "T", "RH", "AH"];

export default function AnomalyScatter({ normal, anomalies }) {
  const [featureX, setFeatureX] = useState("CO(GT)");
  const [featureY, setFeatureY] = useState("NOx(GT)");

  // To reduce congestion, we can downsample normal points and tweak styling
  const downsampledNormal = useMemo(() => {
    // Take 1 in 10 normal points to space it out and improve performance
    return normal.filter((_, i) => i % 10 === 0);
  }, [normal]);

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
            <div style={{ marginBottom: '0.25rem' }}><strong>{featureX}:</strong> {data[featureX]}</div>
            <div><strong>{featureY}:</strong> {data[featureY]}</div>
            {data.is_anomaly === 1 && (
              <div style={{ marginTop: '0.25rem', color: '#ff8099' }}>
                <strong>Score:</strong> {data.anomaly_score?.toFixed(3)}
              </div>
            )}
          </div>
        </div>
      );
    }
    return null;
  };
  
  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h3 style={{ margin: 0 }}>Feature Density Scatter</h3>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>X:</span>
          <select 
            value={featureX} 
            onChange={(e) => setFeatureX(e.target.value)}
            style={{ padding: '0.25rem 0.5rem', borderRadius: '4px', background: 'rgba(255,255,255,0.05)', color: 'white', border: '1px solid var(--glass-border)', outline: 'none' }}
          >
            {FEATURES.map(f => (
              <option key={`x-${f}`} value={f} style={{ color: 'black' }}>{f}</option>
            ))}
          </select>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginLeft: '0.5rem' }}>Y:</span>
          <select 
            value={featureY} 
            onChange={(e) => setFeatureY(e.target.value)}
            style={{ padding: '0.25rem 0.5rem', borderRadius: '4px', background: 'rgba(255,255,255,0.05)', color: 'white', border: '1px solid var(--glass-border)', outline: 'none' }}
          >
            {FEATURES.map(f => (
              <option key={`y-${f}`} value={f} style={{ color: 'black' }}>{f}</option>
            ))}
          </select>
        </div>
      </div>
      <div style={{ height: '350px', width: '100%' }}>
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart
            margin={{ top: 20, right: 20, bottom: 20, left: 10 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis 
              type="number" 
              dataKey={featureX} 
              name={featureX} 
              stroke="var(--text-muted)"
              tick={{ fill: 'var(--text-muted)', fontSize: 12 }}
              domain={['auto', 'auto']}
            />
            <YAxis 
              type="number" 
              dataKey={featureY} 
              name={featureY} 
              stroke="var(--text-muted)"
              tick={{ fill: 'var(--text-muted)', fontSize: 12 }}
              domain={['auto', 'auto']}
            />
            <Tooltip cursor={{ strokeDasharray: '3 3' }} content={<CustomTooltip />} />
            <Legend wrapperStyle={{ paddingTop: '20px' }}/>
            <Scatter 
              name="Normal (Sampled)" 
              data={downsampledNormal} 
              fill="#3a86ff" 
              opacity={0.15}
              line={false}
              shape="circle"
              isAnimationActive={false}
            />
            <Scatter 
              name="Anomaly" 
              data={anomalies} 
              fill="var(--anomaly)"
              opacity={0.8} 
              shape="cross"
              isAnimationActive={false}
            />
          </ScatterChart>
        </ResponsiveContainer>
      </div>
    </>
  );
}
