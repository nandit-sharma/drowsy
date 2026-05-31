'use client';

import React, { useState, useEffect } from 'react';
import { Video, Clock, AlertTriangle, RefreshCw, Film } from 'lucide-react';

interface Recording {
  filename: string;
  start_time: string;
  end_time: string;
  reason: string;
}

export default function RecordingsPage() {
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [loading, setLoading] = useState(true);
  const [apiUrl, setApiUrl] = useState('http://127.0.0.1:8001');

  useEffect(() => {
    const host = window.location.hostname;
    setApiUrl(`http://${host}:8001`);
  }, []);

  const fetchRecordings = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${apiUrl}/recordings`);
      const data = await res.json();
      setRecordings(data);
    } catch (err) {
      console.error('Failed to fetch recordings:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (apiUrl) fetchRecordings();
  }, [apiUrl]);

  const reasonTag = (reason: string) => {
    const r = reason?.toUpperCase() || 'UNKNOWN';
    if (r.includes('DROWSY')) return { cls: 'tag-red', label: 'DROWSY' };
    if (r.includes('MISSING')) return { cls: 'tag-amber', label: 'FACE MISSING' };
    if (r.includes('MANUAL')) return { cls: 'tag-violet', label: 'MANUAL STOP' };
    if (r.includes('FACE_FOUND')) return { cls: 'tag-emerald', label: 'FACE FOUND' };
    return { cls: 'tag-muted', label: r };
  };

  const formatTime = (t: string) => {
    if (!t) return '—';
    // Convert underscore timestamps like "2026-05-31_23-45-10" to readable
    return t.replace(/_/g, ' ').replace(/-/g, ':').replace(/^(\d{4}):(\d{2}):(\d{2})/, '$1-$2-$3');
  };

  return (
    <>
      {/* Page Header */}
      <div className="page-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div className="page-title">Recordings</div>
          <div className="page-subtitle">Saved video clips from drowsiness and face-missing events</div>
        </div>
        <button className="btn btn-ghost" onClick={fetchRecordings} disabled={loading}>
          <RefreshCw size={16} className={loading ? 'spin' : ''} />
          Refresh
        </button>
      </div>

      {/* Page Body */}
      <div className="page-body">
        {loading && recordings.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)' }}>
            <RefreshCw size={28} style={{ animation: 'spin 1s linear infinite', marginBottom: 12 }} />
            <div>Loading recordings...</div>
          </div>
        ) : recordings.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 80 }}>
            <Film size={48} color="var(--text-muted)" strokeWidth={1} style={{ marginBottom: 16 }} />
            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6 }}>No Recordings Yet</div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
              Recordings will appear here when the system detects drowsiness or a missing face while detection is active.
            </div>
          </div>
        ) : (
          <div className="card">
            <div className="card-header">
              <span className="card-title">All Recordings ({recordings.length})</span>
            </div>
            <table className="data-table">
              <thead>
                <tr>
                  <th>File</th>
                  <th>Reason</th>
                  <th>Start Time</th>
                  <th>End Time</th>
                </tr>
              </thead>
              <tbody>
                {recordings.map((rec, i) => {
                  const tag = reasonTag(rec.reason);
                  return (
                    <tr key={i}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <Video size={14} color="var(--violet-light)" />
                          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12 }}>
                            {rec.filename ? rec.filename.replace('recordings/', '') : '—'}
                          </span>
                        </div>
                      </td>
                      <td>
                        <span className={`tag ${tag.cls}`}>{tag.label}</span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
                          <Clock size={12} color="var(--text-muted)" />
                          {formatTime(rec.start_time)}
                        </div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
                          <Clock size={12} color="var(--text-muted)" />
                          {formatTime(rec.end_time)}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
