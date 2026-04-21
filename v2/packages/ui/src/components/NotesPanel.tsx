import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { storage } from '@lumina/core';
import { markDirty, schedulePush } from '@lumina/drive';
import type { Note, LuminaSettings } from '@lumina/core';
import { NoteEditor, type NoteEditorHandle } from './NoteEditor';
import { NoteTabBar } from './NoteTabBar';

export type NotesPanelTab = 'notes' | 'bookmarks' | 'kindling' | 'snippets';

interface NotesPanelProps {
  open: boolean;
  onClose: () => void;
  activeTab: NotesPanelTab;
  onTabChange: (tab: NotesPanelTab) => void;
  bookmarksSlot?: React.ReactNode;
  kindlingSlot?: React.ReactNode;
  snippetsSlot?: React.ReactNode;
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
  activeTab,
  onTabChange,
  bookmarksSlot,
  kindlingSlot,
  snippetsSlot,
}: NotesPanelProps) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);
  const [editorContent, setEditorContent] = useState('');
  const editorRef = useRef<NoteEditorHandle>(null);
  const pendingContentRef = useRef<Map<string, string>>(new Map());
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

  const saveNotes = useCallback(async (nextNotes: Note[], dirtyIds?: string[]) => {
    const stamped = nextNotes.map(n => ({ ...n, updatedAt: new Date().toISOString() }));
    await storage.setNotes(stamped);
    const ids = dirtyIds ?? stamped.map(n => n.id);
    for (const id of ids) {
      await markDirty('notes', id);
    }
    schedulePush();
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

  const activeNote = notes.find(n => n.id === activeNoteId);

  if (!open) return null;

  return (
    <div style={{
      ...panelStyle,
      background: t.panelBg,
    }}>
      {/* Panel header */}
      <div style={{ ...panelHeaderStyle, borderBottom: `1px solid ${t.borderSubtle}` }}>
        <div style={mainTabBarStyle}>
          {MAIN_TABS.map(tab => (
            <button
              key={tab.id}
              style={{
                ...mainTabBtnStyle,
                color: activeTab === tab.id ? t.accentText : t.textMuted,
                background: activeTab === tab.id ? t.accentBg : 'transparent',
                borderBottomColor: activeTab === tab.id ? t.accent : 'transparent',
              }}
              onClick={() => onTabChange(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <button style={{ ...closeBtnStyle, color: t.textMuted, borderLeftColor: t.borderSubtle }} onClick={onClose} title="Close">
          <CloseSvg />
        </button>
      </div>

      {/* Notes tab */}
      {activeTab === 'notes' && (
        <div style={tabContentStyle}>
          <NoteTabBar
            notes={notes}
            activeNoteId={activeNoteId}
            onSwitch={switchNote}
            onAdd={addNote}
            onDelete={deleteNote}
            onRename={renameNote}
            onClearCompleted={() => editorRef.current?.clearCompleted()}
          />
          {activeNote ? (
            <NoteEditor
              ref={editorRef}
              key={activeNote.id}
              content={editorContent}
              onChange={handleContentChange}
              onSave={handleSave}
            />
          ) : (
            <div style={emptyStyle}>No notes yet. Click + to create one.</div>
          )}
        </div>
      )}

      {/* Bookmarks tab */}
      {activeTab === 'bookmarks' && (
        <div style={tabContentStyle}>
          {bookmarksSlot ?? <div style={emptyStyle}>Bookmarks not configured.</div>}
        </div>
      )}

      {/* Kindling tab */}
      {activeTab === 'kindling' && (
        <div style={tabContentStyle}>
          {kindlingSlot ?? <div style={emptyStyle}>Kindling not configured.</div>}
        </div>
      )}

      {/* Snippets tab */}
      {activeTab === 'snippets' && (
        <div style={tabContentStyle}>
          {snippetsSlot ?? <div style={emptyStyle}>Snippets not configured.</div>}
        </div>
      )}
    </div>
  );
}

const MAIN_TABS: { id: NotesPanelTab; label: string }[] = [
  { id: 'notes', label: 'Notes' },
  { id: 'bookmarks', label: 'Bookmarks' },
  { id: 'kindling', label: 'Kindling' },
  { id: 'snippets', label: 'Snippets' },
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
  alignItems: 'stretch',
  borderBottom: '1px solid rgba(255,255,255,0.07)',
  flexShrink: 0,
  minHeight: 44,
};

const mainTabBarStyle: React.CSSProperties = {
  display: 'flex',
  flex: 1,
};

const mainTabBtnStyle: React.CSSProperties = {
  flex: 1,
  border: 'none',
  background: 'transparent',
  color: 'rgba(255,255,255,0.4)',
  fontSize: 12,
  fontWeight: 600,
  fontFamily: 'Inter, sans-serif',
  cursor: 'pointer',
  padding: '0 4px',
  borderBottom: '2px solid transparent',
  transition: 'all 0.15s',
  letterSpacing: '0.02em',
};

const mainTabActivStyle: React.CSSProperties = {
  background: 'rgba(167,139,250,0.08)',
  borderBottomColor: 'rgba(167,139,250,0.7)',
  color: '#c4b5fd',
};

const closeBtnStyle: React.CSSProperties = {
  width: 36,
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
  panelBg: 'rgba(14,10,28,0.97)',
  border: 'rgba(255,255,255,0.1)',
  borderSubtle: 'rgba(255,255,255,0.07)',
  textStrong: 'rgba(255,255,255,0.85)',
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
