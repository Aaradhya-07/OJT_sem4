import React, { useMemo } from 'react';
import { ComposedChart, Line, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function TimelineChart({ data }) {
  // We need to format the data for a ComposedChart:
  // We plot the 'CO(GT)' for all points as a continuous line,
  // and we plot 'CO(GT)' as dots only where is_anomaly === 1.
  
  const formattedData = useMemo(() => {
    return data.map(d => ({
      ...d,
      datetime_label: new Date(d.datetime).toLocaleDateString(),
      co_normal: d['CO(GT)'],
      co_anomaly: d.is_anomaly === 1 ? d['CO(GT)'] : null
    }));
  }, [data]);

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const pData = payload[0].payload;
      return (
        <div style={{
          background: 'rgba(10, 10, 15, 0.9)',
          border: `1px solid ${pData.is_anomaly === 1 ? 'var(--anomaly)' : 'var(--glass-border)'}`,
          padding: '1rem',
          borderRadius: '8px',
          color: '#fff',
          boxShadow: '0 4px 20px rgba(0,0,0,0.5)'
        }}>
          <div style={{ color: 'var(--text-muted)', marginBottom: '0.25rem', fontSize: '0.85rem' }}>
            {new Date(pData.datetime).toLocaleString()}
          </div>
          <div style={{ fontWeight: 600 }}>CO(GT): {pData['CO(GT)']}</div>
          {pData.is_anomaly === 1 && (
            <div style={{ marginTop: '0.25rem', color: 'var(--anomaly)', fontSize: '0.85rem' }}>
              Anomaly Score: {pData.anomaly_score.toFixed(3)}
            </div>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div style={{ height: '350px', width: '100%' }}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart
          data={formattedData}
          margin={{ top: 20, right: 20, bottom: 20, left: 10 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
          <XAxis 
            dataKey="datetime_label" 
            stroke="var(--text-muted)"
            tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
            minTickGap={50}
          />
          <YAxis 
            stroke="var(--text-muted)"
            tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
            domain={['auto', 'auto']}
          />
          <Tooltip content={<CustomTooltip />} />
          <Line 
            type="monotone" 
            dataKey="co_normal" 
            stroke="#3a86ff" 
            strokeWidth={1} 
            dot={false}
            activeDot={{ r: 4 }}
            isAnimationActive={false} // Performance optimization for large datasets
          />
          <Scatter 
            dataKey="co_anomaly" 
            fill="var(--anomaly)" 
            r={4}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
