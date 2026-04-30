'use client';

import React from 'react';
import { Activity, Eye } from 'lucide-react';

interface StatusCardProps {
  status: string;
  ear: number;
}

export default function StatusCard({ status, ear }: StatusCardProps) {
  const isAlert = status === 'DROWSY' || status === 'MISSING';
  const isOffline = status === 'OFFLINE' || status === 'IDLE';
  
  return (
    <>
      <div className="glass p-6 flex flex-col items-center justify-center min-h-[160px]">
        <Activity className={`w-8 h-8 mb-3 ${isOffline ? 'text-gray-600' : isAlert ? 'text-red-500' : 'text-green-500'}`} />
        <span className="text-xs text-gray-500 uppercase font-bold mb-1">State</span>
        <span className={`text-2xl font-bold ${isAlert ? 'text-red-500' : isOffline ? 'text-gray-500' : 'text-green-500'}`}>
          {status}
        </span>
      </div>
      
      <div className="glass p-6 flex flex-col items-center justify-center min-h-[160px]">
        <Eye className={`w-8 h-8 mb-3 ${isOffline ? 'text-gray-600' : 'text-blue-400'}`} />
        <span className="text-xs text-gray-500 uppercase font-bold mb-1">Eye Ratio</span>
        <span className={`text-2xl font-bold ${isOffline ? 'text-gray-500' : 'text-blue-400'}`}>
          {isOffline ? '0.00' : ear.toFixed(2)}
        </span>
      </div>
    </>
  );
}
