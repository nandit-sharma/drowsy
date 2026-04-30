'use client';

import React, { useState, useEffect } from 'react';
import { Terminal, Clock, ShieldAlert } from 'lucide-react';

interface LogEvent {
  type: string;
  message: string;
  timestamp: string;
}

export default function LogsPage() {
  const [logs, setLogs] = useState<LogEvent[]>([]);

  useEffect(() => {
    fetch('http://127.0.0.1:8000/events')
      .then(res => res.json())
      .then(setLogs)
      .catch(err => console.error('Failed to fetch logs:', err));
  }, []);

  return (
    <div className="max-w-screen-xl mx-auto">
      <div className="mb-12 flex justify-between items-end">
        <div>
          <div className="status-label mb-2">Secure Kernel Trace</div>
          <h2 className="text-5xl font-black tracking-tighter">RUNTIME_LOGS</h2>
        </div>
        <div className="text-right">
          <div className="status-label mb-1">Packet Count</div>
          <div className="text-4xl font-black text-cyan-500">{logs.length}</div>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="grid grid-cols-12 gap-4 p-6 bg-white/[0.02] border-b border-[#222] text-[10px] font-black uppercase tracking-[0.3em] text-gray-500">
          <div className="col-span-3">Timestamp</div>
          <div className="col-span-2">Flag</div>
          <div className="col-span-7">Packet_Data</div>
        </div>
        
        <div className="divide-y divide-[#111]">
          {logs.map((log, i) => (
            <div key={i} className="grid grid-cols-12 gap-4 p-6 items-center hover:bg-white/[0.01] transition-colors font-mono">
              <div className="col-span-3 text-[11px] text-gray-600">
                {new Date(log.timestamp).toLocaleString()}
              </div>
              <div className="col-span-2">
                <span className={`text-[10px] font-black px-2 py-0.5 rounded border ${
                  log.type.includes('ALARM') ? 'border-red-900 text-red-500' : 
                  log.type.includes('SYSTEM') ? 'border-cyan-900 text-cyan-500' : 'border-gray-800 text-gray-500'
                }`}>
                  {log.type}
                </span>
              </div>
              <div className="col-span-7 text-xs text-gray-400">
                {log.message}
              </div>
            </div>
          ))}
          
          {logs.length === 0 && (
            <div className="p-32 text-center">
              <Terminal size={48} className="text-[#111] mx-auto mb-4" />
              <p className="text-gray-700 font-bold uppercase tracking-widest text-sm">Kernel Empty</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
