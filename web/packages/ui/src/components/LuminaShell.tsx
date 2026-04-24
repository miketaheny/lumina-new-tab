import React, { useCallback, useRef, useState } from 'react';
import styles from './LuminaShell.module.css';

const MIN_PANEL = 360;
const MAX_PANEL = 900;

interface LuminaShellProps {
  children?: React.ReactNode;
  panel?: React.ReactNode;
  canvasSlot?: React.ReactNode;
  panelOpen?: boolean;
  panelWidth?: number;
  onPanelWidthChange?: (width: number) => void;
  wallpaperUrl?: string;
  showGrain?: boolean;
}

export function LuminaShell({
  children,
  panel,
  canvasSlot,
  panelOpen = false,
  panelWidth = 520,
  onPanelWidthChange,
  wallpaperUrl,
  showGrain = true,
}: LuminaShellProps) {
  const dragging = useRef(false);
  const [localWidth, setLocalWidth] = useState(panelWidth);
  const width = panelOpen ? localWidth : 0;

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    dragging.current = true;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, []);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragging.current) return;
    const next = Math.min(MAX_PANEL, Math.max(MIN_PANEL, window.innerWidth - e.clientX));
    setLocalWidth(next);
  }, []);

  const onPointerUp = useCallback((e: React.PointerEvent) => {
    if (!dragging.current) return;
    dragging.current = false;
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    const next = Math.min(MAX_PANEL, Math.max(MIN_PANEL, window.innerWidth - e.clientX));
    setLocalWidth(next);
    onPanelWidthChange?.(next);
  }, [onPanelWidthChange]);

  // Sync prop → local when not dragging
  if (panelWidth !== localWidth && !dragging.current) {
    setLocalWidth(panelWidth);
  }

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

      <div className={styles.splitContainer}>
        <main
          id="app"
          className={styles.app}
          style={panelOpen ? { marginRight: 0, maxWidth: 'none' } : undefined}
        >
          {children}
        </main>

        {panelOpen && (
          <>
            <div
              className={styles.dragHandle}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
            />
            <aside className={styles.panel} style={{ width }}>
              {panel}
            </aside>
          </>
        )}
      </div>
    </div>
  );
}
