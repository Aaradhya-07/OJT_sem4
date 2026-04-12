import React, { useMemo, useState } from 'react';
import { ComposedChart, Line, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const FEATURES = ["CO(GT)", "C6H6(GT)", "NOx(GT)", "NO2(GT)", "T", "RH", "AH"];
const TIME_PERIODS = [
  { label: '3 Months', value: 90 },
  { label: '6 Months', value: 180 },
  { label: 'All Time', value: Infinity }
];

export default function TimelineChart({ data }) {
  const [selectedFeature, setSelectedFeature] = useState("CO(GT)");
  const [timePeriodDays, setTimePeriodDays] = useState(90);

  const formattedData = useMemo(() => {
    if (!data || data.length === 0) return [];
    
    let maxTime = -Infinity;
    data.forEach(d => {
      const t = new Date(d.datetime).getTime();
      if (t > maxTime) maxTime = t;
    });
    
    const cutoffDate = new Date(maxTime);
    if (timePeriodDays !== Infinity) {
      cutoffDate.setDate(cutoffDate.getDate() - timePeriodDays);
    } else {
      cutoffDate.setFullYear(1900); // effectively all data
    }
    const cutoffTime = cutoffDate.getTime();

    const filtered = data.filter(d => new Date(d.datetime).getTime() >= cutoffTime);

    return filtered.map(d => ({
      ...d,
      datetime_label: new Date(d.datetime).toLocaleDateString(),
      normal_val: d[selectedFeature],
      anomaly_val: d.is_anomaly === 1 ? d[selectedFeature] : null
    }));
  }, [data, selectedFeature, timePeriodDays]);

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
          <div style={{ fontWeight: 600 }}>{selectedFeature}: {pData[selectedFeature]}</div>
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
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
          <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--anomaly)' }} />
          Anomaly Timeline
        </h3>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <select 
            value={selectedFeature} 
            onChange={(e) => setSelectedFeature(e.target.value)}
            style={{ padding: '0.25rem 0.5rem', borderRadius: '4px', background: 'rgba(255,255,255,0.05)', color: 'white', border: '1px solid var(--glass-border)' }}
          >
            {FEATURES.map(f => (
              <option key={f} value={f} style={{ color: 'black' }}>{f}</option>
            ))}
          </select>
          <select 
            value={timePeriodDays} 
            onChange={(e) => setTimePeriodDays(Number(e.target.value))}
            style={{ padding: '0.25rem 0.5rem', borderRadius: '4px', background: 'rgba(255,255,255,0.05)', color: 'white', border: '1px solid var(--glass-border)' }}
          >
            {TIME_PERIODS.map(tp => (
              <option key={tp.label} value={tp.value} style={{ color: 'black' }}>{tp.label}</option>
            ))}
          </select>
        </div>
      </div>
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
              dataKey="normal_val" 
              stroke="#3a86ff" 
              strokeWidth={1} 
              dot={false}
              activeDot={{ r: 4 }}
              isAnimationActive={false}
            />
            <Scatter 
              dataKey="anomaly_val" 
              fill="var(--anomaly)" 
              r={4}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </>
  );
}
