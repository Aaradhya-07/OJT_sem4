import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { Skeleton } from '@/components/ui/skeleton';

export default function AnomalyDrillDown({ runId, timestamp, onClose }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!runId || !timestamp) return;
    setLoading(true);
    axios.get(`http://localhost:8000/anomaly-context?run_id=${runId}&timestamp=${timestamp}&window_hours=3`)
      .then(res => setData(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [runId, timestamp]);

  // Using a deterministic sequence of distinct aesthetic hex colors
  const COLORS = ["#58A6FF", "#3FB950", "#D29922", "#FF7B72", "#a371f7", "#ec6547", "#89929b"];
  const FEATURES = ["CO(GT)", "C6H6(GT)", "NOx(GT)", "NO2(GT)", "T", "RH", "AH"];

  return (
    <Dialog open={!!timestamp} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl bg-page-bg border-card-border text-text-primary p-6">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">
            Critical Event Analysis: <span className="text-accent font-mono font-medium">{timestamp}</span>
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="w-full space-y-4">
            <Skeleton className="h-[250px] w-full rounded-xl bg-card-border/50" />
            <Skeleton className="h-[150px] w-full rounded-xl bg-card-border/50" />
          </div>
        ) : data ? (
          <div className="flex flex-col gap-6 mt-4">
            <div className="h-[250px] w-full bg-card border border-card-border rounded-xl p-4">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data.chart_data}>
                  <XAxis 
                    dataKey="datetime" 
                    tickFormatter={(tick) => new Date(tick).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    stroke="var(--text-secondary)" 
                    fontSize={11}
                  />
                  <YAxis stroke="var(--text-secondary)" fontSize={11} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'var(--tooltip-bg)', border: '1px solid var(--card-border)', borderRadius: '8px' }}
                    labelFormatter={(label) => new Date(label).toLocaleString()}
                  />
                  <ReferenceLine x={timestamp} stroke="var(--anomaly-critical)" strokeDasharray="3 3" />
                  
                  {FEATURES.map((f, i) => (
                    <Line 
                      key={f}
                      type="monotone" 
                      dataKey={f} 
                      stroke={COLORS[i % COLORS.length]} 
                      dot={false}
                      strokeWidth={2}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="border border-card-border rounded-lg overflow-hidden bg-card">
              <Table>
                <TableHeader>
                  <TableRow className="border-card-border hover:bg-transparent">
                    <TableHead className="text-text-secondary font-semibold">Sensor</TableHead>
                    <TableHead className="text-text-secondary font-semibold">Value at Event</TableHead>
                    <TableHead className="text-text-secondary font-semibold">24h Mean</TableHead>
                    <TableHead className="text-text-secondary font-semibold">Deviation</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.comparison_table.map((row) => (
                    <TableRow key={row.sensor} className="border-card-border hover:bg-card-border/50 transition-colors">
                      <TableCell className="font-medium text-text-primary">{row.sensor}</TableCell>
                      <TableCell className="text-text-primary">{row.value.toFixed(2)}</TableCell>
                      <TableCell className="text-text-secondary">{row.mean_24h.toFixed(2)}</TableCell>
                      <TableCell className={row.deviation > 0 ? "text-critical" : "text-healthy"}>
                        {row.deviation > 0 ? "+" : ""}{row.deviation.toFixed(2)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        ) : (
          <div className="text-center text-text-secondary py-8">Failed to load event data.</div>
        )}
      </DialogContent>
    </Dialog>
  );
}
