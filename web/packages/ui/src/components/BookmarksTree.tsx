import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { storage } from '@lumina/core';
import type { BookmarkNode, BookmarksData, QuickLinksData, QuickLink } from '@lumina/core';
import { BookmarkNodeComponent } from './BookmarkNode';
import { BookmarkModal } from './BookmarkModal';
import { BookmarkSyncModal } from './BookmarkSyncModal';
import { Favicon } from './Favicon';

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

function insertNode(roots: BookmarkNode[], targetFolderId: string | null, node: BookmarkNode): BookmarkNode[] {
  if (!targetFolderId) return [...roots, { ...node, parentId: null }];
  return roots.map(n => {
    if (n.id === targetFolderId) {
      return { ...n, children: [...(n.children ?? []), { ...node, parentId: targetFolderId }] };
    }
    if (n.children) return { ...n, children: insertNode(n.children, targetFolderId, node) };
    return n;
  });
}

function collectFolders(roots: BookmarkNode[], excludeId: string, depth = 0): Array<{ node: BookmarkNode; depth: number }> {
  const result: Array<{ node: BookmarkNode; depth: number }> = [];
  for (const n of roots) {
    if (n.type !== 'folder' || n.id === excludeId) continue;
    result.push({ node: n, depth });
    if (n.children) result.push(...collectFolders(n.children, excludeId, depth + 1));
  }
  return result;
}

type ModalState =
  | { type: 'add-folder'; parentId: string }
  | { type: 'edit-folder'; node: BookmarkNode }
  | { type: 'edit-bookmark'; node: BookmarkNode }
  | null;

export function BookmarksTree() {
  const [data, setData] = useState<BookmarksData>({ roots: [], updatedAt: '' });
  const [quickLinks, setQuickLinks] = useState<QuickLinksData | null>(null);
  const [collapsed, setCollapsed] = useState<Set<string>>(loadCollapsed);
  const [qlCollapsed, setQlCollapsed] = useState(false);
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState<ModalState>(null);
  const [showImport, setShowImport] = useState(false);
  const [moveNode, setMoveNode] = useState<BookmarkNode | null>(null);
  const [showExport, setShowExport] = useState(false);

  useEffect(() => {
    storage.getBookmarks().then(setData);
    storage.getQuickLinks().then(setQuickLinks);
  }, []);

  const persist = useCallback(async (next: BookmarksData) => {
    setData(next);
    await storage.setBookmarks(next);
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

  function handleImportNodes(nodes: BookmarkNode[]) {
    const nextRoots = [...data.roots];
    for (const node of nodes) {
      nextRoots.push({ ...node, parentId: null, sortOrder: nextRoots.length });
    }
    persist({ ...data, roots: nextRoots, updatedAt: new Date().toISOString() });
    setShowImport(false);
  }

  function handleMoveToFolder(targetFolderId: string | null) {
    if (!moveNode) return;
    const stripped = removeNode(data.roots, moveNode.id);
    const updated = insertNode(stripped, targetFolderId, moveNode);
    persist({ ...data, roots: updated, updatedAt: new Date().toISOString() });
    setMoveNode(null);
  }

  function exportAsMarkdown() {
    const lines: string[] = [];
    if (quickLinks?.links.length) {
      lines.push('## Quick Links', '');
      const sections = quickLinks.sections ?? [];
      const grouped = new Map<string, typeof quickLinks.links>();
      for (const l of quickLinks.links) {
        const arr = grouped.get(l.section) ?? [];
        arr.push(l);
        grouped.set(l.section, arr);
      }
      for (const [secId, links] of grouped) {
        const sec = sections.find(s => s.id === secId);
        if (sec) lines.push(`### ${sec.label}`, '');
        for (const l of links) lines.push(`- [${l.label}](${l.url})`);
        lines.push('');
      }
    }
    if (data.roots.length) {
      lines.push('## Bookmarks', '');
      const renderTree = (nodes: BookmarkNode[], indent: string) => {
        for (const n of nodes) {
          if (n.type === 'bookmark') {
            lines.push(`${indent}- [${n.title}](${n.url})`);
          } else {
            lines.push(`${indent}- **${n.title}**/`);
            if (n.children) renderTree(n.children, indent + '  ');
          }
        }
      };
      renderTree(data.roots, '');
    }
    navigator.clipboard.writeText(lines.join('\n'));
    setShowExport(false);
  }

  function exportAsPlainText() {
    const lines: string[] = [];
    if (quickLinks?.links.length) {
      lines.push('Quick Links', '---');
      for (const l of quickLinks.links) lines.push(`${l.label}: ${l.url}`);
      lines.push('');
    }
    if (data.roots.length) {
      lines.push('Bookmarks', '---');
      const renderTree = (nodes: BookmarkNode[], indent: string) => {
        for (const n of nodes) {
          if (n.type === 'bookmark') {
            lines.push(`${indent}${n.title}: ${n.url}`);
          } else {
            lines.push(`${indent}[${n.title}]`);
            if (n.children) renderTree(n.children, indent + '  ');
          }
        }
      };
      renderTree(data.roots, '');
    }
    navigator.clipboard.writeText(lines.join('\n'));
    setShowExport(false);
  }

  function exportAsAppleNotes() {
    const lines: string[] = [];
    if (quickLinks?.links.length) {
      lines.push('Quick Links', '');
      for (const l of quickLinks.links) lines.push(`${l.label}\n${l.url}\n`);
    }
    if (data.roots.length) {
      lines.push('Bookmarks', '');
      const renderTree = (nodes: BookmarkNode[], indent: string) => {
        for (const n of nodes) {
          if (n.type === 'bookmark') {
            lines.push(`${indent}${n.title}\n${indent}${n.url}\n`);
          } else {
            lines.push(`${indent}${n.title}`);
            if (n.children) renderTree(n.children, indent + '  ');
          }
        }
      };
      renderTree(data.roots, '');
    }
    navigator.clipboard.writeText(lines.join('\n'));
    setShowExport(false);
  }

  const query = search.trim().toLowerCase();
  const visible = useMemo(() => {
    if (!query) return data.roots;
    return data.roots.map(r => filterTree(r, query)).filter(Boolean) as BookmarkNode[];
  }, [data.roots, query]);

  const filteredQuickLinks = useMemo(() => {
    if (!quickLinks) return [];
    if (!query) return quickLinks.links;
    return quickLinks.links.filter(l => `${l.label} ${l.url}`.toLowerCase().includes(query));
  }, [quickLinks, query]);

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
          title="Export bookmarks"
          onClick={() => setShowExport(true)}
        >
          <ExportSvg />
          <span style={{ fontSize: 11 }}>Export</span>
        </button>
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
        {filteredQuickLinks.length > 0 && (
          <div style={qlSectionStyle}>
            <div
              style={qlHeaderStyle}
              onClick={() => setQlCollapsed(v => !v)}
            >
              <span style={{ ...qlChevronStyle, transform: qlCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)' }}>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="6 9 12 15 18 9"/>
                </svg>
              </span>
              <span style={qlTitleStyle}>Quick Links</span>
              <span style={qlCountStyle}>{filteredQuickLinks.length}</span>
            </div>
            {!qlCollapsed && (
              <div style={qlListStyle}>
                {filteredQuickLinks.map(link => (
                  <a
                    key={link.id}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={qlItemStyle}
                    title={link.url}
                  >
                    <Favicon url={link.url} label={link.label} size={12} />
                    <span style={qlLabelStyle}>{link.label}</span>
                  </a>
                ))}
              </div>
            )}
          </div>
        )}

        {visible.length === 0 && filteredQuickLinks.length === 0 ? (
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
              onMove={setMoveNode}
            />
          ))
        )}
      </div>

      {showImport && (
        <BookmarkSyncModal
          onImport={handleImportNodes}
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
      {showExport && (
        <div style={moveOverlayStyle} onClick={e => { if (e.target === e.currentTarget) setShowExport(false); }}>
          <div style={moveModalStyle}>
            <div style={moveHeaderStyle}>
              <span style={moveTitleStyle}>Export Bookmarks</span>
              <button style={moveCloseBtnStyle} onClick={() => setShowExport(false)}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
            <div style={moveBodyStyle}>
              <button style={exportOptionBtnStyle} onClick={exportAsMarkdown}>Markdown</button>
              <button style={exportOptionBtnStyle} onClick={exportAsAppleNotes}>Apple Notes</button>
              <button style={exportOptionBtnStyle} onClick={exportAsPlainText}>Plain Text</button>
            </div>
          </div>
        </div>
      )}
      {moveNode && (
        <div style={moveOverlayStyle} onClick={e => { if (e.target === e.currentTarget) setMoveNode(null); }}>
          <div style={moveModalStyle}>
            <div style={moveHeaderStyle}>
              <span style={moveTitleStyle}>Move "{moveNode.title}"</span>
              <button style={moveCloseBtnStyle} onClick={() => setMoveNode(null)}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
            <div style={moveBodyStyle}>
              <button
                style={moveFolderBtnStyle}
                onClick={() => handleMoveToFolder(null)}
              >
                Root
              </button>
              {collectFolders(data.roots, moveNode.id).map(({ node: f, depth }) => (
                <button
                  key={f.id}
                  style={{ ...moveFolderBtnStyle, paddingLeft: 12 + depth * 14 }}
                  onClick={() => handleMoveToFolder(f.id)}
                >
                  {f.title}
                </button>
              ))}
            </div>
          </div>
        </div>
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

const qlSectionStyle: React.CSSProperties = {
  marginBottom: 6,
  borderBottom: '1px solid rgba(255,255,255,0.06)',
  paddingBottom: 6,
};

const qlHeaderStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 5,
  padding: '4px 10px',
  cursor: 'pointer',
  userSelect: 'none',
};

const qlChevronStyle: React.CSSProperties = {
  width: 12,
  height: 12,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: 'rgba(255,255,255,0.4)',
  transition: 'transform 0.15s',
  flexShrink: 0,
};

const qlTitleStyle: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 700,
  color: 'rgba(255,255,255,0.5)',
  fontFamily: 'Inter, sans-serif',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
};

const qlCountStyle: React.CSSProperties = {
  fontSize: 10,
  color: 'rgba(255,255,255,0.25)',
  fontFamily: 'Inter, sans-serif',
};

const qlListStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 1,
  padding: '2px 0',
};

const qlItemStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 6,
  padding: '3px 10px 3px 27px',
  borderRadius: 5,
  textDecoration: 'none',
  color: 'rgba(255,255,255,0.6)',
  fontSize: 12,
  fontFamily: 'Inter, sans-serif',
};

const qlLabelStyle: React.CSSProperties = {
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
};

const moveOverlayStyle: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  zIndex: 200,
  background: 'rgba(0,0,0,0.55)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};

const moveModalStyle: React.CSSProperties = {
  width: 300,
  maxWidth: '90vw',
  maxHeight: '60vh',
  display: 'flex',
  flexDirection: 'column',
  background: 'rgba(20,15,40,0.98)',
  border: '1px solid rgba(255,255,255,0.12)',
  borderRadius: 14,
  boxShadow: '0 20px 60px rgba(0,0,0,0.7)',
  backdropFilter: 'blur(20px)',
};

const moveHeaderStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '14px 16px 10px',
  borderBottom: '1px solid rgba(255,255,255,0.07)',
  flexShrink: 0,
};

const moveTitleStyle: React.CSSProperties = {
  fontSize: 13,
  fontWeight: 700,
  color: 'rgba(255,255,255,0.85)',
  fontFamily: 'Inter, sans-serif',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
};

const moveCloseBtnStyle: React.CSSProperties = {
  width: 26,
  height: 26,
  borderRadius: 6,
  border: '1px solid rgba(255,255,255,0.1)',
  background: 'rgba(255,255,255,0.05)',
  color: 'rgba(255,255,255,0.45)',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0,
};

const moveBodyStyle: React.CSSProperties = {
  flex: 1,
  overflowY: 'auto',
  padding: '8px 10px',
  display: 'flex',
  flexDirection: 'column',
  gap: 2,
};

const moveFolderBtnStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  padding: '7px 12px',
  borderRadius: 7,
  border: '1px solid rgba(255,255,255,0.06)',
  background: 'transparent',
  color: 'rgba(255,255,255,0.7)',
  fontSize: 12,
  fontFamily: 'Inter, sans-serif',
  cursor: 'pointer',
  textAlign: 'left',
};

const exportOptionBtnStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  padding: '9px 14px',
  borderRadius: 8,
  border: '1px solid rgba(255,255,255,0.08)',
  background: 'rgba(255,255,255,0.04)',
  color: 'rgba(255,255,255,0.7)',
  fontSize: 12,
  fontFamily: 'Inter, sans-serif',
  cursor: 'pointer',
  textAlign: 'left',
};

function SearchSvg() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
    </svg>
  );
}
function ExportSvg() {
  return (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
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
