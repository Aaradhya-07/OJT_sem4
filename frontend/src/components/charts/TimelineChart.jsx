import React, { useMemo, useState } from 'react';
import { ComposedChart, Line, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import AnomalyDrillDown from '../AnomalyDrillDown';
import InfoTooltip from '../InfoTooltip';

const FEATURES = ["CO(GT)", "C6H6(GT)", "NOx(GT)", "NO2(GT)", "T", "RH", "AH"];
const TIME_PERIODS = [
  { label: '3 Months', value: 90 },
  { label: '6 Months', value: 180 },
  { label: 'All Time', value: Infinity }
];

const CustomAnomalyShape = (props) => {
  const { cx, cy, payload } = props;
  const tier = payload.severity_tier;
  
  if (cx == null || cy == null) return null;
  
  if (tier === "Critical") {
    return (
      <circle 
        cx={cx} 
        cy={cy} 
        r={6} 
        fill="var(--anomaly-critical)" 
        style={{ filter: 'drop-shadow(0px 0px 4px var(--anomaly-critical))', cursor: 'pointer' }} 
      />
    );
  } else if (tier === "Moderate") {
    return <circle cx={cx} cy={cy} r={4} fill="var(--anomaly-moderate)" style={{ cursor: 'pointer' }} />;
  } else {
    // Minor - diamond
    const size = 8;
    return (
      <polygon 
        points={`${cx},${cy - size/2} ${cx + size/2},${cy} ${cx},${cy + size/2} ${cx - size/2},${cy}`} 
        fill="var(--anomaly-minor)" 
        style={{ cursor: 'pointer' }}
      />
    );
  }
};

export default function TimelineChart({ data, runId }) {
  const [selectedFeature, setSelectedFeature] = useState("CO(GT)");
  const [timePeriodDays, setTimePeriodDays] = useState(90);
  const [selectedTimestamp, setSelectedTimestamp] = useState(null);

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

  const renderTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const pData = payload[0].payload;
      return (
        <div className="bg-tooltip border border-card-border p-3 rounded-lg text-text-primary shadow-xl text-sm z-50">
          <div className="text-text-secondary mb-1 text-xs">
            {new Date(pData.datetime).toLocaleString()}
          </div>
          <div className="font-semibold text-accent">{selectedFeature}: {pData[selectedFeature]}</div>
          {pData.is_anomaly === 1 && (
            <div className="mt-2 pt-2 border-t border-card-border text-xs">
              <div className="text-critical">Score: {pData.anomaly_score.toFixed(3)}</div>
              <div className="text-text-secondary mt-1">Tier: <span className="font-medium text-text-primary">{pData.severity_tier}</span></div>
            </div>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <>
      <div className="flex justify-between items-center mb-4">
        <h3 className="flex items-center gap-2 m-0 text-lg font-semibold text-text-primary">
          Anomaly Timeline
          <InfoTooltip text="Line chart displaying normal data versus isolated anomalies over time dynamically toggled per-dataset. Outliers trigger Drill-Down inspection overlays." />
        </h3>
        <div className="flex gap-4">
          <select 
            value={selectedFeature} 
            onChange={(e) => setSelectedFeature(e.target.value)}
            className="px-2 py-1.5 rounded-md bg-page-bg border border-card-border text-text-primary text-sm focus:outline-none focus:border-accent"
          >
            {FEATURES.map(f => (
              <option key={f} value={f}>{f}</option>
            ))}
          </select>
          <select 
            value={timePeriodDays} 
            onChange={(e) => setTimePeriodDays(Number(e.target.value))}
            className="px-2 py-1.5 rounded-md bg-page-bg border border-card-border text-text-primary text-sm focus:outline-none focus:border-accent"
          >
            {TIME_PERIODS.map(tp => (
              <option key={tp.label} value={tp.value}>{tp.label}</option>
            ))}
          </select>
        </div>
      </div>
      
      <div className="h-[350px] w-full mt-2">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={formattedData}
            margin={{ top: 10, right: 10, bottom: 0, left: -10 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" vertical={false} />
            <XAxis 
              dataKey="datetime_label" 
              stroke="var(--text-secondary)"
              tick={{ fill: 'var(--text-secondary)', fontSize: 11 }}
              minTickGap={50}
            />
            <YAxis 
              stroke="var(--text-secondary)"
              tick={{ fill: 'var(--text-secondary)', fontSize: 11 }}
              domain={['auto', 'auto']}
            />
            <Tooltip content={renderTooltip} />
            <Line 
              type="monotone" 
              dataKey="normal_val" 
              stroke="var(--accent)" 
              strokeWidth={1.5} 
              dot={false}
              activeDot={{ r: 4, fill: "var(--accent)", stroke: "none" }}
              isAnimationActive={false}
            />
            <Scatter 
              dataKey="anomaly_val" 
              shape={<CustomAnomalyShape />} 
              isAnimationActive={false}
              onClick={(d) => d && d.datetime && setSelectedTimestamp(d.datetime)}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {selectedTimestamp && (
        <AnomalyDrillDown 
          runId={runId} 
          timestamp={selectedTimestamp} 
          onClose={() => setSelectedTimestamp(null)} 
        />
      )}
    </>
  );
}
