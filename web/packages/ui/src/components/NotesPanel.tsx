import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { storage } from '@lumina/core';
import type { Note, LuminaSettings } from '@lumina/core';
import { NoteEditor } from './NoteEditor';

interface NotesPanelProps {
  open: boolean;
  onClose: () => void;
}

function uniqueTitle(notes: Note[], base = 'untitled'): string {
  const titles = new Set(notes.map(n => n.title));
  if (!titles.has(base)) return base;
  let i = 1;
  while (titles.has(`${base} ${i}`)) i++;
  return `${base} ${i}`;
}

export function NotesPanel({
  open,
  onClose,
}: NotesPanelProps) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);
  const [editorContent, setEditorContent] = useState('');
  const pendingContentRef = useRef<Map<string, string>>(new Map());
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [panelTheme, setPanelTheme] = useState<LuminaSettings['panelTheme']>('dark');

  const [systemDark, setSystemDark] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia('(prefers-color-scheme: dark)').matches : true
  );
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e: MediaQueryListEvent) => setSystemDark(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  const isDark = panelTheme === 'system' ? systemDark : panelTheme === 'dark';
  const t = useMemo(() => isDark ? DARK_TOKENS : LIGHT_TOKENS, [isDark]);

  useEffect(() => {
    if (!open) return;
    Promise.all([storage.getNotes(), storage.getSettings()]).then(([ns, settings]) => {
      const loaded = ns.length > 0 ? ns : [{ id: 'note-default', title: 'Notes', content: '', sortOrder: 0, updatedAt: new Date().toISOString() }];
      setNotes(loaded);
      setPanelTheme(settings.panelTheme ?? 'dark');
      const activeId = settings.activeNoteId ?? loaded[0].id;
      setActiveNoteId(activeId);
      const note = loaded.find(n => n.id === activeId) ?? loaded[0];
      setEditorContent(note?.content ?? '');
    });
  }, [open]);

  const saveNotes = useCallback(async (nextNotes: Note[], _dirtyIds?: string[]) => {
    const stamped = nextNotes.map(n => ({ ...n, updatedAt: new Date().toISOString() }));
    await storage.setNotes(stamped);
  }, []);

  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flushNote = useCallback((noteId: string, notesSnapshot?: Note[]) => {
    const markdown = pendingContentRef.current.get(noteId);
    if (markdown === undefined) return;
    pendingContentRef.current.delete(noteId);
    const source = notesSnapshot ?? notes;
    const next = source.map(n => n.id === noteId ? { ...n, content: markdown } : n);
    setNotes(next);
    saveNotes(next, [noteId]);
  }, [notes, saveNotes]);

  const handleContentChange = useCallback((markdown: string) => {
    if (!activeNoteId) return;
    pendingContentRef.current.set(activeNoteId, markdown);
    setNotes(prev => prev.map(n => n.id === activeNoteId ? { ...n, content: markdown } : n));
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(() => {
      autoSaveTimer.current = null;
      flushNote(activeNoteId);
    }, 2000);
  }, [activeNoteId, flushNote]);

  const handleSave = useCallback(() => {
    if (!activeNoteId) return;
    if (autoSaveTimer.current) { clearTimeout(autoSaveTimer.current); autoSaveTimer.current = null; }
    flushNote(activeNoteId);
  }, [activeNoteId, flushNote]);

  function switchNote(id: string) {
    if (autoSaveTimer.current) { clearTimeout(autoSaveTimer.current); autoSaveTimer.current = null; }
    if (activeNoteId) {
      flushNote(activeNoteId);
    }
    setActiveNoteId(id);
    setNotes(prev => {
      const note = prev.find(n => n.id === id);
      setEditorContent(note?.content ?? '');
      return prev;
    });
    storage.getSettings().then(s => {
      storage.setSettings({ ...s, activeNoteId: id, updatedAt: new Date().toISOString() });
    });
  }

  function addNote() {
    const id = `note-${Date.now()}`;
    setNotes(prev => {
      const title = uniqueTitle(prev);
      const newNote: Note = { id, title, content: '', sortOrder: prev.length, updatedAt: new Date().toISOString() };
      const next = [...prev, newNote];
      saveNotes(next, [id]);
      setActiveNoteId(id);
      setEditorContent('');
      storage.getSettings().then(s => {
        storage.setSettings({ ...s, activeNoteId: id, updatedAt: new Date().toISOString() });
      });
      return next;
    });
  }

  function deleteNote(id: string) {
    setNotes(prev => {
      if (prev.length <= 1) return prev;
      if (!window.confirm('Delete this note?')) return prev;
      const idx = prev.findIndex(n => n.id === id);
      const next = prev.filter(n => n.id !== id);
      if (id === activeNoteId) {
        const newActive = next[Math.max(0, idx - 1)];
        setActiveNoteId(newActive.id);
        setEditorContent(newActive.content ?? '');
        storage.getSettings().then(s => {
          storage.setSettings({ ...s, activeNoteId: newActive.id, updatedAt: new Date().toISOString() });
        });
      }
      saveNotes(next);
      return next;
    });
  }

  function renameNote(id: string, title: string) {
    setNotes(prev => {
      const next = prev.map(n => n.id === id ? { ...n, title } : n);
      saveNotes(next, [id]);
      return next;
    });
  }

  function startRename(note: Note) {
    setRenamingId(note.id);
    setRenameValue(note.title);
  }

  function commitRename(note: Note) {
    const val = renameValue.trim();
    if (val && val !== note.title) {
      const duplicate = notes.some(n => n.id !== note.id && n.title === val);
      if (!duplicate) renameNote(note.id, val);
    }
    setRenamingId(null);
  }

  const activeNote = notes.find(n => n.id === activeNoteId);

  if (!open) return null;

  return (
    <div style={{
      ...panelStyle,
      background: t.panelBg,
    }}>
      {/* Panel header */}
      <div style={{ ...panelHeaderStyle, borderBottom: `1px solid ${t.borderSubtle}` }}>
        <div style={{ ...headerTitleStyle, color: t.textStrong }}>
          Notes
        </div>
        <div style={notePickerStyle}>
          {notes.map(note => {
            const active = note.id === activeNoteId;
            const isRenaming = renamingId === note.id;
            return (
              <div
                key={note.id}
                style={{
                  ...noteChipStyle,
                  ...(active ? noteChipActiveStyle : {}),
                  color: active ? t.accentText : t.textMuted,
                }}
                onDoubleClick={() => startRename(note)}
                onClick={() => { if (!isRenaming) switchNote(note.id); }}
              >
                {isRenaming ? (
                  <input
                    style={renameInputStyle}
                    value={renameValue}
                    onChange={e => setRenameValue(e.target.value)}
                    onBlur={() => commitRename(note)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') { e.preventDefault(); commitRename(note); }
                      if (e.key === 'Escape') setRenamingId(null);
                    }}
                    onClick={e => e.stopPropagation()}
                    autoFocus
                  />
                ) : (
                  <span style={noteChipLabelStyle} title="Double-click to rename">
                    {note.title}
                  </span>
                )}
                {notes.length > 1 && active && !isRenaming && (
                  <button
                    style={noteChipDeleteStyle}
                    title="Delete note"
                    onClick={e => { e.stopPropagation(); deleteNote(note.id); }}
                  >
                    ×
                  </button>
                )}
              </div>
            );
          })}
        </div>
        <button style={{ ...headerIconBtnStyle, color: t.textMuted, borderLeftColor: t.borderSubtle }} onClick={addNote} title="New note">
          +
        </button>
        <button style={{ ...closeBtnStyle, color: t.textMuted, borderLeftColor: t.borderSubtle }} onClick={onClose} title="Close">
          <CloseSvg />
        </button>
      </div>

      <div style={tabContentStyle}>
        {activeNote ? (
          <NoteEditor
            key={activeNote.id}
            content={editorContent}
            onChange={handleContentChange}
            onSave={handleSave}
          />
        ) : (
          <div style={emptyStyle}>No notes yet. Click + to create one.</div>
        )}
      </div>
    </div>
  );
}

const panelStyle: React.CSSProperties = {
  width: '100%',
  height: '100%',
  background: 'rgba(8,7,20,0.97)',
  backdropFilter: 'blur(18px)',
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
};

const panelHeaderStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'stretch',
  borderBottom: '1px solid rgba(255,255,255,0.07)',
  flexShrink: 0,
  minHeight: 46,
};

const headerTitleStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  padding: '0 22px',
  fontSize: 11,
  fontWeight: 500,
  fontFamily: 'Inter, sans-serif',
  flexShrink: 0,
};

const notePickerStyle: React.CSSProperties = {
  flex: 1,
  minWidth: 0,
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  overflowX: 'auto',
  scrollbarWidth: 'none',
  msOverflowStyle: 'none' as const,
};

const noteChipStyle: React.CSSProperties = {
  height: 26,
  maxWidth: 150,
  display: 'flex',
  alignItems: 'center',
  gap: 4,
  padding: '0 10px',
  border: '1px solid transparent',
  borderRadius: 9,
  background: 'transparent',
  cursor: 'pointer',
  flexShrink: 0,
  fontFamily: 'Inter, sans-serif',
};

const noteChipActiveStyle: React.CSSProperties = {
  background: 'rgba(124,93,196,0.28)',
  borderColor: 'rgba(157,129,220,0.46)',
};

const noteChipLabelStyle: React.CSSProperties = {
  fontSize: 10,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
};

const noteChipDeleteStyle: React.CSSProperties = {
  width: 15,
  height: 15,
  borderRadius: 3,
  border: 'none',
  background: 'transparent',
  color: 'rgba(255,255,255,0.32)',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: 13,
  padding: 0,
  lineHeight: 1,
  flexShrink: 0,
};

const renameInputStyle: React.CSSProperties = {
  background: 'rgba(255,255,255,0.07)',
  border: '1px solid rgba(167,139,250,0.5)',
  borderRadius: 4,
  color: 'rgba(255,255,255,0.9)',
  fontSize: 10,
  fontFamily: 'Inter, sans-serif',
  padding: '1px 5px',
  width: 84,
  outline: 'none',
};

const headerIconBtnStyle: React.CSSProperties = {
  width: 34,
  height: '100%',
  border: 'none',
  background: 'transparent',
  color: 'rgba(255,255,255,0.35)',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  borderLeft: '1px solid rgba(255,255,255,0.07)',
  flexShrink: 0,
  fontSize: 15,
  lineHeight: 1,
};

const closeBtnStyle: React.CSSProperties = {
  width: 42,
  height: '100%',
  border: 'none',
  background: 'transparent',
  color: 'rgba(255,255,255,0.35)',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  borderLeft: '1px solid rgba(255,255,255,0.07)',
  flexShrink: 0,
};

const tabContentStyle: React.CSSProperties = {
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  minHeight: 0,
  overflow: 'hidden',
};

const emptyStyle: React.CSSProperties = {
  flex: 1,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: 'rgba(255,255,255,0.25)',
  fontSize: 13,
  fontFamily: 'Inter, sans-serif',
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
  panelBg: 'rgba(8,7,20,0.97)',
  border: 'rgba(255,255,255,0.1)',
  borderSubtle: 'rgba(255,255,255,0.07)',
  textStrong: 'rgba(255,255,255,0.82)',
  textMuted: 'rgba(255,255,255,0.4)',
  accent: 'rgba(167,139,250,0.7)',
  accentBg: 'rgba(167,139,250,0.08)',
  accentText: '#c4b5fd',
};

const LIGHT_TOKENS: ThemeTokens = {
  panelBg: 'rgba(250,248,255,0.98)',
  border: 'rgba(0,0,0,0.1)',
  borderSubtle: 'rgba(0,0,0,0.06)',
  textStrong: 'rgba(15,10,30,0.9)',
  textMuted: 'rgba(15,10,30,0.45)',
  accent: 'rgba(109,72,220,0.7)',
  accentBg: 'rgba(109,72,220,0.08)',
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
