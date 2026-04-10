import React, { useMemo } from 'react';

export default function AnomalyTable({ anomalies }) {
  // Sort by anomaly_score ascending (most anomalous first) and take top 10
  const topAnomalies = useMemo(() => {
    return [...anomalies]
      .sort((a, b) => a.anomaly_score - b.anomaly_score)
      .slice(0, 10);
  }, [anomalies]);

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
        <thead>
          <tr style={{ borderBottom: '1px solid var(--glass-border)', color: 'var(--text-muted)' }}>
            <th style={{ padding: '0.75rem 0.5rem', fontWeight: 500 }}>Date & Time</th>
            <th style={{ padding: '0.75rem 0.5rem', fontWeight: 500 }}>CO(GT)</th>
            <th style={{ padding: '0.75rem 0.5rem', fontWeight: 500 }}>NOx(GT)</th>
            <th style={{ padding: '0.75rem 0.5rem', fontWeight: 500 }}>Score</th>
          </tr>
        </thead>
        <tbody>
          {topAnomalies.map((row, idx) => (
            <tr 
              key={idx} 
              style={{ 
                borderBottom: '1px solid rgba(255,255,255,0.02)',
                backgroundColor: idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)',
                transition: 'var(--transition)'
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 51, 102, 0.05)'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)'}
            >
              <td style={{ padding: '0.75rem 0.5rem', whiteSpace: 'nowrap' }}>
                {new Date(row.datetime).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
              </td>
              <td style={{ padding: '0.75rem 0.5rem', color: '#fff', fontWeight: 500 }}>{row['CO(GT)']}</td>
              <td style={{ padding: '0.75rem 0.5rem', color: '#fff' }}>{row['NOx(GT)']}</td>
              <td style={{ padding: '0.75rem 0.5rem', color: 'var(--anomaly)', fontWeight: 600 }}>
                {row.anomaly_score.toFixed(4)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
