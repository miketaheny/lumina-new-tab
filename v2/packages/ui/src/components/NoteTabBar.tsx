import React, { useState } from 'react';
import type { Note } from '@lumina/core';

interface NoteTabBarProps {
  notes: Note[];
  activeNoteId: string | null;
  onSwitch: (id: string) => void;
  onAdd: () => void;
  onDelete: (id: string) => void;
  onRename: (id: string, title: string) => void;
}

export function NoteTabBar({ notes, activeNoteId, onSwitch, onAdd, onDelete, onRename }: NoteTabBarProps) {
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
      <button style={addBtnStyle} title="New note" onClick={onAdd}>+</button>
    </div>
  );
}

const tabBarStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  borderBottom: '1px solid rgba(255,255,255,0.07)',
  flexShrink: 0,
  minHeight: 36,
  background: 'rgba(0,0,0,0.15)',
};

const tabsScrollStyle: React.CSSProperties = {
  display: 'flex',
  flex: 1,
  overflowX: 'auto',
  scrollbarWidth: 'none',
  msOverflowStyle: 'none' as const,
};

const tabStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 4,
  padding: '0 10px',
  height: 36,
  cursor: 'pointer',
  borderRight: '1px solid rgba(255,255,255,0.05)',
  flexShrink: 0,
  transition: 'background 0.1s',
  background: 'transparent',
  userSelect: 'none',
};

const tabActiveStyle: React.CSSProperties = {
  background: 'rgba(167,139,250,0.12)',
  borderBottom: '2px solid rgba(167,139,250,0.7)',
};

const tabLabelStyle: React.CSSProperties = {
  fontSize: 12,
  fontFamily: 'Inter, sans-serif',
  color: 'rgba(255,255,255,0.65)',
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

const addBtnStyle: React.CSSProperties = {
  width: 32,
  height: 32,
  margin: '0 4px',
  borderRadius: 6,
  border: '1px solid rgba(255,255,255,0.1)',
  background: 'transparent',
  color: 'rgba(255,255,255,0.45)',
  cursor: 'pointer',
  fontSize: 18,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0,
  lineHeight: 1,
  padding: 0,
};

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
