'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Video,
  ScrollText,
  Settings,
  Shield,
} from 'lucide-react';

const navItems = [
  { href: '/',           label: 'Live Monitor', icon: LayoutDashboard, section: 'main' },
  { href: '/recordings', label: 'Recordings',   icon: Video,           section: 'main' },
  { href: '/logs',       label: 'System Logs',  icon: ScrollText,      section: 'main' },
  { href: '/settings',   label: 'Settings',     icon: Settings,        section: 'system' },
];

export default function Sidebar() {
  const pathname = usePathname();

  const [host, setHost] = useState('127.0.0.1');

  useEffect(() => {
    setHost(window.location.hostname);
  }, []);

  const mainItems = navItems.filter((n) => n.section === 'main');
  const systemItems = navItems.filter((n) => n.section === 'system');

  return (
    <aside className="sidebar">
      {/* Logo */}
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon">
          <Shield size={20} color="white" />
        </div>
        <div>
          <div className="sidebar-logo-text">DrowsyGuard</div>
          <div className="sidebar-logo-sub">AI Security Suite</div>
        </div>
      </div>

      {/* Main Navigation */}
      <div className="sidebar-section" style={{ flex: 1 }}>
        <div className="sidebar-section-label">Navigation</div>
        <nav className="sidebar-nav">
          {mainItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`nav-item${isActive ? ' active' : ''}`}
              >
                <Icon className="nav-item-icon" size={18} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="sidebar-section-label" style={{ marginTop: 24 }}>
          System
        </div>

        <nav className="sidebar-nav">
          {systemItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`nav-item${isActive ? ' active' : ''}`}
              >
                <Icon className="nav-item-icon" size={18} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Footer Status */}
      <div className="sidebar-footer">
        <div className="status-pill">
          <div className="status-dot" id="server-dot"></div>
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>
              API Server
            </div>

            <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'monospace' }}>
              {host}:8001
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}