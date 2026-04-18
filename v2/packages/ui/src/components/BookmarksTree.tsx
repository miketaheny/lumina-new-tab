import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { storage } from '@lumina/core';
import { markDirty, schedulePush } from '@lumina/drive';
import type { BookmarkNode, BookmarksData } from '@lumina/core';
import { BookmarkNodeComponent } from './BookmarkNode';
import { BookmarkModal } from './BookmarkModal';
import { BookmarkSyncModal } from './BookmarkSyncModal';

const COLLAPSED_KEY = 'lumina_bm_v2_collapsed';

function loadCollapsed(): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(COLLAPSED_KEY) ?? '[]') as string[]);
  } catch {
    return new Set();
  }
}

function saveCollapsed(set: Set<string>) {
  localStorage.setItem(COLLAPSED_KEY, JSON.stringify([...set]));
}

function filterTree(node: BookmarkNode, query: string): BookmarkNode | null {
  if (node.type === 'bookmark') {
    const hay = `${node.title ?? ''} ${node.url ?? ''}`.toLowerCase();
    return hay.includes(query) ? { ...node } : null;
  }
  const kids = (node.children ?? []).map(c => filterTree(c, query)).filter(Boolean) as BookmarkNode[];
  if (!kids.length) return null;
  return { ...node, children: kids };
}

function removeNode(roots: BookmarkNode[], id: string): BookmarkNode[] {
  return roots
    .filter(n => n.id !== id)
    .map(n => n.children ? { ...n, children: removeNode(n.children, id) } : n);
}

type ModalState =
  | { type: 'add-folder'; parentId: string }
  | { type: 'edit-folder'; node: BookmarkNode }
  | { type: 'edit-bookmark'; node: BookmarkNode }
  | null;

export function BookmarksTree() {
  const [data, setData] = useState<BookmarksData>({ roots: [], updatedAt: '' });
  const [collapsed, setCollapsed] = useState<Set<string>>(loadCollapsed);
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState<ModalState>(null);
  const [showImport, setShowImport] = useState(false);

  useEffect(() => {
    storage.getBookmarks().then(setData);
  }, []);

  const persist = useCallback(async (next: BookmarksData) => {
    setData(next);
    await storage.setBookmarks(next);
    await markDirty('bookmarks');
    schedulePush();
  }, []);

  function toggleCollapsed(id: string) {
    setCollapsed(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      saveCollapsed(next);
      return next;
    });
  }

  function handleDeleteFolder(node: BookmarkNode) {
    const count = (node.children ?? []).length;
    const msg = count
      ? `Delete folder "${node.title}" and all ${count} items inside?`
      : `Delete folder "${node.title}"?`;
    if (!window.confirm(msg)) return;
    persist({ ...data, roots: removeNode(data.roots, node.id), updatedAt: new Date().toISOString() });
  }

  function handleDeleteBookmark(node: BookmarkNode) {
    if (!window.confirm(`Delete "${node.title || node.url}"?`)) return;
    persist({ ...data, roots: removeNode(data.roots, node.id), updatedAt: new Date().toISOString() });
  }

  function handleImportLinks(links: { url: string; label: string }[]) {
    const folderId = `bm-folder-${Date.now()}`;
    const imported: BookmarkNode[] = links.map((l, i) => ({
      id: `bm-import-${Date.now()}-${i}`,
      parentId: folderId,
      type: 'bookmark' as const,
      title: l.label,
      url: l.url,
      sortOrder: i,
    }));
    const folder: BookmarkNode = {
      id: folderId,
      parentId: null,
      type: 'folder',
      title: 'Imported Bookmarks',
      children: imported,
      sortOrder: data.roots.length,
    };
    persist({ ...data, roots: [...data.roots, folder], updatedAt: new Date().toISOString() });
    setShowImport(false);
  }

  const query = search.trim().toLowerCase();
  const visible = useMemo(() => {
    if (!query) return data.roots;
    return data.roots.map(r => filterTree(r, query)).filter(Boolean) as BookmarkNode[];
  }, [data.roots, query]);

  return (
    <div style={containerStyle}>
      <div style={searchRowStyle}>
        <div style={searchWrapStyle}>
          <SearchSvg />
          <input
            style={searchInputStyle}
            placeholder="Search bookmarks…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <button
          style={addBtnStyle}
          title="Import from Chrome"
          onClick={() => setShowImport(true)}
        >
          <ImportSvg />
          <span style={{ fontSize: 11 }}>Import</span>
        </button>
        <button
          style={addBtnStyle}
          title="Add bookmark to root"
          onClick={() => setModal({ type: 'add-folder', parentId: '' })}
        >
          <PlusSvg />
          <span style={{ fontSize: 11 }}>Folder</span>
        </button>
      </div>

      <div style={treeStyle}>
        {visible.length === 0 ? (
          <div style={emptyStyle}>
            {query ? 'No bookmarks match.' : 'No bookmarks yet.'}
          </div>
        ) : (
          visible.map(root => (
            <BookmarkNodeComponent
              key={root.id}
              node={root}
              depth={0}
              collapsed={collapsed}
              onToggle={toggleCollapsed}
              onAddFolder={parentId => setModal({ type: 'add-folder', parentId })}
              onEditFolder={node => setModal({ type: 'edit-folder', node })}
              onDeleteFolder={handleDeleteFolder}
              onEditBookmark={node => setModal({ type: 'edit-bookmark', node })}
              onDeleteBookmark={handleDeleteBookmark}
            />
          ))
        )}
      </div>

      {showImport && (
        <BookmarkSyncModal
          onImport={handleImportLinks}
          onClose={() => setShowImport(false)}
        />
      )}
      {modal && (
        <BookmarkModal
          mode={
            modal.type === 'add-folder' ? 'add-folder'
            : modal.type === 'edit-folder' ? 'edit-folder'
            : 'edit-bookmark'
          }
          parentId={modal.type === 'add-folder' ? (modal.parentId || null) : null}
          node={modal.type !== 'add-folder' ? modal.node : undefined}
          data={data}
          onSave={persist}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
}

const containerStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  flex: 1,
  minHeight: 0,
  overflow: 'hidden',
};

const searchRowStyle: React.CSSProperties = {
  display: 'flex',
  gap: 8,
  padding: '10px 12px 8px',
  flexShrink: 0,
  borderBottom: '1px solid rgba(255,255,255,0.06)',
};

const searchWrapStyle: React.CSSProperties = {
  flex: 1,
  display: 'flex',
  alignItems: 'center',
  gap: 6,
  background: 'rgba(255,255,255,0.05)',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: 8,
  padding: '5px 9px',
  color: 'rgba(255,255,255,0.3)',
};

const searchInputStyle: React.CSSProperties = {
  flex: 1,
  background: 'none',
  border: 'none',
  outline: 'none',
  color: 'rgba(255,255,255,0.75)',
  fontSize: 12,
  fontFamily: 'Inter, sans-serif',
};

const addBtnStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 4,
  padding: '0 10px',
  height: 30,
  borderRadius: 8,
  border: '1px solid rgba(255,255,255,0.1)',
  background: 'rgba(255,255,255,0.05)',
  color: 'rgba(255,255,255,0.5)',
  cursor: 'pointer',
  fontSize: 11,
  fontFamily: 'Inter, sans-serif',
  flexShrink: 0,
};

const treeStyle: React.CSSProperties = {
  flex: 1,
  overflowY: 'auto',
  padding: '6px 4px',
};

const emptyStyle: React.CSSProperties = {
  padding: '24px 16px',
  textAlign: 'center',
  color: 'rgba(255,255,255,0.25)',
  fontSize: 12,
  fontFamily: 'Inter, sans-serif',
};

function SearchSvg() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
    </svg>
  );
}
function ImportSvg() {
  return (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
    </svg>
  );
}
function PlusSvg() {
  return (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
    </svg>
  );
}
