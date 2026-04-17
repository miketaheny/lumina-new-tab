import React, { useState, useEffect } from 'react';
import { storage } from '@lumina/core';
import { isSignedIn, onSyncStatus, flushPush } from '@lumina/drive';
import type { SyncStatus } from '@lumina/drive';

interface SyncSettingsProps {
  onSignIn?: () => Promise<void>;
  onSignOut?: () => Promise<void>;
}

export function SyncSettings({ onSignIn, onSignOut }: SyncSettingsProps) {
  const [signedIn, setSignedIn] = useState(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');
  const [syncMessage, setSyncMessage] = useState('');

  useEffect(() => {
    isSignedIn().then(setSignedIn);
  }, []);

  useEffect(() => {
    return onSyncStatus((status, message) => {
      setSyncStatus(status);
      setSyncMessage(message);
      if (status === 'connected' || status === 'idle') {
        isSignedIn().then(setSignedIn);
      }
    });
  }, []);

  async function handleSignIn() {
    if (!onSignIn) return;
    await onSignIn();
    setSignedIn(await isSignedIn());
  }

  async function handleSignOut() {
    if (!onSignOut) return;
    await onSignOut();
    setSignedIn(false);
  }

  async function handleSyncNow() {
    flushPush();
  }

  async function handleExportLinks() {
    const data = await storage.getQuickLinks();
    downloadJson(data, 'lumina-quick-links.json');
  }

  async function handleExportAll() {
    const [settings, quickLinks, notes, kindling, wallpapers] = await Promise.all([
      storage.getSettings(),
      storage.getQuickLinks(),
      storage.getNotes(),
      storage.getKindling(),
      storage.getWallpapers(),
    ]);
    downloadJson({ settings, quickLinks, notes, kindling, wallpapers }, 'lumina-export.json');
  }

  const statusColor = statusColorMap[syncStatus] ?? 'rgba(255,255,255,0.45)';

  return (
    <div style={containerStyle}>
      <SectionLabel>Google Drive Sync</SectionLabel>

      {signedIn ? (
        <>
          <div style={statusRowStyle}>
            <span style={{ ...statusDotStyle, background: statusColor }} />
            <span style={statusTextStyle}>
              {syncStatus === 'syncing' ? syncMessage : syncStatusLabel[syncStatus] ?? syncStatus}
            </span>
          </div>

          <div style={btnRowStyle}>
            <button style={btnStyle} onClick={handleSyncNow}>
              Sync Now
            </button>
            <button style={{ ...btnStyle, color: '#f87171', borderColor: 'rgba(248,113,113,0.3)' }} onClick={handleSignOut}>
              Sign Out
            </button>
          </div>
        </>
      ) : (
        <button style={signInBtnStyle} onClick={handleSignIn} disabled={!onSignIn}>
          <GoogleIcon />
          Sign in with Google
        </button>
      )}

      <SectionLabel>Export</SectionLabel>

      <div style={btnRowStyle}>
        <button style={btnStyle} onClick={handleExportLinks}>
          Export Links
        </button>
        <button style={btnStyle} onClick={handleExportAll}>
          Export All Data
        </button>
      </div>
    </div>
  );
}

function downloadJson(data: unknown, filename: string) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <div style={sectionLabelStyle}>{children}</div>;
}

const syncStatusLabel: Record<SyncStatus, string> = {
  idle: 'Connected',
  syncing: 'Syncing…',
  connected: 'Connected',
  disconnected: 'Disconnected',
  error: 'Sync error',
};

const statusColorMap: Record<SyncStatus, string> = {
  idle: '#34d399',
  syncing: '#60a5fa',
  connected: '#34d399',
  disconnected: 'rgba(255,255,255,0.3)',
  error: '#f87171',
};

const containerStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 6,
};

const sectionLabelStyle: React.CSSProperties = {
  fontSize: 10,
  fontWeight: 600,
  letterSpacing: '0.1em',
  textTransform: 'uppercase',
  color: 'rgba(255,255,255,0.35)',
  marginTop: 16,
  marginBottom: 4,
};

const statusRowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  padding: '8px 0',
};

const statusDotStyle: React.CSSProperties = {
  width: 8,
  height: 8,
  borderRadius: '50%',
  flexShrink: 0,
};

const statusTextStyle: React.CSSProperties = {
  fontSize: 13,
  color: 'rgba(255,255,255,0.65)',
};

const btnRowStyle: React.CSSProperties = {
  display: 'flex',
  gap: 8,
  flexWrap: 'wrap',
};

const btnStyle: React.CSSProperties = {
  padding: '7px 14px',
  borderRadius: 9,
  border: '1px solid rgba(255,255,255,0.13)',
  background: 'rgba(255,255,255,0.07)',
  color: 'rgba(255,255,255,0.65)',
  fontSize: 12,
  cursor: 'pointer',
  fontFamily: 'Inter, sans-serif',
  transition: 'background 0.15s',
};

const signInBtnStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  padding: '9px 16px',
  borderRadius: 10,
  border: '1px solid rgba(255,255,255,0.15)',
  background: 'rgba(255,255,255,0.08)',
  color: 'rgba(255,255,255,0.8)',
  fontSize: 13,
  fontWeight: 500,
  cursor: 'pointer',
  fontFamily: 'Inter, sans-serif',
  transition: 'background 0.15s',
};

function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  );
}
