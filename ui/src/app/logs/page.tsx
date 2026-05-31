'use client';

import React, { useState, useEffect } from 'react';
import { ScrollText, Clock, RefreshCw, AlertTriangle, Bell, Cpu, Info, Filter } from 'lucide-react';

interface LogEvent {
  type: string;
  message: string;
  timestamp: string;
}

const EVENT_TYPES = ['ALL', 'SYSTEM', 'ALARM_START', 'ALARM_STOP', 'BEEP_START', 'BEEP_STOP', 'RECORDING_START', 'RECORDING_STOP'];

export default function LogsPage() {
  const [events, setEvents] = useState<LogEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('ALL');
  const [apiUrl, setApiUrl] = useState('http://127.0.0.1:8001');

  useEffect(() => {
    const host = window.location.hostname;
    setApiUrl(`http://${host}:8001`);
  }, []);

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${apiUrl}/events`);
      const data = await res.json();
      setEvents(data);
    } catch (err) {
      console.error('Failed to fetch events:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (apiUrl) fetchEvents();
  }, [apiUrl]);

  // Auto-refresh every 5 seconds
  useEffect(() => {
    if (!apiUrl) return;
    const interval = setInterval(fetchEvents, 5000);
    return () => clearInterval(interval);
  }, [apiUrl]);

  const filtered = filter === 'ALL' ? events : events.filter(e => e.type === filter);

  const typeIcon = (type: string) => {
    if (type.includes('ALARM')) return <Bell size={13} color="var(--red)" />;
    if (type.includes('RECORDING')) return <Cpu size={13} color="var(--violet-light)" />;
    if (type.includes('SYSTEM')) return <Info size={13} color="var(--emerald)" />;
    if (type.includes('BEEP')) return <AlertTriangle size={13} color="var(--amber)" />;
    return <ScrollText size={13} color="var(--text-muted)" />;
  };

  const typeTag = (type: string) => {
    if (type.includes('ALARM_START')) return 'tag-red';
    if (type.includes('ALARM_STOP') || type.includes('BEEP_STOP')) return 'tag-emerald';
    if (type.includes('BEEP_START')) return 'tag-amber';
    if (type.includes('RECORDING')) return 'tag-violet';
    if (type.includes('SYSTEM')) return 'tag-emerald';
    return 'tag-muted';
  };

  return (
    <>
      {/* Page Header */}
      <div className="page-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div className="page-title">System Logs</div>
          <div className="page-subtitle">Event history from the drowsiness detection engine</div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button className="btn btn-ghost" onClick={fetchEvents} disabled={loading}>
            <RefreshCw size={16} className={loading ? 'spin' : ''} />
            Refresh
          </button>
        </div>
      </div>

      {/* Page Body */}
      <div className="page-body">
        {/* Filter bar */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 20, flexWrap: 'wrap' }}>
          <Filter size={14} color="var(--text-muted)" style={{ marginTop: 7 }} />
          {EVENT_TYPES.map(t => (
            <button
              key={t}
              className={`btn ${filter === t ? 'btn-violet' : 'btn-ghost'}`}
              style={{ padding: '5px 12px', fontSize: 11 }}
              onClick={() => setFilter(t)}
            >
              {t.replace(/_/g, ' ')}
            </button>
          ))}
        </div>

        {loading && events.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)' }}>
            <RefreshCw size={28} style={{ animation: 'spin 1s linear infinite', marginBottom: 12 }} />
            <div>Loading logs...</div>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 80 }}>
            <ScrollText size={48} color="var(--text-muted)" strokeWidth={1} style={{ marginBottom: 16 }} />
            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6 }}>
              {events.length === 0 ? 'No Logs Yet' : 'No Matching Logs'}
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
              {events.length === 0
                ? 'System events will appear here when detection is running.'
                : 'Try a different filter to see matching events.'}
            </div>
          </div>
        ) : (
          <div className="card">
            <div className="card-header">
              <span className="card-title">Event Log ({filtered.length} entries)</span>
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Auto-refreshing every 5s</span>
            </div>
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: 50 }}>#</th>
                  <th>Type</th>
                  <th>Message</th>
                  <th>Timestamp</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((event, i) => (
                  <tr key={i}>
                    <td style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: 'var(--text-muted)' }}>
                      {i + 1}
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        {typeIcon(event.type)}
                        <span className={`tag ${typeTag(event.type)}`}>{event.type}</span>
                      </div>
                    </td>
                    <td style={{ fontSize: 13 }}>
                      {event.message || '—'}
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
                        <Clock size={12} color="var(--text-muted)" />
                        {event.timestamp || '—'}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
