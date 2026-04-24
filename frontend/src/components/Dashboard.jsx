import React, { useState } from 'react';
import { ShieldCheck, Crosshair, BarChart2 } from 'lucide-react';
import AnomalyScatter from './charts/AnomalyScatter';
import TimelineChart from './charts/TimelineChart';
import FeatureComparison from './charts/FeatureComparison';
import AnomalyTable from './AnomalyTable';
import AIInsightsPanel from './AIInsightsPanel';
import SensorHealth from './SensorHealth';
import Heatmap from './Heatmap';
import ContaminationSlider from './ContaminationSlider';
import InfoTooltip from './InfoTooltip';

export default function Dashboard({ data: rawData, onReset }) {
  const [data, setData] = useState(rawData);

  if (!data) return null;

  const run_id = data.run_id;
  const results = data.results || [];
  const score_distribution = data.score_distribution || [];
  const contamination = data.contamination || '0.05';
  
  const total_records = data.total_records ?? results.length;
  const anomalies_found = data.anomalies_found ?? results.filter(r => r.is_anomaly === 1).length;
  const anomaly_pct = data.anomaly_pct ?? (total_records > 0 ? ((anomalies_found / total_records) * 100).toFixed(2) : 0);

  const normalPoints = results.filter(r => r.is_anomaly === 0);
  const anomalousPoints = results.filter(r => r.is_anomaly === 1);

  return (
    <div className="animate-fade-in pb-16 space-y-8 max-w-6xl mx-auto w-full px-4">
      {/* 1. Header */}
      <div className="flex justify-between items-center bg-card border border-card-border p-4 rounded-xl mt-6">
        <h2 className="text-xl font-bold text-text-primary m-0">
          Analysis Results
        </h2>
        <button 
          className="bg-page-bg border border-card-border text-text-secondary hover:text-text-primary px-4 py-2 rounded-lg font-medium transition-colors cursor-pointer"
          onClick={onReset}
        >
          Analyze Another File
        </button>
      </div>

      {/* 2. Summary stat cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-card border border-card-border p-5 rounded-xl flex items-center gap-4">
          <div className="bg-page-bg border border-card-border p-3 rounded-lg"><Database size={24} className="text-text-secondary" /></div>
          <div>
            <div className="text-text-secondary text-sm mb-1">Total Readings</div>
            <div className="text-2xl font-bold text-text-primary">{(total_records || 0).toLocaleString()}</div>
          </div>
        </div>
        <div className="bg-card border border-card-border p-5 rounded-xl flex items-center gap-4">
          <div className="bg-critical/10 border border-critical/20 p-3 rounded-lg"><Crosshair size={24} className="text-critical" /></div>
          <div>
            <div className="text-text-secondary text-sm mb-1">Anomalies Detected</div>
            <div className="text-2xl font-bold text-critical">{(anomalies_found || 0).toLocaleString()}</div>
          </div>
        </div>
        <div className="bg-card border border-card-border p-5 rounded-xl flex items-center gap-4">
          <div className="bg-accent/10 border border-accent/20 p-3 rounded-lg"><BarChart2 size={24} className="text-accent" /></div>
          <div>
            <div className="text-text-secondary text-sm mb-1">Overall Anomaly Rate</div>
            <div className="text-2xl font-bold text-accent">{anomaly_pct}%</div>
          </div>
        </div>
      </div>

      {/* 3. Sensor Health Scorecard (full width via the inner grid) */}
      <div className="w-full">
        <h3 className="font-semibold text-lg text-text-primary mb-2 flex items-center">
          Sensor Health Profiles
          <InfoTooltip text="Shows the relative percentage of anomalies primarily driven by each sensor natively, along with the most extreme deviation detected." />
        </h3>
        <SensorHealth runId={run_id} />
      </div>

      {/* 4. Anomaly Timeline (full width) */}
      <div className="bg-card border border-card-border p-6 rounded-xl flex flex-col w-full">
        <TimelineChart data={results} runId={run_id} />
      </div>

      {/* 5. Isolation Score Distribution + Threshold Slider (full width) */}
      <div className="bg-card border border-card-border p-6 rounded-xl flex flex-col w-full">
        <ContaminationSlider 
          runId={run_id} 
          initialContamination={contamination || 'auto'} 
          distribution={score_distribution} 
          onRecalculate={setData} 
        />
      </div>

      {/* 6. Temporal Heatmap (full width) */}
      <div className="bg-card border border-card-border p-6 rounded-xl flex flex-col w-full">
        <h3 className="font-semibold text-lg text-text-primary mb-2 flex items-center">
          Temporal Heatmap
          <InfoTooltip text="Grid displaying the frequency of anomalies by hour of the day (Y-axis) and calendar date (X-axis). Darker colors indicate higher anomaly concentrations." />
        </h3>
        <Heatmap runId={run_id} />
      </div>

      {/* 7. Feature Breakdown bar chart (full width) */}
      <div className="bg-card border border-card-border p-6 rounded-xl w-full">
        <h3 className="font-semibold text-lg mb-4 text-text-primary flex items-center">
          Feature Breakdown (Normal vs Anomaly)
          <InfoTooltip text="Compares the average value of each sensor feature during normal periods versus anomalous periods, helping identify overarching patterns." />
        </h3>
        <FeatureComparison normal={normalPoints} anomalies={anomalousPoints} />
      </div>

      {/* 8. Critical System Events table (full width) */}
      <div className="bg-card border border-card-border p-6 rounded-xl w-full">
        <h3 className="font-semibold text-lg mb-4 text-text-primary flex items-center">
          Critical System Events (Top 10)
          <InfoTooltip text="List of the most severe anomalies detected based on Isolation Score, with a breakdown of which sensors contributed most to the anomaly via z-score bar charts." />
        </h3>
        <AnomalyTable anomalies={anomalousPoints} />
      </div>

      {/* 9. AI Insights (assuming full width natively) */}
      <div className="w-full">
        <AIInsightsPanel data={{ ...data, total_records, anomalies_found, anomaly_pct }} />
      </div>
    </div>
  );
}

// Inline DB icon
function Database(props) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={props.size} height={props.size} viewBox="0 0 24 24" fill="none" stroke="currentColor" className={props.className} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <ellipse cx="12" cy="5" rx="9" ry="3"></ellipse>
      <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"></path>
      <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"></path>
    </svg>
  );
}
