import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import { storage } from '@lumina/core';
import { setAuthProvider, markDirty, schedulePush } from '@lumina/drive';
import type { KindlingItem } from '@lumina/core';
import { extensionAuthProvider } from '../../lib/extension-auth-provider';

setAuthProvider(extensionAuthProvider);

function Popup() {
  const [tab, setTab] = useState<{ url: string; title: string } | null>(null);
  const [saved, setSaved] = useState(false);
  const [already, setAlready] = useState(false);

  useEffect(() => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const t = tabs[0];
      if (t?.url) {
        setTab({ url: t.url, title: t.title || t.url });
        storage.getKindling().then(data => {
          if (data.items.some(i => i.url === t.url)) setAlready(true);
        });
      }
    });
  }, []);

  async function handleSave() {
    if (!tab) return;
    const data = await storage.getKindling();
    const now = new Date().toISOString();
    const item: KindlingItem = {
      id: `k-${Date.now()}`,
      url: tab.url,
      title: tab.title,
      tags: [],
      readAt: null,
      sortOrder: data.items.length,
      updatedAt: now,
    };
    const next = { ...data, items: [...data.items, item], updatedAt: now };
    await storage.setKindling(next);
    await markDirty('kindling');
    schedulePush();
    setSaved(true);
  }

  let faviconUrl: string | undefined;
  try {
    if (tab) faviconUrl = `https://www.google.com/s2/favicons?domain=${new URL(tab.url).hostname}&sz=32`;
  } catch { /* ignore bad URLs */ }

  if (!tab) {
    return <div style={containerStyle}><p style={msgStyle}>No active tab found.</p></div>;
  }

  return (
    <div style={containerStyle}>
      <div style={headerStyle}>
        {faviconUrl && <img src={faviconUrl} width={16} height={16} style={{ borderRadius: 2, flexShrink: 0 }} />}
        <span style={titleStyle}>{tab.title}</span>
      </div>
      <div style={urlStyle}>{tab.url}</div>
      {saved || already ? (
        <div style={statusStyle}>{already ? 'Already in Kindling' : 'Saved to Kindling!'}</div>
      ) : (
        <button style={btnStyle} onClick={handleSave}>Save to Kindling</button>
      )}
    </div>
  );
}

const containerStyle: React.CSSProperties = {
  width: 300,
  padding: 16,
  background: '#0e0a1c',
  color: 'rgba(255,255,255,0.85)',
  fontFamily: 'Inter, system-ui, sans-serif',
  fontSize: 13,
};

const headerStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  marginBottom: 6,
};

const titleStyle: React.CSSProperties = {
  fontWeight: 600,
  fontSize: 13,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
};

const urlStyle: React.CSSProperties = {
  fontSize: 11,
  color: 'rgba(255,255,255,0.35)',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
  marginBottom: 12,
};

const btnStyle: React.CSSProperties = {
  width: '100%',
  padding: '8px 0',
  borderRadius: 8,
  border: '1px solid rgba(167,139,250,0.3)',
  background: 'rgba(167,139,250,0.15)',
  color: '#c4b5fd',
  fontSize: 12,
  fontWeight: 600,
  fontFamily: 'Inter, system-ui, sans-serif',
  cursor: 'pointer',
};

const statusStyle: React.CSSProperties = {
  textAlign: 'center',
  color: 'rgba(167,139,250,0.8)',
  fontSize: 12,
  fontWeight: 500,
  padding: '6px 0',
};

const msgStyle: React.CSSProperties = {
  color: 'rgba(255,255,255,0.4)',
  margin: 0,
  textAlign: 'center',
};

ReactDOM.createRoot(document.getElementById('root')!).render(<Popup />);
