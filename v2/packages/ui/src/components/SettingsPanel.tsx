import React, { useState, useEffect, useCallback } from 'react';
import { storage } from '@lumina/core';
import { markDirty, schedulePush } from '@lumina/drive';
import type { LuminaSettings, WallpapersManifest } from '@lumina/core';
import { ThemeGrid } from './settings/ThemeGrid';
import { WallpaperGrid } from './settings/WallpaperGrid';
import { GeneralSettings } from './settings/GeneralSettings';
import { SyncSettings } from './settings/SyncSettings';

type Tab = 'themes' | 'wallpapers' | 'general' | 'sync';

interface SettingsPanelProps {
  open: boolean;
  onClose: () => void;
  onSignIn?: () => Promise<void>;
  onSignOut?: () => Promise<void>;
}

export function SettingsPanel({ open, onClose, onSignIn, onSignOut }: SettingsPanelProps) {
  const [activeTab, setActiveTab] = useState<Tab>('themes');
  const [settings, setSettings] = useState<LuminaSettings | null>(null);
  const [wallpapers, setWallpapers] = useState<WallpapersManifest | null>(null);

  useEffect(() => {
    if (!open) return;
    Promise.all([storage.getSettings(), storage.getWallpapers()]).then(([s, w]) => {
      setSettings(s);
      setWallpapers(w);
    });
  }, [open]);

  const saveSettings = useCallback(async (next: LuminaSettings) => {
    setSettings(next);
    await storage.setSettings({ ...next, updatedAt: new Date().toISOString() });
    await markDirty('settings');
    schedulePush();
  }, []);

  const saveWallpapers = useCallback(async (next: WallpapersManifest) => {
    setWallpapers(next);
    await storage.setWallpapers({ ...next, updatedAt: new Date().toISOString() });
    await markDirty('wallpapers');
    schedulePush();
  }, []);

  function handleBackdropClick(e: React.MouseEvent) {
    if (e.target === e.currentTarget) onClose();
  }

  return (
    <>
      {open && (
        <div
          style={overlayStyle}
          onClick={handleBackdropClick}
        />
      )}
      <div style={{
        ...panelStyle,
        transform: open ? 'translateX(0)' : 'translateX(100%)',
      }}>
        <div style={panelHeaderStyle}>
          <span style={panelTitleStyle}>Settings</span>
          <button style={closeBtnStyle} onClick={onClose} title="Close">
            <CloseSvg />
          </button>
        </div>

        <div style={tabBarStyle}>
          {TABS.map(tab => (
            <button
              key={tab.id}
              style={{
                ...tabBtnStyle,
                background: activeTab === tab.id ? 'rgba(167,139,250,0.15)' : 'transparent',
                borderBottom: activeTab === tab.id ? '2px solid rgba(167,139,250,0.7)' : '2px solid transparent',
                color: activeTab === tab.id ? '#c4b5fd' : 'rgba(255,255,255,0.45)',
              }}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div style={contentStyle}>
          {activeTab === 'themes' && settings && (
            <section>
              <SectionTitle>Background Themes</SectionTitle>
              <p style={sectionDescStyle}>Select one or more themes to rotate through.</p>
              <ThemeGrid
                selectedThemes={settings.themes}
                onChange={themes => saveSettings({ ...settings, themes })}
              />
            </section>
          )}

          {activeTab === 'wallpapers' && wallpapers && settings && (
            <section>
              <SectionTitle>Wallpapers</SectionTitle>
              <p style={sectionDescStyle}>Select wallpapers to rotate. Upload your own or use Bing Daily.</p>
              <WallpaperGrid
                manifest={wallpapers}
                onChange={saveWallpapers}
              />

              <div style={{ marginTop: 16 }}>
                <SectionTitle>Background Mode</SectionTitle>
                <div style={segmentedStyle}>
                  {(['colors', 'wallpaper'] as const).map(mode => (
                    <button
                      key={mode}
                      style={{
                        ...segBtnStyle,
                        background: settings.bgMode === mode ? 'rgba(167,139,250,0.2)' : 'rgba(255,255,255,0.05)',
                        borderColor: settings.bgMode === mode ? 'rgba(167,139,250,0.4)' : 'rgba(255,255,255,0.1)',
                        color: settings.bgMode === mode ? '#c4b5fd' : 'rgba(255,255,255,0.45)',
                      }}
                      onClick={() => saveSettings({ ...settings, bgMode: mode })}
                    >
                      {mode === 'colors' ? 'Colors' : 'Wallpaper'}
                    </button>
                  ))}
                </div>
              </div>
            </section>
          )}

          {activeTab === 'general' && settings && (
            <section>
              <SectionTitle>General</SectionTitle>
              <GeneralSettings settings={settings} onChange={saveSettings} />
            </section>
          )}

          {activeTab === 'sync' && (
            <section>
              <SectionTitle>Sync</SectionTitle>
              <SyncSettings onSignIn={onSignIn} onSignOut={onSignOut} />
            </section>
          )}
        </div>
      </div>
    </>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h3 style={sectionTitleStyle}>{children}</h3>;
}

const TABS: { id: Tab; label: string }[] = [
  { id: 'themes', label: 'Themes' },
  { id: 'wallpapers', label: 'Wallpapers' },
  { id: 'general', label: 'General' },
  { id: 'sync', label: 'Sync' },
];

const overlayStyle: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  zIndex: 89,
  background: 'rgba(0,0,0,0.4)',
  pointerEvents: 'auto',
};

const panelStyle: React.CSSProperties = {
  position: 'fixed',
  right: 0,
  top: 0,
  bottom: 0,
  width: 'clamp(420px, 40vw, 800px)',
  maxWidth: '100vw',
  zIndex: 90,
  background: 'rgba(14,10,28,0.97)',
  borderLeft: '1px solid rgba(255,255,255,0.1)',
  backdropFilter: 'blur(20px)',
  display: 'flex',
  flexDirection: 'column',
  transition: 'transform 0.35s cubic-bezier(0.4,0,0.2,1)',
  boxShadow: '-4px 0 40px rgba(0,0,0,0.5)',
  pointerEvents: 'auto',
};

const panelHeaderStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '20px 20px 16px',
  borderBottom: '1px solid rgba(255,255,255,0.07)',
  flexShrink: 0,
};

const panelTitleStyle: React.CSSProperties = {
  fontSize: 16,
  fontWeight: 700,
  color: 'rgba(255,255,255,0.85)',
  fontFamily: 'Inter, sans-serif',
};

const closeBtnStyle: React.CSSProperties = {
  width: 30,
  height: 30,
  borderRadius: 8,
  border: '1px solid rgba(255,255,255,0.12)',
  background: 'rgba(255,255,255,0.06)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
  color: 'rgba(255,255,255,0.5)',
};

const tabBarStyle: React.CSSProperties = {
  display: 'flex',
  borderBottom: '1px solid rgba(255,255,255,0.07)',
  flexShrink: 0,
};

const tabBtnStyle: React.CSSProperties = {
  flex: 1,
  padding: '10px 4px',
  border: 'none',
  cursor: 'pointer',
  fontSize: 12,
  fontWeight: 600,
  fontFamily: 'Inter, sans-serif',
  transition: 'all 0.15s',
  letterSpacing: '0.02em',
};

const contentStyle: React.CSSProperties = {
  flex: 1,
  overflowY: 'auto',
  padding: '20px',
};

const sectionTitleStyle: React.CSSProperties = {
  fontSize: 13,
  fontWeight: 700,
  color: 'rgba(255,255,255,0.75)',
  marginBottom: 8,
  fontFamily: 'Inter, sans-serif',
};

const sectionDescStyle: React.CSSProperties = {
  fontSize: 12,
  color: 'rgba(255,255,255,0.38)',
  marginBottom: 12,
};

const segmentedStyle: React.CSSProperties = {
  display: 'flex',
  gap: 6,
  marginTop: 8,
};

const segBtnStyle: React.CSSProperties = {
  flex: 1,
  padding: '7px 10px',
  borderRadius: 9,
  border: '1px solid',
  fontSize: 12,
  cursor: 'pointer',
  fontFamily: 'Inter, sans-serif',
  transition: 'all 0.15s',
  textAlign: 'center',
};

function CloseSvg() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <line x1="18" y1="6" x2="6" y2="18"/>
      <line x1="6" y1="6" x2="18" y2="18"/>
    </svg>
  );
}
