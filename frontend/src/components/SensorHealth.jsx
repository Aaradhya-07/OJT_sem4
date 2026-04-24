import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';

export default function SensorHealth({ runId }) {
  const [data, setData] = useState([]);

  useEffect(() => {
    if (!runId) return;
    axios.get(`http://localhost:8000/sensor-health?run_id=${runId}`)
      .then(res => setData(res.data))
      .catch(console.error);
  }, [runId]);

  if (!data.length) return null;

  const colorMap = {
    emerald: "bg-[#10B981]",
    amber: "bg-[#F59E0B]",
    rose: "bg-[#F43F5E]"
  };

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-4 mb-6">
      {data.map(sensor => (
        <Card key={sensor.sensor} className="bg-page-bg border-card-border hover:border-text-secondary/50 transition-colors shadow-none">
          <CardHeader className="p-3 pb-1">
            <CardTitle className="text-sm font-semibold text-text-primary truncate">
              {sensor.sensor}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-0">
            <div className="flex justify-between items-baseline mb-2">
              <div className="text-2xl font-bold text-text-primary">
                {sensor.anomaly_rate}%
              </div>
            </div>
            
            <Progress 
              value={sensor.anomaly_rate} 
              max={100}
              className="h-1.5 bg-card-border"
              indicatorClassName={`${colorMap[sensor.status]}`}
            />
            
            <div className="mt-3 flex justify-between items-center">
               <span className="text-xs text-text-secondary">Worst Val</span>
               <span className="text-xs font-mono font-medium text-text-primary bg-card px-1.5 py-0.5 rounded border border-card-border">
                  {sensor.worst_value}
               </span>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
