import React, { useMemo, useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { BarChart, Bar, Cell, YAxis, ResponsiveContainer, XAxis, Tooltip } from 'recharts';

const FEATURES = ["CO(GT)", "C6H6(GT)", "NOx(GT)", "NO2(GT)", "T", "RH", "AH"];

const ZScoreBars = ({ row }) => {
  const data = FEATURES.map(f => {
    const val = Math.abs(row[`${f}_zscore`]);
    let color = "var(--text-secondary)";
    if (val > 2) color = "var(--anomaly-critical)";
    else if (val > 1) color = "var(--anomaly-moderate)";
    return { name: f, value: val, fill: color, real_val: row[`${f}_zscore`] };
  });

  const renderBarTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-tooltip border border-card-border p-2 rounded text-text-primary text-xs z-50 min-w-[100px]">
          <div className="font-semibold text-accent mb-1">{data.name}</div>
          <div style={{ color: data.fill }}>Z-Score: {data.real_val.toFixed(2)}</div>
        </div>
      );
    }
    return null;
  };

  return (
    <div style={{ width: 120, height: 40 }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
          <XAxis type="number" hide domain={[0, 'dataMax']} />
          <YAxis type="category" dataKey="name" hide />
          <Tooltip 
            cursor={{ fill: 'var(--card-border)' }}
            content={renderBarTooltip}
          />
          <Bar dataKey="value" radius={[0, 4, 4, 0]}>
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.fill} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default function AnomalyTable({ anomalies }) {
  const [filters, setFilters] = useState({
    Minor: true,
    Moderate: true,
    Critical: true,
  });

  const toggleFilter = (tier) => {
    setFilters(prev => ({ ...prev, [tier]: !prev[tier] }));
  };

  const filteredAnomalies = useMemo(() => {
    let list = anomalies.filter(a => filters[a.severity_tier] || (!filters.Minor && !filters.Moderate && !filters.Critical && a.severity_tier === undefined));
    list.sort((a, b) => a.anomaly_score - b.anomaly_score);
    return list.slice(0, 10); // Show top 10 as requested
  }, [anomalies, filters]);

  const getBadgeColor = (tier) => {
    switch (tier) {
      case "Critical": return "bg-critical text-[#0d1117] hover:bg-critical/90";
      case "Moderate": return "bg-moderate text-[#0d1117] hover:bg-moderate/90";
      case "Minor": return "bg-minor text-[#0d1117] hover:bg-minor/90";
      default: return "bg-text-secondary text-[#0d1117]";
    }
  };

  return (
    <div className="space-y-4">
      {/* Filter Bar */}
      <div className="flex gap-2">
        {["Minor", "Moderate", "Critical"].map(tier => (
          <button
            key={tier}
            onClick={() => toggleFilter(tier)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors border ${
              filters[tier] 
                ? 'bg-accent/20 border-accent/40 text-accent' 
                : 'bg-transparent border-card-border text-text-secondary hover:border-text-secondary/50'
            }`}
          >
            {tier}
          </button>
        ))}
      </div>

      <div className="border border-card-border rounded-md overflow-hidden bg-page-bg">
        <Table>
          <TableHeader>
            <TableRow className="border-card-border hover:bg-transparent">
              <TableHead className="text-text-secondary font-semibold">Date & Time</TableHead>
              <TableHead className="text-text-secondary font-semibold">CO(GT)</TableHead>
              <TableHead className="text-text-secondary font-semibold">NOx(GT)</TableHead>
              <TableHead className="text-text-secondary font-semibold">Severity</TableHead>
              <TableHead className="text-text-secondary font-semibold w-[140px]">Contributions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredAnomalies.length > 0 ? (
              filteredAnomalies.map((row, idx) => (
                <TableRow key={idx} className="border-card-border hover:bg-card-border/50 transition-colors">
                  <TableCell className="whitespace-nowrap text-text-primary">
                    {new Date(row.datetime).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                  </TableCell>
                  <TableCell className="text-text-primary font-medium">{row['CO(GT)']}</TableCell>
                  <TableCell className="text-text-primary">{row['NOx(GT)']}</TableCell>
                  <TableCell>
                    <Badge className={getBadgeColor(row.severity_tier)}>
                      {row.severity_tier || "Unknown"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <ZScoreBars row={row} />
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-6 text-text-secondary">
                  No events match the selected filters.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
