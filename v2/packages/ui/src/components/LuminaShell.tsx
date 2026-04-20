import React from 'react';
import styles from './LuminaShell.module.css';

interface LuminaShellProps {
  children?: React.ReactNode;
  panel?: React.ReactNode;
  canvasSlot?: React.ReactNode;
  panelOpen?: boolean;
  wallpaperUrl?: string;
  showGrain?: boolean;
}

export function LuminaShell({
  children,
  panel,
  canvasSlot,
  panelOpen = false,
  wallpaperUrl,
  showGrain = true,
}: LuminaShellProps) {
  return (
    <div className={styles.shell}>
      {canvasSlot}

      <div
        id="bg-wallpaper"
        className={styles.wallpaper}
        style={{
          opacity: wallpaperUrl ? 1 : 0,
          backgroundImage: wallpaperUrl ? `url(${wallpaperUrl})` : undefined,
        }}
      />

      {showGrain && <div className={styles.grain} />}

      <main
        id="app"
        className={`${styles.app}${panelOpen ? ` ${styles.appPanelOpen}` : ''}`}
      >
        {children}
      </main>

      {panel && (
        <aside className={styles.panel}>
          {panel}
        </aside>
      )}
    </div>
  );
}
