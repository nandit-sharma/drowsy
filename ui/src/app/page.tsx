'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Play, Square, Power, AlertTriangle, Eye, Activity, Cpu, Wifi } from 'lucide-react';
import { LineChart, Line, ResponsiveContainer, YAxis, ReferenceLine, Tooltip } from 'recharts';

type DetectionData = { ear: number; status: string };
type EarPoint = { t: number; ear: number };

export default function Home() {
  const [data, setData] = useState<DetectionData>({ ear: 0, status: 'IDLE' });
  const [earHistory, setEarHistory] = useState<EarPoint[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [loading, setLoading] = useState(false);

  const [apiUrl, setApiUrl] = useState('http://127.0.0.1:8001');
  const [wsUrl, setWsUrl] = useState('ws://127.0.0.1:8001');

  const ws = useRef<WebSocket | null>(null);

  // Fix hydration mismatch by setting URLs only after client mounts
  useEffect(() => {
    const host = window.location.hostname;
    setApiUrl(`http://${host}:8001`);
    setWsUrl(`ws://${host}:8001`);
  }, []);

  // Check current status + connect websocket
  useEffect(() => {
    fetch(`${apiUrl}/detection/status`)
      .then((r) => r.json())
      .then((d) => setIsRunning(d.running))
      .catch(() => { });

    const connect = () => {
      ws.current = new WebSocket(`${wsUrl}/ws`);

      ws.current.onmessage = (e) => {
        const payload: DetectionData = JSON.parse(e.data);
        setData(payload);
        setEarHistory((prev) => [...prev.slice(-50), { t: Date.now(), ear: payload.ear }]);
      };

      ws.current.onclose = () => setTimeout(connect, 3000);
    };

    connect();

    return () => ws.current?.close();
  }, [apiUrl, wsUrl]);

  const handleStart = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${apiUrl}/detection/start`, { method: 'POST' });
      const result = await res.json();
      if (result.status === 'started' || result.status === 'already_running') setIsRunning(true);
    } catch (err) {
      console.error('Failed to start detection:', err);
      alert('Could not connect to the backend server. Please make sure the FastAPI server is running on port 8001 (or run node server.js from the root folder).');
    } finally {
      setLoading(false);
    }
  };

  const handleStop = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${apiUrl}/detection/stop`, { method: 'POST' });
      const result = await res.json();

      if (result.status === 'stopped') {
        setIsRunning(false);
        setData({ ear: 0, status: 'IDLE' });
        setEarHistory([]);
      }
    } catch (err) {
      console.error('Failed to stop detection:', err);
      alert('Could not connect to the backend server. Please make sure the FastAPI server is running on port 8001.');
    } finally {
      setLoading(false);
    }
  };

  const handleStopAlarm = async () => {
    try {
      await fetch(`${apiUrl}/beep/stop`, {
        method: 'POST',
      });
    } catch (err) {
      console.log('Failed to stop alarm', err);
    }
  };

  const status = isRunning ? data.status : 'IDLE';
  const isAlert = status === 'DROWSY' || status === 'MISSING';
  const isAwake = status === 'AWAKE';

  const statusClass = isAlert ? 'drowsy' : isAwake ? 'awake' : 'idle';
  const earPercent = Math.min(((data.ear || 0) / 0.45) * 100, 100);

  return (
    <>
      {/* Page Header */}
      <div className="page-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div className="page-title">Live Monitor</div>
          <div className="page-subtitle">Real-time eye tracking and drowsiness analysis</div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div className={`status-display ${statusClass}`}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'currentColor', display: 'inline-block' }}></span>
            {status}
          </div>

          {!isRunning ? (
            <button className="btn btn-violet" onClick={handleStart} disabled={loading}>
              <Play size={16} fill="currentColor" />
              {loading ? 'Starting…' : 'Start Detection'}
            </button>
          ) : (
            <button className="btn btn-danger" onClick={handleStop} disabled={loading}>
              <Square size={16} fill="currentColor" />
              {loading ? 'Stopping…' : 'Stop Detection'}
            </button>
          )}

          <button className="btn btn-danger" onClick={handleStopAlarm}>
            <Square size={16} fill="currentColor" />
            Stop Alarm
          </button>
        </div>
      </div>

      {/* Page Body */}
      <div className="page-body">
        <div className="grid-dash">
          {/* LEFT — Video Feed */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div className="card">
              <div className="card-header">
                <span className="card-title">Camera Feed</span>
                {isRunning && (
                  <span className="tag tag-red" style={{ fontSize: 10 }}>
                    <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--red)', display: 'inline-block', animation: 'pulse 1.5s infinite' }}></span>
                    LIVE
                  </span>
                )}
              </div>

              <div className="feed-wrapper">
                <img
                  src={`${apiUrl}/video_feed`}
                  alt="Live Feed"
                  className="feed-img"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />

                {!isRunning && (
                  <div className="feed-overlay">
                    <Power size={52} color="var(--text-muted)" strokeWidth={1} />
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ color: 'var(--text-primary)', fontWeight: 700, fontSize: 15 }}>Detection Offline</div>
                      <div style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 4 }}>Press "Start Detection" to begin</div>
                    </div>

                    <button className="btn btn-violet" onClick={handleStart} disabled={loading}>
                      <Play size={16} fill="currentColor" />
                      {loading ? 'Starting…' : 'Start Detection'}
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* EAR Chart */}
            <div className="card">
              <div className="card-header">
                <span className="card-title">Eye Aspect Ratio — Live Graph</span>
                <span style={{ fontSize: 11, color: 'var(--violet-light)', fontWeight: 600, fontFamily: 'monospace' }}>
                  {(data.ear || 0).toFixed(3)}
                </span>
              </div>

              <div className="card-body" style={{ padding: '16px 20px' }}>
                <div style={{ height: 120 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={earHistory}>
                      <YAxis domain={[0, 0.45]} hide />
                      <ReferenceLine y={0.25} stroke="var(--red)" strokeDasharray="4 4" strokeWidth={1} />
                      <Tooltip
                        contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 11 }}
                        itemStyle={{ color: 'var(--violet-light)' }}
                        labelStyle={{ display: 'none' }}
                        formatter={(v: number) => [v.toFixed(3), 'EAR']}
                      />
                      <Line type="monotone" dataKey="ear" stroke="var(--violet-light)" strokeWidth={2} dot={false} isAnimationActive={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: 11, color: 'var(--text-muted)' }}>
                  <span>0.00 (closed)</span>
                  <span style={{ color: 'var(--red)' }}>— threshold 0.25</span>
                  <span>0.45 (open)</span>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT — Metrics */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* EAR Value */}
            <div className="card card-body">
              <div className="card-title" style={{ marginBottom: 16 }}>Eye Aspect Ratio</div>
              <div className="stat-value" style={{ color: isAlert ? 'var(--red)' : 'var(--violet-light)' }}>
                {(data.ear || 0).toFixed(2)}
              </div>
              <div className="stat-label">Current EAR reading</div>
              <div className="ear-bar-track">
                <div className="ear-bar-fill" style={{ width: `${earPercent}%`, background: isAlert ? 'var(--red)' : 'var(--violet)' }}></div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--text-muted)', marginTop: 6 }}>
                <span>Closed</span>
                <span>Alert @ 0.25</span>
                <span>Open</span>
              </div>
            </div>

            {/* Alert State */}
            <div className="card card-body">
              <div className="card-title" style={{ marginBottom: 16 }}>Alert Status</div>
              <div className="stat-value" style={{ fontSize: 28, color: isAlert ? 'var(--red)' : isAwake ? 'var(--emerald)' : 'var(--text-muted)' }}>
                {isAlert ? '⚠ ALERT' : isAwake ? '✓ NORMAL' : '— IDLE'}
              </div>
              <div className="stat-label">
                {isAlert ? 'Drowsiness detected!' : isAwake ? 'Driver is alert and safe' : 'Start detection to monitor'}
              </div>
            </div>

            {/* System Metrics */}
            <div className="card">
              <div className="card-header"><span className="card-title">System Info</span></div>
              <div className="card-body" style={{ padding: '4px 0' }}>
                <div className="metric-row" style={{ padding: '12px 20px' }}>
                  <span className="metric-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Activity size={13} /> Detection Engine
                  </span>
                  <span className="metric-value" style={{ color: isRunning ? 'var(--emerald)' : 'var(--text-muted)' }}>
                    {isRunning ? 'Running' : 'Stopped'}
                  </span>
                </div>

                <div className="metric-row" style={{ padding: '12px 20px' }}>
                  <span className="metric-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Eye size={13} /> EAR Threshold
                  </span>
                  <span className="metric-value">0.25</span>
                </div>

                <div className="metric-row" style={{ padding: '12px 20px' }}>
                  <span className="metric-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Cpu size={13} /> MediaPipe
                  </span>
                  <span className="metric-value" style={{ color: 'var(--violet-light)' }}>Active</span>
                </div>

                <div className="metric-row" style={{ padding: '12px 20px' }}>
                  <span className="metric-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Wifi size={13} /> WebSocket
                  </span>
                  <span className="metric-value" style={{ color: 'var(--emerald)' }}>Connected</span>
                </div>
              </div>
            </div>

            {/* Alert Banner */}
            {isAlert && (
              <div style={{ background: 'var(--red-dim)', border: '1px solid rgba(239,68,68,0.4)', borderRadius: 12, padding: '16px 20px', display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                <AlertTriangle size={20} color="var(--red)" style={{ flexShrink: 0, marginTop: 1 }} />
                <div>
                  <div style={{ fontWeight: 700, color: 'var(--red)', fontSize: 13 }}>Drowsiness Detected</div>
                  <div style={{ color: 'var(--text-secondary)', fontSize: 12, marginTop: 3 }}>
                    The system has detected signs of drowsiness. Alarm is active.
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}