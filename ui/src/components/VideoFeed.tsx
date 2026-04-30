'use client';

import React from 'react';

export default function VideoFeed() {
  return (
    <div className="w-full h-full bg-black flex items-center justify-center">
      <img 
        src="http://127.0.0.1:8000/video_feed" 
        alt="System Feed" 
        className="video-element"
        onError={(e) => {
          (e.target as HTMLImageElement).src = 'https://placehold.co/1280x720/000000/222222?text=STREAM_OFFLINE';
        }}
      />
    </div>
  );
}
