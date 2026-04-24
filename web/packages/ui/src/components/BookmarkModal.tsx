import React, { useState, useEffect, useRef } from 'react';
import type { BookmarkNode, BookmarksData } from '@lumina/core';

interface BookmarkModalProps {
  mode: 'add-bookmark' | 'edit-bookmark' | 'add-folder' | 'edit-folder';
  parentId: string | null;
  node?: BookmarkNode;
  data: BookmarksData;
  onSave: (data: BookmarksData) => void;
  onClose: () => void;
}

function generateId() {
  return `bm-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function findNode(roots: BookmarkNode[], id: string): BookmarkNode | null {
  for (const n of roots) {
    if (n.id === id) return n;
    if (n.children) {
      const found = findNode(n.children, id);
      if (found) return found;
    }
  }
  return null;
}

function upsertNode(roots: BookmarkNode[], parentId: string | null, node: BookmarkNode): BookmarkNode[] {
  if (!parentId) return [...roots, node];
  return roots.map(n => {
    if (n.id === parentId) {
      return { ...n, children: [...(n.children ?? []), node] };
    }
    if (n.children) {
      return { ...n, children: upsertNode(n.children, parentId, node) };
    }
    return n;
  });
}

function updateNode(roots: BookmarkNode[], id: string, patch: Partial<BookmarkNode>): BookmarkNode[] {
  return roots.map(n => {
    if (n.id === id) return { ...n, ...patch };
    if (n.children) return { ...n, children: updateNode(n.children, id, patch) };
    return n;
  });
}

export function BookmarkModal({ mode, parentId, node, data, onSave, onClose }: BookmarkModalProps) {
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const titleRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (node) {
      setTitle(node.title ?? '');
      setUrl(node.url ?? '');
    }
    setTimeout(() => titleRef.current?.focus(), 50);
  }, [node]);

  const isFolder = mode === 'add-folder' || mode === 'edit-folder';
  const isEdit = mode === 'edit-bookmark' || mode === 'edit-folder';

  function handleSave() {
    const trimTitle = title.trim();
    if (!trimTitle) return;
    let normalUrl = url.trim();
    if (!isFolder && normalUrl && !/^https?:\/\//i.test(normalUrl)) {
      normalUrl = 'https://' + normalUrl;
    }

    let nextRoots: BookmarkNode[];
    if (isEdit && node) {
      nextRoots = updateNode(data.roots, node.id, isFolder ? { title: trimTitle } : { title: trimTitle, url: normalUrl });
    } else {
      const newNode: BookmarkNode = {
        id: generateId(),
        parentId: parentId ?? null,
        type: isFolder ? 'folder' : 'bookmark',
        title: trimTitle,
        url: isFolder ? undefined : normalUrl,
        children: isFolder ? [] : undefined,
        sortOrder: 0,
      };
      nextRoots = upsertNode(data.roots, parentId, newNode);
    }
    onSave({ ...data, roots: nextRoots, updatedAt: new Date().toISOString() });
    onClose();
  }

  const heading = mode === 'add-bookmark' ? 'Add Bookmark'
    : mode === 'edit-bookmark' ? 'Edit Bookmark'
    : mode === 'add-folder' ? 'New Folder'
    : 'Rename Folder';

  return (
    <div style={overlayStyle} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={modalStyle}>
        <div style={modalHeaderStyle}>
          <span style={modalTitleStyle}>{heading}</span>
          <button style={iconBtnStyle} onClick={onClose} title="Cancel"><CloseSvg /></button>
        </div>
        <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <label style={labelStyle}>
            Title
            <input
              ref={titleRef}
              style={inputStyle}
              value={title}
              onChange={e => setTitle(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') onClose(); }}
              placeholder={isFolder ? 'Folder name' : 'Bookmark title'}
            />
          </label>
          {!isFolder && (
            <label style={labelStyle}>
              URL
              <input
                style={inputStyle}
                value={url}
                onChange={e => setUrl(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') onClose(); }}
                placeholder="https://example.com"
              />
            </label>
          )}
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 4 }}>
            <button style={cancelBtnStyle} onClick={onClose}>Cancel</button>
            <button style={saveBtnStyle} onClick={handleSave}>
              {isEdit ? 'Save Changes' : (isFolder ? 'Create Folder' : 'Add Bookmark')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export { findNode, updateNode, upsertNode };

const overlayStyle: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  zIndex: 200,
  background: 'rgba(0,0,0,0.55)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};

const modalStyle: React.CSSProperties = {
  width: 340,
  maxWidth: '90vw',
  background: 'rgba(20,15,40,0.98)',
  border: '1px solid rgba(255,255,255,0.12)',
  borderRadius: 14,
  boxShadow: '0 20px 60px rgba(0,0,0,0.7)',
  backdropFilter: 'blur(20px)',
};

const modalHeaderStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '16px 20px 12px',
  borderBottom: '1px solid rgba(255,255,255,0.07)',
};

const modalTitleStyle: React.CSSProperties = {
  fontSize: 14,
  fontWeight: 700,
  color: 'rgba(255,255,255,0.85)',
  fontFamily: 'Inter, sans-serif',
};

const labelStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 5,
  fontSize: 12,
  fontWeight: 600,
  color: 'rgba(255,255,255,0.5)',
  fontFamily: 'Inter, sans-serif',
};

const inputStyle: React.CSSProperties = {
  background: 'rgba(255,255,255,0.06)',
  border: '1px solid rgba(255,255,255,0.12)',
  borderRadius: 8,
  color: 'rgba(255,255,255,0.85)',
  fontSize: 13,
  fontFamily: 'Inter, sans-serif',
  padding: '8px 10px',
  outline: 'none',
  transition: 'border-color 0.15s',
};

const iconBtnStyle: React.CSSProperties = {
  width: 28,
  height: 28,
  borderRadius: 6,
  border: '1px solid rgba(255,255,255,0.1)',
  background: 'rgba(255,255,255,0.05)',
  color: 'rgba(255,255,255,0.45)',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};

const cancelBtnStyle: React.CSSProperties = {
  padding: '7px 14px',
  borderRadius: 8,
  border: '1px solid rgba(255,255,255,0.1)',
  background: 'rgba(255,255,255,0.05)',
  color: 'rgba(255,255,255,0.5)',
  fontSize: 12,
  fontFamily: 'Inter, sans-serif',
  cursor: 'pointer',
};

const saveBtnStyle: React.CSSProperties = {
  padding: '7px 14px',
  borderRadius: 8,
  border: '1px solid rgba(167,139,250,0.35)',
  background: 'rgba(167,139,250,0.15)',
  color: '#c4b5fd',
  fontSize: 12,
  fontFamily: 'Inter, sans-serif',
  cursor: 'pointer',
  fontWeight: 600,
};

function CloseSvg() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
    </svg>
  );
}
