import React, { useState, useEffect, useCallback, useRef } from 'react';
import { storage } from '@lumina/core';
import { markDirty, schedulePush } from '@lumina/drive';
import type { Note } from '@lumina/core';
import { NoteEditor } from './NoteEditor';
import { NoteTabBar } from './NoteTabBar';

export type NotesPanelTab = 'notes' | 'bookmarks' | 'kindling';

interface NotesPanelProps {
  open: boolean;
  onClose: () => void;
  activeTab: NotesPanelTab;
  onTabChange: (tab: NotesPanelTab) => void;
  bookmarksSlot?: React.ReactNode;
  kindlingSlot?: React.ReactNode;
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
}: NotesPanelProps) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);
  const [editorContent, setEditorContent] = useState('');
  const pendingContentRef = useRef<Map<string, string>>(new Map());

  useEffect(() => {
    if (!open) return;
    Promise.all([storage.getNotes(), storage.getSettings()]).then(([ns, settings]) => {
      const loaded = ns.length > 0 ? ns : [{ id: 'note-default', title: 'Notes', content: '', sortOrder: 0, updatedAt: new Date().toISOString() }];
      setNotes(loaded);
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

  return (
    <div style={{ ...panelStyle, transform: open ? 'translateX(0)' : 'translateX(100%)' }}>
      {/* Panel header */}
      <div style={panelHeaderStyle}>
        <div style={mainTabBarStyle}>
          {MAIN_TABS.map(tab => (
            <button
              key={tab.id}
              style={{
                ...mainTabBtnStyle,
                ...(activeTab === tab.id ? mainTabActivStyle : {}),
              }}
              onClick={() => onTabChange(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <button style={closeBtnStyle} onClick={onClose} title="Close">
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
          />
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
    </div>
  );
}

const MAIN_TABS: { id: NotesPanelTab; label: string }[] = [
  { id: 'notes', label: 'Notes' },
  { id: 'bookmarks', label: 'Bookmarks' },
  { id: 'kindling', label: 'Kindling' },
];

const panelStyle: React.CSSProperties = {
  position: 'fixed',
  right: 0,
  top: 0,
  bottom: 0,
  width: 'clamp(420px, 40vw, 800px)',
  maxWidth: '100vw',
  zIndex: 90,
  background: 'rgba(14,10,28,0.97)',
  borderLeft: '1px solid rgba(255,255,255,0.1)',
  backdropFilter: 'blur(20px)',
  display: 'flex',
  flexDirection: 'column',
  transition: 'transform 0.35s cubic-bezier(0.4,0,0.2,1)',
  boxShadow: '-4px 0 40px rgba(0,0,0,0.5)',
  pointerEvents: 'auto',
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

function CloseSvg() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <line x1="18" y1="6" x2="6" y2="18"/>
      <line x1="6" y1="6" x2="18" y2="18"/>
    </svg>
  );
}
