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

  const renderTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div style={{
          background: 'var(--tooltip-bg)',
          border: `1px solid ${data.is_anomaly === 1 ? 'var(--anomaly-critical)' : 'var(--card-border)'}`,
          padding: '1rem',
          borderRadius: '8px',
          color: 'var(--text-primary)',
          boxShadow: '0 4px 20px rgba(0,0,0,0.5)'
        }}>
          <div style={{ fontWeight: 600, marginBottom: '0.5rem', color: data.is_anomaly === 1 ? 'var(--anomaly-critical)' : 'var(--accent)' }}>
            {data.is_anomaly === 1 ? '⚠️ Anomaly Detected' : '✅ Normal Reading'}
          </div>
          <div style={{ fontSize: '0.85rem' }}>
            <div style={{ marginBottom: '0.25rem' }}><strong>Date:</strong> {new Date(data.datetime).toLocaleString()}</div>
            <div style={{ marginBottom: '0.25rem' }}><strong>{featureX}:</strong> {data[featureX]}</div>
            <div><strong>{featureY}:</strong> {data[featureY]}</div>
            {data.is_anomaly === 1 && (
              <div style={{ marginTop: '0.25rem', color: 'var(--anomaly-critical)' }}>
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
        <h3 style={{ margin: 0, color: 'var(--text-primary)' }}>Feature Density Scatter</h3>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>X:</span>
          <select 
            value={featureX} 
            onChange={(e) => setFeatureX(e.target.value)}
            style={{ padding: '0.25rem 0.5rem', borderRadius: '4px', background: 'var(--page-bg)', color: 'var(--text-primary)', border: '1px solid var(--card-border)', outline: 'none' }}
          >
            {FEATURES.map(f => (
              <option key={`x-${f}`} value={f} style={{ color: 'black' }}>{f}</option>
            ))}
          </select>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginLeft: '0.5rem' }}>Y:</span>
          <select 
            value={featureY} 
            onChange={(e) => setFeatureY(e.target.value)}
            style={{ padding: '0.25rem 0.5rem', borderRadius: '4px', background: 'var(--page-bg)', color: 'var(--text-primary)', border: '1px solid var(--card-border)', outline: 'none' }}
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
            <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />
            <XAxis 
              type="number" 
              dataKey={featureX} 
              name={featureX} 
              stroke="var(--text-secondary)"
              tick={{ fill: 'var(--text-secondary)', fontSize: 12 }}
              domain={['auto', 'auto']}
            />
            <YAxis 
              type="number" 
              dataKey={featureY} 
              name={featureY} 
              stroke="var(--text-secondary)"
              tick={{ fill: 'var(--text-secondary)', fontSize: 12 }}
              domain={['auto', 'auto']}
            />
            <Tooltip cursor={{ strokeDasharray: '3 3' }} content={renderTooltip} />
            <Legend wrapperStyle={{ paddingTop: '20px' }}/>
            <Scatter 
              name="Normal (Sampled)" 
              data={downsampledNormal} 
              fill="var(--accent)" 
              opacity={0.15}
              line={false}
              shape="circle"
              isAnimationActive={false}
            />
            <Scatter 
              name="Anomaly" 
              data={anomalies} 
              fill="var(--anomaly-critical)"
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
