import React, { useState, useMemo, useEffect } from 'react';
import { Sparkles, RefreshCcw, Clock } from 'lucide-react';

const FEATURES = ["CO(GT)", "C6H6(GT)", "NOx(GT)", "NO2(GT)", "T", "RH", "AH"];

export default function AIInsightsPanel({ data }) {
  const [insight, setInsight] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setInterval(() => setCountdown(c => c - 1), 1000);
      return () => clearInterval(timer);
    }
  }, [countdown]);

  // Compute metrics from data to send to Gemini
  const contextPayload = useMemo(() => {
    if (!data || !data.results) return null;

    const { total_records, anomalies_found, anomaly_pct, results } = data;
    const date_range = data.date_range ? `${data.date_range[0]} to ${data.date_range[1]}` : 'Unknown';

    // Separate normal vs anomalies
    const normals = results.filter(r => r.is_anomaly === 0);
    const anomalies = results.filter(r => r.is_anomaly === 1);

    // Compute feature comparisons
    const feature_comparison = FEATURES.map(f => {
      const normMean = normals.length ? normals.reduce((acc, curr) => acc + (curr[f] || 0), 0) / normals.length : 0;
      const anomMean = anomalies.length ? anomalies.reduce((acc, curr) => acc + (curr[f] || 0), 0) / anomalies.length : 0;
      return {
        sensor: f,
        normal_mean: normMean,
        anomaly_mean: anomMean,
        ratio: normMean === 0 ? 0 : anomMean / normMean
      };
    });

    // Find most anomalous sensor (highest absolute divergence from 1.0 ratio)
    let most_anomalous_sensor = "Unknown";
    let maxDiv = -1;
    feature_comparison.forEach(fc => {
        const div = Math.abs(fc.ratio - 1);
        if (div > maxDiv) {
            maxDiv = div;
            most_anomalous_sensor = fc.sensor;
        }
    });

    // Top 3 critical events (sort by anomaly_score ascending)
    const sortedAnomalies = [...anomalies].sort((a, b) => a.anomaly_score - b.anomaly_score);
    const top_critical_events = sortedAnomalies.slice(0, 10).map(a => ({
        datetime: a.datetime,
        co: a['CO(GT)'] || 0,
        nox: a['NOx(GT)'] || 0,
        score: a.anomaly_score
    }));

    return {
      total_records,
      anomaly_count: anomalies_found,
      anomaly_pct,
      date_range,
      selected_time_window: "Full Dataset Context",
      top_critical_events,
      feature_comparison,
      most_anomalous_sensor
    };
  }, [data]);

  const generateInsights = async () => {
    if (!contextPayload) return;
    
    setLoading(true);
    setError('');
    setInsight('');

    try {
      const response = await fetch('http://127.0.0.1:8000/insight', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(contextPayload)
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        if (response.status === 429) {
          const delay = errData.detail?.retry_delay || 60;
          setCountdown(delay);
          throw new Error('RATELIMIT');
        }
        throw new Error(errData.detail || 'Failed to fetch insights');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder("utf-8");
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value, { stream: true });
        setInsight(prev => prev + chunk);
      }
    } catch (err) {
      if (err.message !== 'RATELIMIT') {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  // Basic markdown parser for bolding
  const renderFormattedText = (text) => {
    const parts = text.split(/\*\*(.*?)\*\*/g);
    return parts.map((part, i) => {
      if (i % 2 === 1) {
        return <strong key={i} style={{ color: 'var(--accent)' }}>{part}</strong>;
      }
      return <span key={i}>{part}</span>;
    });
  };

  return (
    <div className="glass-panel animate-fade-in" style={{ padding: '2rem', marginTop: '1.5rem', marginBottom: '1.5rem', position: 'relative', overflow: 'hidden' }}>
      {/* Decorative gradient orb */}
      <div style={{ position: 'absolute', top: '-50px', right: '-50px', width: '200px', height: '200px', background: 'radial-gradient(circle, var(--accent-glow) 0%, transparent 70%)', filter: 'blur(40px)', zIndex: 0, pointerEvents: 'none' }} />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', position: 'relative', zIndex: 1 }}>
        <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', margin: 0 }}>
          <Sparkles color="var(--accent)" size={28} />
          Gemini AI Insights
        </h2>
        {insight && (
          <button 
            onClick={generateInsights} 
            disabled={loading || countdown > 0}
            style={{ 
              background: 'rgba(255,255,255,0.05)', 
              border: '1px solid var(--glass-border)', 
              color: 'var(--text-main)', 
              padding: '0.5rem 1rem', 
              borderRadius: '8px', 
              cursor: (loading || countdown > 0) ? 'not-allowed' : 'pointer', 
              display: 'flex', 
              alignItems: 'center', 
              gap: '0.5rem', 
              transition: 'var(--transition)',
              opacity: (loading || countdown > 0) ? 0.7 : 1
            }}
            onMouseOver={(e) => { if(!loading && countdown <= 0) e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; }}
            onMouseOut={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
          >
            {countdown > 0 ? (
              <><Clock size={16} /> Retry in {countdown}s</>
            ) : (
              <><RefreshCcw size={16} className={loading ? "spinning" : ""} /> Regenerate</>
            )}
          </button>
        )}
      </div>

      <div style={{ position: 'relative', zIndex: 1 }}>
        {!insight && !loading && !error && (
          <div style={{ textAlign: 'center', padding: '3rem 0', background: 'rgba(0,0,0,0.2)', borderRadius: '12px', border: '1px dashed var(--glass-border)' }}>
            <p style={{ marginBottom: '1.5rem', fontSize: '1.1rem' }}>Get a plain-English, AI-powered analysis of the detected anomalies.</p>
            <button 
              onClick={generateInsights} 
              disabled={!data || countdown > 0}
              className="btn-primary"
              style={{ opacity: (!data || countdown > 0) ? 0.5 : 1, padding: '1rem 2rem', fontSize: '1.1rem', cursor: countdown > 0 ? 'not-allowed' : 'pointer' }}
            >
              {!data 
                  ? 'Run analysis first to enable AI insights' 
                  : countdown > 0 
                      ? `Rate limited. Retry in ${countdown}s...` 
                      : 'Generate Insights'}
            </button>
          </div>
        )}

        {loading && !insight && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '3rem', gap: '1rem', background: 'rgba(0,0,0,0.2)', borderRadius: '12px' }}>
            <div style={{ width: '24px', height: '24px', border: '3px solid rgba(0, 240, 255, 0.2)', borderTopColor: 'var(--accent)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
            <span style={{ fontSize: '1.1rem', color: 'var(--accent)' }}>Analyzing isolation forest patterns...</span>
          </div>
        )}

        {error && (
          <div style={{ padding: '1rem', background: 'rgba(255, 51, 102, 0.1)', border: '1px solid var(--anomaly)', borderRadius: '8px', color: '#ff8099' }}>
            <strong>Error:</strong> {error}
          </div>
        )}

        {(insight || (loading && insight)) && (
          <div style={{ background: 'rgba(0,0,0,0.3)', padding: '2rem', borderRadius: '12px', border: '1px solid var(--glass-border)' }}>
            <div style={{ whiteSpace: 'pre-wrap', lineHeight: '1.8', fontSize: '1.05rem' }}>
              {renderFormattedText(insight)}
            </div>
            <div style={{ marginTop: '2.5rem', paddingTop: '1.5rem', borderTop: '1px solid var(--glass-border)', fontSize: '0.85rem', color: 'var(--text-muted)', textAlign: 'center' }}>
              AI-generated analysis using Gemini 2.0. Verify against domain expertise.
            </div>
          </div>
        )}
      </div>
      
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        .spinning {
          animation: spin 1.5s linear infinite;
        }
      `}</style>
    </div>
  );
}
