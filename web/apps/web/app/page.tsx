'use client';

import { useState, useEffect, useCallback } from 'react';
import { storage, type LuminaSettings, DEFAULT_SETTINGS, BING_DAILY_WALLPAPER_URL } from '@lumina/core';
import {
  LuminaShell, BackgroundCanvas, Clock, SearchBar,
  QuickLinks, FocusLine, Weather, BibleVerse,
  SettingsPanel, NotesPanel, Toast, SetupWizard,
} from '@lumina/ui';
import { LuminaProviders } from './providers';

type ViewId = 'dashboard' | 'notes' | 'settings';

function LuminaApp() {
  const [settings, setSettings] = useState<LuminaSettings>(DEFAULT_SETTINGS);
  const [activeView, setActiveView] = useState<ViewId>('dashboard');
  const [showWizard, setShowWizard] = useState(false);
  const [wallpaperUrl, setWallpaperUrl] = useState<string | undefined>();
  const [wallpaperKey, setWallpaperKey] = useState(0);
  const [isWideLayout, setIsWideLayout] = useState(true);

  useEffect(() => {
    storage.getSettings().then(setSettings);
  }, []);

  useEffect(() => {
    const updateLayout = () => setIsWideLayout(window.innerWidth >= 920);
    updateLayout();
    window.addEventListener('resize', updateLayout);
    return () => window.removeEventListener('resize', updateLayout);
  }, []);

  useEffect(() => {
    function handleEsc(e: KeyboardEvent) {
      if (e.key === 'Escape') setActiveView('dashboard');
    }
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, []);

  useEffect(() => {
    if (settings.bgMode !== 'wallpaper') {
      setWallpaperUrl(undefined);
      return;
    }
    let revoked = false;
    (async () => {
      const manifest = await storage.getWallpapers();
      const active = manifest.wallpapers.filter(w => manifest.activeIds.includes(w.id));
      if (!active.length) return;
      const pick = active[Math.floor(Math.random() * active.length)];
      const blob = await storage.getWallpaperBlob(pick.id);
      if (blob && !revoked) {
        setWallpaperUrl(url => {
          if (url) URL.revokeObjectURL(url);
          return URL.createObjectURL(blob);
        });
        return;
      }
      const remoteUrl = pick.bingUrl ?? (pick.source === 'bing' ? BING_DAILY_WALLPAPER_URL : undefined);
      if (remoteUrl && !revoked) {
        setWallpaperUrl(url => {
          if (url && url.startsWith('blob:')) URL.revokeObjectURL(url);
          return remoteUrl;
        });
      }
    })();
    return () => { revoked = true; };
  }, [settings.bgMode, wallpaperKey]);

  const handleDirty = useCallback(async () => {
    const updated = await storage.getSettings();
    setSettings(updated);
  }, []);

  const renderDashboard = () => (
    <>
      {settings.showClock && (
        <Clock
          greetingName={settings.greetingName}
          greetingCustom={settings.greetingCustom}
          greetingCustomText={settings.greetingCustomText}
        />
      )}
      <FocusLine focusLines={settings.focusLines} focusText={settings.focusText} />
      <SearchBar searchEngine={settings.searchEngine} />
      <QuickLinks onDirty={handleDirty} />
      <BibleVerse showQuote={settings.showQuote} />
      <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 8 }}>
        <Weather
          postalCode={settings.postalCode}
          weatherUnit={settings.weatherUnit}
          useGeoLocation={settings.useGeoLocation}
        />
      </div>
    </>
  );

  return (
    <LuminaShell
      canvasSlot={settings.bgMode !== 'wallpaper' ? (
        <BackgroundCanvas
          themes={settings.themes}
          animate={settings.animateBg}
          intensity={settings.intensity}
        />
      ) : undefined}
      wallpaperUrl={wallpaperUrl}
      showGrain={settings.showGrain}
    >
      {activeView === 'dashboard' && renderDashboard()}

      {activeView === 'notes' && (
        <div style={notesPageFrameStyle(isWideLayout)}>
          {isWideLayout && <div style={notesDashboardStyle}>{renderDashboard()}</div>}
          <div style={notesPageStyle(isWideLayout)}>
            <NotesPanel
              open
              onClose={() => setActiveView('dashboard')}
            />
          </div>
        </div>
      )}

      {activeView === 'settings' && (
        <div style={fullPageStyle}>
          <SettingsPanel
            open
            onWallpaperChange={() => {
              storage.getSettings().then(setSettings);
              setWallpaperKey(k => k + 1);
            }}
            onClose={() => {
              setActiveView('dashboard');
              storage.getSettings().then(setSettings);
              setWallpaperKey(k => k + 1);
            }}
          />
        </div>
      )}

      <Toast />
      {showWizard && (
        <SetupWizard
          hasV1Data={false}
          onMigrate={async () => {}}
          onFinish={() => setShowWizard(false)}
        />
      )}
      <div style={bottomNavStyle}>
        <button
          onClick={() => setActiveView('dashboard')}
          style={{
            ...fabStyle,
            ...(activeView === 'dashboard' ? fabActiveStyle : {}),
          }}
          title="Dashboard"
          aria-label="Show dashboard page"
        >
          <HomeSvg />
        </button>
        <button
          onClick={() => setActiveView('notes')}
          style={{
            ...fabStyle,
            ...(activeView === 'notes' ? fabActiveStyle : {}),
          }}
          title="Notes"
          aria-label="Show notes page"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14 2 14 8 20 8"/>
          </svg>
        </button>
        <button
          onClick={() => setActiveView('settings')}
          style={{
            ...fabStyle,
            ...(activeView === 'settings' ? fabActiveStyle : {}),
          }}
          title="Settings"
          aria-label="Show settings page"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3"/>
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
          </svg>
        </button>
      </div>
    </LuminaShell>
  );
}

const fullPageStyle: React.CSSProperties = {
  width: 'min(1120px, 100%)',
  height: 'calc(100vh - 92px)',
  marginTop: 24,
  marginBottom: 68,
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: 14,
  overflow: 'hidden',
  boxShadow: '0 24px 80px rgba(0,0,0,0.35)',
};

const notesPageFrameStyle = (isWide: boolean): React.CSSProperties => ({
  position: 'fixed',
  inset: 0,
  display: 'grid',
  gridTemplateColumns: isWide ? 'minmax(0, 1fr) clamp(520px, 32vw, 660px)' : 'minmax(0, 1fr)',
  zIndex: 3,
});

const notesDashboardStyle: React.CSSProperties = {
  minWidth: 0,
  height: '100vh',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  padding: '8px 64px 64px',
};

const notesPageStyle = (isWide: boolean): React.CSSProperties => ({
  height: '100vh',
  minWidth: 0,
  borderLeft: isWide ? '1px solid rgba(148,163,184,0.24)' : 'none',
  background: 'rgba(8,7,20,0.96)',
  boxShadow: isWide ? '-24px 0 80px rgba(0,0,0,0.28)' : 'none',
  overflow: 'hidden',
});

const bottomNavStyle: React.CSSProperties = {
  position: 'fixed',
  bottom: 16,
  right: 16,
  display: 'flex',
  gap: 8,
  zIndex: 10,
};

const fabStyle: React.CSSProperties = {
  width: 36,
  height: 36,
  borderRadius: 10,
  border: '1px solid rgba(255,255,255,0.15)',
  background: 'rgba(255,255,255,0.08)',
  color: 'rgba(255,255,255,0.6)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
  backdropFilter: 'blur(8px)',
};

const fabActiveStyle: React.CSSProperties = {
  background: 'rgba(167,139,250,0.2)',
  borderColor: 'rgba(167,139,250,0.42)',
  color: 'rgba(255,255,255,0.88)',
};

function HomeSvg() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 11L12 3l9 8"/>
      <path d="M5 10v10h14V10"/>
      <path d="M9 20v-6h6v6"/>
    </svg>
  );
}

export default function Home() {
  return (
    <LuminaProviders>
      <LuminaApp />
    </LuminaProviders>
  );
}
