import React, { useState, useEffect, useCallback } from 'react';
import ReactDOM from 'react-dom/client';
import { storage, type LuminaSettings, DEFAULT_SETTINGS } from '@lumina/core';
import { setAuthProvider, setupSyncListeners, onSyncStatus } from '@lumina/drive';
import {
  LuminaShell, BackgroundCanvas, Clock, SearchBar,
  QuickLinks, FocusLine, Weather, BibleVerse,
  SettingsPanel, NotesPanel, BookmarksTree, KindlingPanel,
  Toast, SetupWizard,
} from '@lumina/ui';
import '@lumina/ui/src/styles/globals.css';
import { extensionAuthProvider } from '../../lib/extension-auth-provider';

setAuthProvider(extensionAuthProvider);

type PanelId = 'settings' | 'notes' | null;

function NewTab() {
  const [settings, setSettings] = useState<LuminaSettings>(DEFAULT_SETTINGS);
  const [activePanel, setActivePanel] = useState<PanelId>(null);
  const [notesTab, setNotesTab] = useState<'notes' | 'bookmarks' | 'kindling'>('notes');
  const [ready, setReady] = useState(false);
  const [showWizard, setShowWizard] = useState(false);

  useEffect(() => {
    storage.getSettings().then((s) => {
      setSettings(s);
      setReady(true);
    });
    const cleanupSync = setupSyncListeners();
    const cleanupStatus = onSyncStatus(() => {});
    return () => {
      cleanupSync();
      cleanupStatus();
    };
  }, []);

  const handleDirty = useCallback(async () => {
    const updated = await storage.getSettings();
    setSettings(updated);
  }, []);

  const togglePanel = (panel: PanelId) => {
    setActivePanel(prev => prev === panel ? null : panel);
  };

  if (!ready) return null;

  return (
    <LuminaShell
      panelOpen={activePanel !== null}
      panel={
        <>
          <SettingsPanel
            open={activePanel === 'settings'}
            onClose={() => setActivePanel(null)}
          />
          <NotesPanel
            open={activePanel === 'notes'}
            onClose={() => setActivePanel(null)}
            activeTab={notesTab}
            onTabChange={setNotesTab}
            bookmarksSlot={<BookmarksTree />}
            kindlingSlot={<KindlingPanel />}
          />
        </>
      }
      canvasSlot={settings.bgMode !== 'wallpaper' ? (
        <BackgroundCanvas
          themes={settings.themes}
          animate={settings.animateBg}
          intensity={settings.intensity}
        />
      ) : undefined}
      showGrain={settings.showGrain}
    >
      {settings.showClock && <Clock />}
      <FocusLine focusLines={settings.focusLines} focusText={settings.focusText} />
      <SearchBar searchEngine={settings.searchEngine} />
      <QuickLinks onDirty={handleDirty} />
      <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 8 }}>
        <BibleVerse showQuote={settings.showQuote} />
        <Weather
          postalCode={settings.postalCode}
          weatherUnit={settings.weatherUnit}
          useGeoLocation={settings.useGeoLocation}
        />
      </div>
      <Toast />
      {showWizard && (
        <SetupWizard
          hasV1Data={false}
          onMigrate={async () => {}}
          onSignIn={async () => {}}
          onFinish={() => setShowWizard(false)}
        />
      )}
      <div style={{ position: 'fixed', bottom: 16, right: 16, display: 'flex', gap: 8, zIndex: 10 }}>
        <button
          onClick={() => togglePanel('notes')}
          style={fabStyle}
          title="Notes"
          aria-label="Toggle notes panel"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14 2 14 8 20 8"/>
          </svg>
        </button>
        <button
          onClick={() => togglePanel('settings')}
          style={fabStyle}
          title="Settings"
          aria-label="Toggle settings panel"
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

ReactDOM.createRoot(document.getElementById('root')!).render(<NewTab />);
