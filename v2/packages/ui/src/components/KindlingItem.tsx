import React from 'react';
import type { KindlingItem, KindlingTag } from '@lumina/core';
import { Favicon } from './Favicon';

interface KindlingItemProps {
  item: KindlingItem;
  tags: KindlingTag[];
  onToggleRead: (id: string) => void;
  onEdit: (item: KindlingItem) => void;
  onDelete: (id: string) => void;
  onCopy: (url: string) => void;
}

export function KindlingItemRow({ item, tags, onToggleRead, onEdit, onDelete, onCopy }: KindlingItemProps) {
  return (
    <a
      href={item.url}
      target="_blank"
      rel="noopener noreferrer"
      style={{ ...itemStyle, opacity: item.readAt ? 0.55 : 1 }}
      onClick={e => {
        // Allow default link behavior but don't bubble to parent
      }}
    >
      <div style={faviconWrapStyle}>
        <Favicon url={item.url} label={item.title} size={16} />
      </div>
      <div style={infoStyle}>
        <div style={{ ...itemTitleStyle, textDecoration: item.readAt ? 'line-through' : 'none' }}>
          {item.title}
        </div>
        <div style={domainStyle}>{getDomain(item.url)}</div>
        {item.tags.length > 0 && (
          <div style={tagsRowStyle}>
            {item.tags.map(tagName => {
              const tag = tags.find(t => t.name === tagName);
              const color = tag?.color ?? '#a78bfa';
              return (
                <span
                  key={tagName}
                  style={{
                    ...tagChipStyle,
                    background: `${color}22`,
                    color,
                    borderColor: `${color}44`,
                  }}
                >
                  {tagName}
                </span>
              );
            })}
          </div>
        )}
      </div>
      <div style={actionsStyle} onClick={e => e.preventDefault()}>
        <button
          style={actBtnStyle}
          title={item.readAt ? 'Mark unread' : 'Mark read'}
          onClick={e => { e.preventDefault(); e.stopPropagation(); onToggleRead(item.id); }}
        >
          <CheckSvg filled={!!item.readAt} />
        </button>
        <button
          style={actBtnStyle}
          title="Edit"
          onClick={e => { e.preventDefault(); e.stopPropagation(); onEdit(item); }}
        >
          <EditSvg />
        </button>
        <button
          style={actBtnStyle}
          title="Copy URL"
          onClick={e => { e.preventDefault(); e.stopPropagation(); onCopy(item.url); }}
        >
          <CopySvg />
        </button>
        <button
          style={actBtnStyle}
          title="Remove"
          onClick={e => { e.preventDefault(); e.stopPropagation(); onDelete(item.id); }}
        >
          <DeleteSvg />
        </button>
      </div>
    </a>
  );
}

function getDomain(url: string): string {
  try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return url; }
}

const itemStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'flex-start',
  gap: 10,
  padding: '9px 12px',
  borderBottom: '1px solid rgba(255,255,255,0.04)',
  textDecoration: 'none',
  color: 'inherit',
  transition: 'background 0.1s',
};

const faviconWrapStyle: React.CSSProperties = {
  width: 22,
  height: 22,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: 'rgba(255,255,255,0.08)',
  borderRadius: 5,
  flexShrink: 0,
  marginTop: 1,
};

const infoStyle: React.CSSProperties = {
  flex: 1,
  minWidth: 0,
};

const itemTitleStyle: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 500,
  color: 'rgba(255,255,255,0.82)',
  fontFamily: 'Inter, sans-serif',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
};

const domainStyle: React.CSSProperties = {
  fontSize: 11,
  color: 'rgba(255,255,255,0.3)',
  fontFamily: 'Inter, sans-serif',
  marginTop: 1,
};

const tagsRowStyle: React.CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: 4,
  marginTop: 4,
};

const tagChipStyle: React.CSSProperties = {
  fontSize: 10,
  padding: '1px 7px',
  borderRadius: 10,
  border: '1px solid',
  fontFamily: 'Inter, sans-serif',
};

const actionsStyle: React.CSSProperties = {
  display: 'flex',
  gap: 2,
  flexShrink: 0,
  alignItems: 'flex-start',
};

const actBtnStyle: React.CSSProperties = {
  width: 22,
  height: 22,
  borderRadius: 5,
  border: '1px solid rgba(255,255,255,0.07)',
  background: 'rgba(255,255,255,0.04)',
  color: 'rgba(255,255,255,0.35)',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 0,
};

function CheckSvg({ filled }: { filled: boolean }) {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
      <polyline points="22 4 12 14.01 9 11.01"/>
    </svg>
  );
}
function EditSvg() {
  return (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
    </svg>
  );
}
function CopySvg() {
  return (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
    </svg>
  );
}
function DeleteSvg() {
  return (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6"/>
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
    </svg>
  );
}
