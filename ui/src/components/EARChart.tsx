'use client';

import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';

interface EARChartProps {
  data: { time: string, ear: number }[];
}

export default function EARChart({ data }: EARChartProps) {
  return (
    <div className="glass p-8 h-[350px] w-full flex flex-col">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-sm font-black uppercase tracking-[0.2em] text-slate-500">Live EAR Analysis</h3>
        <span className="flex items-center gap-2 text-[10px] text-sky-400 font-bold">
          <div className="w-1.5 h-1.5 rounded-full bg-sky-500 animate-pulse"></div>
          REAL-TIME
        </span>
      </div>
      <div className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" vertical={false} />
            <XAxis dataKey="time" hide />
            <YAxis 
              domain={[0, 0.45]} 
              stroke="#475569" 
              fontSize={10}
              tickFormatter={(v) => v.toFixed(2)}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip 
              contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '12px', fontSize: '12px' }}
              itemStyle={{ color: '#38bdf8' }}
              labelStyle={{ display: 'none' }}
            />
            <ReferenceLine y={0.25} stroke="#ef4444" strokeDasharray="5 5" strokeWidth={1} label={{ position: 'right', value: 'ALERT', fill: '#ef4444', fontSize: 10, fontWeight: 'bold' }} />
            <Line 
              type="monotone" 
              dataKey="ear" 
              stroke="#38bdf8" 
              strokeWidth={3} 
              dot={false}
              isAnimationActive={false}
              fill="url(#colorEar)"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
