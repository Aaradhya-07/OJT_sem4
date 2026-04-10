import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const features = ['CO(GT)', 'C6H6(GT)', 'NOx(GT)', 'NO2(GT)', 'T', 'RH', 'AH'];

export default function FeatureComparison({ normal, anomalies }) {
  
  const chartData = useMemo(() => {
    // Helper to calculate mean
    const calcMean = (dataArr, col) => {
      if (!dataArr.length) return 0;
      const sum = dataArr.reduce((acc, curr) => acc + (curr[col] || 0), 0);
      return sum / dataArr.length;
    };

    return features.map(f => ({
      name: f.replace('(GT)', ''), // simplify label
      Normal: calcMean(normal, f),
      Anomaly: calcMean(anomalies, f)
    }));
  }, [normal, anomalies]);

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div style={{
          background: 'rgba(10, 10, 15, 0.95)',
          border: '1px solid var(--glass-border)',
          padding: '1rem',
          borderRadius: '8px',
          color: '#fff',
        }}>
          <div style={{ marginBottom: '0.5rem', fontWeight: 600, borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.25rem' }}>
            Feature: {label}
          </div>
          <div style={{ color: '#3a86ff', marginBottom: '0.25rem' }}>Normal Mean: {payload[0].value.toFixed(2)}</div>
          <div style={{ color: 'var(--anomaly)' }}>Anomaly Mean: {payload[1].value.toFixed(2)}</div>
        </div>
      );
    }
    return null;
  };

  return (
    <div style={{ height: '350px', width: '100%' }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={chartData}
          margin={{ top: 20, right: 30, left: 0, bottom: 20 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
          <XAxis 
            dataKey="name" 
            stroke="var(--text-muted)"
            tick={{ fill: 'var(--text-muted)', fontSize: 12 }}
          />
          <YAxis 
            stroke="var(--text-muted)"
            tick={{ fill: 'var(--text-muted)', fontSize: 12 }}
          />
          <Tooltip cursor={{ fill: 'rgba(255,255,255,0.02)' }} content={<CustomTooltip />} />
          <Legend wrapperStyle={{ paddingTop: '10px' }} />
          <Bar dataKey="Normal" fill="#3a86ff" radius={[4, 4, 0, 0]} />
          <Bar dataKey="Anomaly" fill="var(--anomaly)" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
