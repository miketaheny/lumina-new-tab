import React, { useState } from 'react';
import type { Note } from '@lumina/core';

interface NoteTabBarProps {
  notes: Note[];
  activeNoteId: string | null;
  onSwitch: (id: string) => void;
  onAdd: () => void;
  onDelete: (id: string) => void;
  onRename: (id: string, title: string) => void;
  onClearCompleted?: () => void;
}

export function NoteTabBar({ notes, activeNoteId, onSwitch, onAdd, onDelete, onRename, onClearCompleted }: NoteTabBarProps) {
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');

  function startRename(note: Note) {
    setRenamingId(note.id);
    setRenameValue(note.title);
  }

  function commitRename(note: Note) {
    const val = renameValue.trim();
    if (val && val !== note.title) {
      const duplicate = notes.some(n => n.id !== note.id && n.title === val);
      if (!duplicate) onRename(note.id, val);
    }
    setRenamingId(null);
  }

  return (
    <div style={tabBarStyle}>
      <div style={tabsScrollStyle}>
        {notes.map(note => {
          const active = note.id === activeNoteId;
          const isRenaming = renamingId === note.id;
          return (
            <div
              key={note.id}
              style={{
                ...tabStyle,
                ...(active ? tabActiveStyle : {}),
              }}
              onDoubleClick={() => startRename(note)}
              onClick={() => { if (!isRenaming) onSwitch(note.id); }}
            >
              {isRenaming ? (
                <input
                  style={renameInputStyle}
                  value={renameValue}
                  onChange={e => setRenameValue(e.target.value)}
                  onBlur={() => commitRename(note)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') { e.preventDefault(); commitRename(note); }
                    if (e.key === 'Escape') { setRenamingId(null); }
                  }}
                  onClick={e => e.stopPropagation()}
                  autoFocus
                />
              ) : (
                <span style={tabLabelStyle} title="Double-click to rename">
                  {note.title}
                </span>
              )}
              {notes.length > 1 && !isRenaming && (
                <button
                  style={tabDelBtnStyle}
                  title="Delete note"
                  onClick={e => { e.stopPropagation(); onDelete(note.id); }}
                >
                  ×
                </button>
              )}
            </div>
          );
        })}
      </div>
      {onClearCompleted && (
        <button style={actionBtnStyle} title="Clear completed checklist items" onClick={onClearCompleted}>
          <ClearDoneSvg />
        </button>
      )}
      <button style={actionBtnStyle} title="New note" onClick={onAdd}>+</button>
    </div>
  );
}

const tabBarStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  borderBottom: '1px solid rgba(255,255,255,0.07)',
  flexShrink: 0,
  minHeight: 34,
  background: 'rgba(8,7,20,0.48)',
  padding: '0 18px',
};

const tabsScrollStyle: React.CSSProperties = {
  display: 'flex',
  flex: 1,
  overflowX: 'auto',
  gap: 8,
  scrollbarWidth: 'none',
  msOverflowStyle: 'none' as const,
};

const tabStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 4,
  padding: '0 10px',
  height: 24,
  cursor: 'pointer',
  border: '1px solid transparent',
  borderRadius: 8,
  flexShrink: 0,
  transition: 'background 0.1s',
  background: 'transparent',
  userSelect: 'none',
};

const tabActiveStyle: React.CSSProperties = {
  background: 'rgba(124,93,196,0.28)',
  borderColor: 'rgba(157,129,220,0.46)',
};

const tabLabelStyle: React.CSSProperties = {
  fontSize: 10,
  fontFamily: 'Inter, sans-serif',
  color: 'rgba(255,255,255,0.68)',
  whiteSpace: 'nowrap',
  maxWidth: 120,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
};

const tabDelBtnStyle: React.CSSProperties = {
  width: 16,
  height: 16,
  borderRadius: 3,
  border: 'none',
  background: 'transparent',
  color: 'rgba(255,255,255,0.3)',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: 14,
  padding: 0,
  lineHeight: 1,
  flexShrink: 0,
};

const actionBtnStyle: React.CSSProperties = {
  width: 22,
  height: 22,
  margin: '0 2px',
  borderRadius: 6,
  border: '1px solid rgba(255,255,255,0.1)',
  background: 'transparent',
  color: 'rgba(255,255,255,0.45)',
  cursor: 'pointer',
  fontSize: 14,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0,
  lineHeight: 1,
  padding: 0,
};

function ClearDoneSvg() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
      <line x1="4" y1="22" x2="22" y2="4" strokeWidth="1.5" stroke="currentColor" opacity="0.5"/>
    </svg>
  );
}

const renameInputStyle: React.CSSProperties = {
  background: 'rgba(255,255,255,0.07)',
  border: '1px solid rgba(167,139,250,0.5)',
  borderRadius: 4,
  color: 'rgba(255,255,255,0.9)',
  fontSize: 12,
  fontFamily: 'Inter, sans-serif',
  padding: '1px 5px',
  width: 90,
  outline: 'none',
};
