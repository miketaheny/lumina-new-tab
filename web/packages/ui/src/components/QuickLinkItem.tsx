import React from 'react';
import { Favicon } from './Favicon';
import { Heroicon } from './Heroicon';
import type { QuickLink } from '@lumina/core';

interface QuickLinkItemProps {
  link: QuickLink;
  iconsOnly: boolean;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onDragStart: (e: React.DragEvent, id: string) => void;
  onDragOver: (e: React.DragEvent, id: string) => void;
  onDrop: (e: React.DragEvent, id: string) => void;
  isDragOver: boolean;
}

function getFaviconBgColor(faviconBg?: string): string | undefined {
  if (faviconBg === 'dark') return 'rgba(20,15,40,0.75)';
  if (faviconBg === 'transparent') return 'transparent';
  return undefined;
}

export function QuickLinkItem({
  link,
  iconsOnly,
  onEdit,
  onDelete,
  onDragStart,
  onDragOver,
  onDrop,
  isDragOver,
}: QuickLinkItemProps) {
  const bgOverride = getFaviconBgColor(link.faviconBg);
  const displayLabel = link.label || getUrlLabel(link.url);

  if (iconsOnly) {
    return (
      <a
        href={link.url}
        draggable
        onDragStart={e => onDragStart(e, link.id)}
        onDragOver={e => onDragOver(e, link.id)}
        onDrop={e => onDrop(e, link.id)}
        style={{
          ...iconOnlyItemStyle,
          outline: isDragOver ? '2px solid rgba(167,139,250,0.5)' : undefined,
          outlineOffset: isDragOver ? 2 : undefined,
        }}
        title={displayLabel}
      >
        <div style={{ ...faviconWrapStyle, background: bgOverride ?? 'rgba(255,255,255,0.08)' }}>
          {link.iconName
            ? <Heroicon name={link.iconName} size={24} />
            : <Favicon url={link.url} label={displayLabel} size={36} bgOverride={bgOverride} />
          }
        </div>
        <div style={iconOnlyLabelStyle}>{displayLabel}</div>
        <div style={iconOnlyActionsStyle} className="ql-hover-actions">
          <button
            style={actionBtnStyle}
            title="Edit"
            onClick={e => { e.preventDefault(); e.stopPropagation(); onEdit(link.id); }}
          >
            <EditSvg />
          </button>
          <button
            style={{ ...actionBtnStyle, color: '#f87171' }}
            title="Delete"
            onClick={e => { e.preventDefault(); e.stopPropagation(); onDelete(link.id); }}
          >
            <TrashSvg />
          </button>
        </div>
      </a>
    );
  }

  return (
    <a
      href={link.url}
      draggable
      onDragStart={e => onDragStart(e, link.id)}
      onDragOver={e => onDragOver(e, link.id)}
      onDrop={e => onDrop(e, link.id)}
      style={{
        ...listItemStyle,
        background: isDragOver ? 'rgba(167,139,250,0.1)' : listItemStyle.background,
        borderColor: isDragOver ? 'rgba(167,139,250,0.35)' : listItemStyle.borderColor,
      }}
    >
      <span style={dragHandleStyle} title="Drag to reorder">⠿</span>

      <div style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
        {link.iconName
          ? (
            <div style={{
              width: 28,
              height: 28,
              borderRadius: 8,
              background: bgOverride ?? 'rgba(255,255,255,0.08)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'rgba(255,255,255,0.75)',
              flexShrink: 0,
            }}>
              <Heroicon name={link.iconName} size={15} />
            </div>
          )
          : <Favicon url={link.url} label={displayLabel} size={28} bgOverride={bgOverride} />
        }
      </div>

      <div style={infoStyle}>
        <div style={listLabelStyle}>{displayLabel}</div>
      </div>

      <div style={listActionsStyle} className="ql-hover-actions">
        <button
          style={actionBtnStyle}
          title="Open in new tab"
          onClick={e => { e.preventDefault(); e.stopPropagation(); window.open(link.url, '_blank'); }}
        >
          <NewTabSvg />
        </button>
        <button
          style={actionBtnStyle}
          title="Copy URL"
          onClick={e => { e.preventDefault(); e.stopPropagation(); navigator.clipboard.writeText(link.url); }}
        >
          <CopySvg />
        </button>
        <button
          style={actionBtnStyle}
          title="Edit"
          onClick={e => { e.preventDefault(); e.stopPropagation(); onEdit(link.id); }}
        >
          <EditSvg />
        </button>
        <button
          style={{ ...actionBtnStyle, color: '#f87171' }}
          title="Delete"
          onClick={e => { e.preventDefault(); e.stopPropagation(); onDelete(link.id); }}
        >
          <TrashSvg />
        </button>
      </div>
    </a>
  );
}

function getUrlLabel(url: string): string {
  try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return url; }
}

const listItemStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  padding: '5px 3px',
  borderRadius: 9,
  background: 'transparent',
  border: '1px solid transparent',
  textDecoration: 'none',
  color: 'rgba(255,255,255,0.75)',
  cursor: 'pointer',
  transition: 'background 0.15s, border-color 0.15s',
  position: 'relative',
};

const dragHandleStyle: React.CSSProperties = {
  display: 'none',
  color: 'rgba(255,255,255,0.2)',
  fontSize: 12,
  cursor: 'grab',
  flexShrink: 0,
  userSelect: 'none',
};

const infoStyle: React.CSSProperties = {
  flex: 1,
  minWidth: 0,
};

const listLabelStyle: React.CSSProperties = {
  fontSize: 14,
  fontWeight: 550,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
};

const listActionsStyle: React.CSSProperties = {
  display: 'flex',
  gap: 2,
  opacity: 0,
  transition: 'opacity 0.15s',
  flexShrink: 0,
};

const iconOnlyItemStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: 4,
  padding: '8px 6px',
  borderRadius: 12,
  textDecoration: 'none',
  color: 'rgba(255,255,255,0.75)',
  cursor: 'pointer',
  position: 'relative',
  transition: 'background 0.15s',
  width: 68,
};

const faviconWrapStyle: React.CSSProperties = {
  width: 44,
  height: 44,
  borderRadius: 12,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: 'rgba(255,255,255,0.7)',
  overflow: 'hidden',
};

const iconOnlyLabelStyle: React.CSSProperties = {
  fontSize: 10,
  textAlign: 'center',
  color: 'rgba(255,255,255,0.55)',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
  maxWidth: 64,
};

const iconOnlyActionsStyle: React.CSSProperties = {
  position: 'absolute',
  top: 2,
  right: 2,
  display: 'flex',
  gap: 2,
  opacity: 0,
  transition: 'opacity 0.15s',
};

const actionBtnStyle: React.CSSProperties = {
  background: 'rgba(0,0,0,0.35)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 6,
  padding: 4,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
  color: 'rgba(255,255,255,0.55)',
  transition: 'color 0.15s, background 0.15s',
};

function NewTabSvg() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
      <polyline points="15 3 21 3 21 9"/>
      <line x1="10" y1="14" x2="21" y2="3"/>
    </svg>
  );
}

function CopySvg() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
    </svg>
  );
}

function EditSvg() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
    </svg>
  );
}

function TrashSvg() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <polyline points="3 6 5 6 21 6"/>
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
    </svg>
  );
}
