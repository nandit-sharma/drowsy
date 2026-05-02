'use client';

import React from 'react';

export default function VideoFeed() {
  const API_URL = typeof window !== 'undefined' ? `http://${window.location.hostname}:8001` : 'http://127.0.0.1:8001';
  return (
    <div className="w-full h-full bg-black flex items-center justify-center">
      <img 
        src={`${API_URL}/video_feed`}
        alt="System Feed" 
        className="video-element"
        onError={(e) => {
          (e.target as HTMLImageElement).src = 'https://placehold.co/1280x720/000000/222222?text=STREAM_OFFLINE';
        }}
      />
    </div>
  );
}
