'use client';

import React from 'react';
import { Bell, Clock } from 'lucide-react';

interface Event {
  type: string;
  message: string;
  timestamp: string;
}

interface EventSidebarProps {
  events: Event[];
}

export default function EventSidebar({ events }: EventSidebarProps) {
  return (
    <div className="glass h-full flex flex-col">
      <div className="p-6 border-b border-white/10 flex items-center justify-between">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Bell className="w-5 h-5 text-sky-400" />
          Alert History
        </h2>
        <span className="text-xs bg-sky-500/20 text-sky-400 px-2 py-0.5 rounded-full font-bold">
          {events.length}
        </span>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {events.length === 0 && (
          <div className="text-center py-10 text-slate-500">
            No events recorded yet.
          </div>
        )}
        
        {events.map((event, i) => (
          <div key={i} className="glass p-3 text-sm border-l-4 border-l-sky-500 hover:bg-white/5 transition-colors">
            <div className="flex justify-between items-start mb-1">
              <span className={`font-bold ${event.type.includes('START') ? 'text-red-400' : 'text-green-400'}`}>
                {event.type}
              </span>
              <span className="text-[10px] text-slate-500 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {new Date(event.timestamp).toLocaleTimeString()}
              </span>
            </div>
            <p className="text-slate-400 text-xs line-clamp-2">
              {event.message}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
