import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export default function Heatmap({ runId }) {
  const [data, setData] = useState([]);
  const [hoverData, setHoverData] = useState(null);
  const [page, setPage] = useState(0);

  useEffect(() => {
    if (!runId) return;
    axios.get(`http://localhost:8000/heatmap-data?run_id=${runId}`)
      .then(res => setData(res.data))
      .catch(console.error);
  }, [runId]);

  const dates = useMemo(() => {
    return [...new Set(data.map(d => d.date))].sort();
  }, [data]);

  const maxCount = useMemo(() => {
    return Math.max(...data.map(d => d.anomaly_count), 5); // at least 5 for scale
  }, [data]);

  const cellMap = useMemo(() => {
    const map = {};
    data.forEach(d => {
      map[`${d.date}-${d.hour}`] = d;
    });
    return map;
  }, [data]);

  if (!data.length) return <div className="text-text-secondary">Loading heatmap...</div>;

  // Pagination (30 days per page max)
  const itemsPerPage = 30;
  const totalPages = Math.ceil(dates.length / itemsPerPage);
  const currentDates = dates.slice(page * itemsPerPage, (page + 1) * itemsPerPage);

  const hours = Array.from({ length: 24 }, (_, i) => i);

  // GitHub Dark Theme interpolations
  // CardBg: #161B22 (22, 27, 34)
  // Moderate: #D29922 (210, 153, 34)
  // Critical: #FF7B72 (255, 123, 114)
  const getCellColor = (count) => {
    if (count === 0) return 'var(--card-bg)';
    
    const ratio = Math.min(count / maxCount, 1);
    
    // Interpolate from Moderate (if lower bound) towards Critical (if upper)
    // Actually, simple scale: if ratio < 0.5, interpolate CardBg to Moderate.
    // If ratio >= 0.5, interpolate Moderate to Critical
    if (ratio < 0.5) {
      const rRatio = ratio * 2; // 0 to 1
      const r = Math.round(22 + (210 - 22) * rRatio);
      const g = Math.round(27 + (153 - 27) * rRatio);
      const b = Math.round(34 + (34 - 34) * rRatio);
      return `rgb(${r}, ${g}, ${b})`;
    } else {
      const rRatio = (ratio - 0.5) * 2; // 0 to 1
      const r = Math.round(210 + (255 - 210) * rRatio);
      const g = Math.round(153 + (123 - 153) * rRatio);
      const b = Math.round(34 + (114 - 34) * rRatio);
      return `rgb(${r}, ${g}, ${b})`;
    }
  };

  return (
    <div className="relative overflow-x-auto select-none mt-2 flex flex-col items-center">
      
      {/* Pagination Controls */}
      <div className="flex justify-between items-center w-full mb-4 px-8">
        <button 
          onClick={() => setPage(p => Math.max(0, p - 1))}
          disabled={page === 0}
          className="p-1 rounded hover:bg-page-bg disabled:opacity-50 text-text-secondary hover:text-text-primary transition-colors"
        >
          <ChevronLeft size={20} />
        </button>
        <span className="text-sm text-text-secondary font-medium">
          Period {page + 1} of {totalPages}
        </span>
        <button 
          onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
          disabled={page === totalPages - 1}
          className="p-1 rounded hover:bg-page-bg disabled:opacity-50 text-text-secondary hover:text-text-primary transition-colors"
        >
          <ChevronRight size={20} />
        </button>
      </div>

      <div className="flex w-full overflow-x-auto pb-4">
        {/* Y-axis labels */}
        <div className="flex flex-col mr-2 text-xs text-text-secondary justify-between sticky left-0 bg-card py-[2px] z-10" style={{ height: '484px' }}>
          {hours.map(h => (
            <div key={h} className="text-right w-12 pr-2" style={{ height: '18px', lineHeight: '18px', display: h % 2 === 0 ? 'block' : 'none' }}>
              {h}:00
            </div>
          ))}
        </div>

        {/* Heatmap Grid */}
        <div className="flex gap-[4px]">
          {currentDates.map(date => (
            <div key={date} className="flex flex-col gap-[2px]">
              {hours.map(hour => {
                const cell = cellMap[`${date}-${hour}`];
                const count = cell ? cell.anomaly_count : 0;
                
                return (
                  <div
                    key={hour}
                    className="rounded-sm cursor-pointer border border-[var(--tooltip-bg)] box-border hover:border-white transition-all"
                    style={{ 
                      width: '28px', 
                      height: '18px',
                      backgroundColor: getCellColor(count)
                    }}
                    onMouseEnter={() => cell && count > 0 && setHoverData(cell)}
                    onMouseLeave={() => setHoverData(null)}
                  />
                );
              })}
              {/* X-axis label (only every 5th or 1st of month to avoid clutter, or just show text rotated) */}
              <div 
                className="text-[10px] text-text-secondary text-center mt-2 -rotate-45 origin-top-left" 
                style={{ width: '28px', height: '0', whiteSpace: 'nowrap' }}
              >
                {new Date(date).getDate() === 1 || currentDates.indexOf(date) === 0 ? new Date(date).toLocaleDateString([], { month: 'short', day: 'numeric' }) : ''}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-2 mt-12 text-xs text-text-secondary w-full justify-center">
        <span>Less Anomalies (0)</span>
        <div className="flex gap-[2px]">
          {[0, 0.25, 0.5, 0.75, 1].map(ratio => (
            <div 
              key={ratio} 
              style={{ 
                width: '18px', 
                height: '18px', 
                backgroundColor: getCellColor(Math.round(ratio * maxCount)),
                border: '1px solid var(--tooltip-bg)'
              }}
              className="rounded-sm"
            />
          ))}
        </div>
        <span>More ({maxCount}+)</span>
      </div>

      {/* Tooltip Overlay */}
      {hoverData && (
        <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-tooltip border border-card-border p-4 rounded-lg shadow-2xl pointer-events-none z-50 text-sm w-48 text-center">
          <div className="font-semibold text-text-primary mb-1">{hoverData.date} {hoverData.hour}:00</div>
          <div className="text-critical font-bold text-lg mb-1">{hoverData.anomaly_count}</div>
          <div className="text-xs text-text-secondary">Anomalies Detected</div>
          <div className="text-text-secondary text-xs mt-2 pt-2 border-t border-card-border">Worst Score: {hoverData.worst_score.toFixed(3)}</div>
        </div>
      )}
    </div>
  );
}
