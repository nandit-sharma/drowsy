'use client';

import React, { useState, useEffect } from 'react';
import { PlayCircle, Clock, Calendar, AlertCircle, FileVideo } from 'lucide-react';

interface Recording {
  filename: string;
  start_time: string;
  end_time: string;
  reason: string;
}

export default function RecordingsPage() {
  const [recordings, setRecordings] = useState<Recording[]>([]);

  useEffect(() => {
    fetch('http://127.0.0.1:8000/recordings')
      .then(res => res.json())
      .then(setRecordings)
      .catch(err => console.error('Failed to fetch recordings:', err));
  }, []);

  return (
    <div className="max-w-screen-xl mx-auto">
      <div className="mb-12">
        <div className="status-label mb-2">Data Archives</div>
        <h2 className="text-5xl font-black tracking-tighter">VIDEO_HISTORY</h2>
      </div>

      <div className="grid grid-cols-3 gap-8">
        {recordings.length === 0 ? (
          <div className="col-span-full border-2 border-dashed border-[#222] p-24 text-center rounded-3xl">
            <FileVideo size={48} className="text-[#222] mx-auto mb-4" />
            <p className="text-gray-600 font-bold uppercase tracking-widest text-sm">No Archives Found</p>
          </div>
        ) : (
          recordings.map((rec, i) => (
            <div key={i} className="card group overflow-hidden">
              <div className="aspect-video bg-black relative flex items-center justify-center border-b border-[#222]">
                <PlayCircle className="text-white/10 group-hover:text-cyan-500 transition-colors" size={48} />
                <div className="absolute top-4 left-4 bg-red-600 text-white text-[10px] font-black px-2 py-1 uppercase tracking-tighter">
                  {rec.reason}
                </div>
              </div>
              <div className="p-6 space-y-4">
                <div className="flex justify-between items-center">
                  <div className="text-[10px] text-gray-500 font-black uppercase tracking-widest">{rec.start_time.split('_')[0]}</div>
                  <div className="text-[10px] text-cyan-500 font-mono">#{i + 1024}</div>
                </div>
                <div className="text-sm font-bold text-gray-400 font-mono uppercase">
                  {rec.start_time.split('_')[1].replace(/-/g, ':')}
                </div>
                <button className="w-full py-3 bg-[#1a1a1a] hover:bg-white hover:text-black rounded-lg text-[10px] font-black uppercase tracking-[0.2em] transition-all">
                  Access Data
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
