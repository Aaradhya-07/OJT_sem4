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

  const renderTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div style={{
          background: 'var(--tooltip-bg)',
          border: '1px solid var(--card-border)',
          padding: '1rem',
          borderRadius: '8px',
          color: 'var(--text-primary)',
        }}>
          <div style={{ marginBottom: '0.5rem', fontWeight: 600, borderBottom: '1px solid var(--card-border)', paddingBottom: '0.25rem' }}>
            Feature: {label}
          </div>
          <div style={{ color: 'var(--accent)', marginBottom: '0.25rem' }}>Normal Mean: {payload[0].value.toFixed(2)}</div>
          <div style={{ color: 'var(--anomaly-critical)' }}>Anomaly Mean: {payload[1].value.toFixed(2)}</div>
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
          <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" vertical={false} />
          <XAxis 
            dataKey="name" 
            stroke="var(--text-secondary)"
            tick={{ fill: 'var(--text-secondary)', fontSize: 12 }}
          />
          <YAxis 
            stroke="var(--text-secondary)"
            tick={{ fill: 'var(--text-secondary)', fontSize: 12 }}
          />
          <Tooltip cursor={{ fill: 'var(--card-border)' }} content={renderTooltip} />
          <Legend wrapperStyle={{ paddingTop: '10px' }} />
          <Bar dataKey="Normal" fill="var(--accent)" radius={[4, 4, 0, 0]} />
          <Bar dataKey="Anomaly" fill="var(--anomaly-critical)" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
