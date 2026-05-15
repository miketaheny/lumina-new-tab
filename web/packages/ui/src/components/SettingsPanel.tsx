import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { storage } from '@lumina/core';
import type { LuminaSettings, WallpapersManifest } from '@lumina/core';
import { ThemeGrid } from './settings/ThemeGrid';
import { WallpaperGrid } from './settings/WallpaperGrid';
import { GeneralSettings } from './settings/GeneralSettings';
import { AddressBookSettings } from './settings/AddressBookSettings';

type Tab = 'themes' | 'wallpapers' | 'general' | 'autofill';

interface SettingsPanelProps {
  open: boolean;
  onClose: () => void;
  onWallpaperChange?: () => void;
  onSignIn?: () => Promise<void>;
  onSignOut?: () => Promise<void>;
}

export function SettingsPanel({ open, onClose, onWallpaperChange }: SettingsPanelProps) {
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
    if (next.bgMode === 'wallpaper') onWallpaperChange?.();
  }, [onWallpaperChange]);

  const saveWallpapers = useCallback(async (next: WallpapersManifest) => {
    setWallpapers(next);
    await storage.setWallpapers({ ...next, updatedAt: new Date().toISOString() });
    if (settings && next.activeIds.length > 0 && settings.bgMode !== 'wallpaper') {
      const updated = { ...settings, bgMode: 'wallpaper' as const };
      setSettings(updated);
      await storage.setSettings({ ...updated, updatedAt: new Date().toISOString() });
    }
    onWallpaperChange?.();
  }, [onWallpaperChange, settings]);

  async function handleDownloadData() {
    const [settings, quickLinks, notes, kindling, bookmarks, snippets, wallpapers] = await Promise.all([
      storage.getSettings(),
      storage.getQuickLinks(),
      storage.getNotes(),
      storage.getKindling(),
      storage.getBookmarks(),
      storage.getSnippets(),
      storage.getWallpapers(),
    ]);
    const data = {
      exportedAt: new Date().toISOString(),
      settings,
      quickLinks,
      notes,
      kindling,
      bookmarks,
      snippets,
      wallpapers,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'lumina-export.json';
    a.click();
    URL.revokeObjectURL(url);
  }

  const [systemDark, setSystemDark] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia('(prefers-color-scheme: dark)').matches : true
  );
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e: MediaQueryListEvent) => setSystemDark(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  const isDark = settings?.panelTheme === 'system' ? systemDark : (settings?.panelTheme ?? 'dark') === 'dark';
  const t = useMemo(() => isDark ? DARK_TOKENS : LIGHT_TOKENS, [isDark]);

  if (!open) return null;

  return (
    <div style={{
      ...panelStyle,
      background: t.panelBg,
    }}>
        <div style={{ ...panelHeaderStyle, borderBottom: `1px solid ${t.borderSubtle}` }}>
          <span style={{ ...panelTitleStyle, color: t.textStrong }}>Settings</span>
          <div style={headerActionsStyle}>
            <button
              style={{ ...iconBtnStyle, color: t.textMuted, borderColor: t.border }}
              onClick={handleDownloadData}
              title="Download local data"
              aria-label="Download local data"
            >
              <DownloadSvg />
            </button>
            <button style={{ ...iconBtnStyle, color: t.textMuted, borderColor: t.border }} onClick={onClose} title="Close">
              <CloseSvg />
            </button>
          </div>
        </div>

        <div style={{ ...tabBarStyle, borderBottom: `1px solid ${t.borderSubtle}` }}>
          {TABS.map(tab => (
            <button
              key={tab.id}
              style={{
                ...tabBtnStyle,
                background: activeTab === tab.id ? t.accentBg : 'transparent',
                borderBottom: activeTab === tab.id ? `2px solid ${t.accent}` : '2px solid transparent',
                color: activeTab === tab.id ? t.accentText : t.textMuted,
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

          {activeTab === 'autofill' && (
            <section>
              <SectionTitle>Auto-fill Forms</SectionTitle>
              <p style={sectionDescStyle}>Manage address profiles for one-click form filling via context menu.</p>
              <AddressBookSettings />
            </section>
          )}
        </div>
      </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h3 style={sectionTitleStyle}>{children}</h3>;
}

const TABS: { id: Tab; label: string }[] = [
  { id: 'themes', label: 'Themes' },
  { id: 'wallpapers', label: 'Wallpapers' },
  { id: 'general', label: 'General' },
  { id: 'autofill', label: 'Autofill' },
];

const panelStyle: React.CSSProperties = {
  width: '100%',
  height: '100%',
  background: 'rgba(14,10,28,0.97)',
  backdropFilter: 'blur(20px)',
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
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

const headerActionsStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
};

const iconBtnStyle: React.CSSProperties = {
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

interface ThemeTokens {
  panelBg: string;
  border: string;
  borderSubtle: string;
  textStrong: string;
  textMuted: string;
  accent: string;
  accentBg: string;
  accentText: string;
}

const DARK_TOKENS: ThemeTokens = {
  panelBg: 'rgba(14,10,28,0.97)',
  border: 'rgba(255,255,255,0.1)',
  borderSubtle: 'rgba(255,255,255,0.07)',
  textStrong: 'rgba(255,255,255,0.85)',
  textMuted: 'rgba(255,255,255,0.5)',
  accent: 'rgba(167,139,250,0.7)',
  accentBg: 'rgba(167,139,250,0.15)',
  accentText: '#c4b5fd',
};

const LIGHT_TOKENS: ThemeTokens = {
  panelBg: 'rgba(250,248,255,0.98)',
  border: 'rgba(0,0,0,0.1)',
  borderSubtle: 'rgba(0,0,0,0.06)',
  textStrong: 'rgba(15,10,30,0.9)',
  textMuted: 'rgba(15,10,30,0.5)',
  accent: 'rgba(109,72,220,0.7)',
  accentBg: 'rgba(109,72,220,0.1)',
  accentText: '#6d48dc',
};

function CloseSvg() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <line x1="18" y1="6" x2="6" y2="18"/>
      <line x1="6" y1="6" x2="18" y2="18"/>
    </svg>
  );
}

function DownloadSvg() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
      <polyline points="7 10 12 15 17 10"/>
      <line x1="12" y1="15" x2="12" y2="3"/>
    </svg>
  );
}
