import React, { useState } from 'react';
import type { BookmarkNode as BookmarkNodeType, BookmarksData } from '@lumina/core';
import { Favicon } from './Favicon';

interface BookmarkNodeProps {
  node: BookmarkNodeType;
  depth?: number;
  collapsed: Set<string>;
  onToggle: (id: string) => void;
  onAddFolder: (parentId: string) => void;
  onEditFolder: (node: BookmarkNodeType) => void;
  onDeleteFolder: (node: BookmarkNodeType) => void;
  onEditBookmark: (node: BookmarkNodeType) => void;
  onDeleteBookmark: (node: BookmarkNodeType) => void;
}

const ROOT_IDS = new Set(['0', '1', '2', '3']);

export function BookmarkNodeComponent({
  node,
  depth = 0,
  collapsed,
  onToggle,
  onAddFolder,
  onEditFolder,
  onDeleteFolder,
  onEditBookmark,
  onDeleteBookmark,
}: BookmarkNodeProps) {
  const [hovered, setHovered] = useState(false);

  if (node.type === 'bookmark') {
    return (
      <div
        style={{ ...rowStyle, paddingLeft: 8 + depth * 14 }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        <span style={chevronEmptyStyle} />
        <span style={iconStyle}>
          <Favicon url={node.url ?? ''} label={node.title || node.url || ''} size={12} />
        </span>
        <a
          href={node.url}
          target="_blank"
          rel="noopener noreferrer"
          style={bookmarkLabelStyle}
          title={node.url}
          onClick={e => e.stopPropagation()}
        >
          {node.title || node.url}
        </a>
        {hovered && (
          <span style={actionsStyle}>
            <button style={actBtnStyle} title="Edit" onClick={e => { e.stopPropagation(); onEditBookmark(node); }}>
              <EditSvg />
            </button>
            <button style={actBtnStyle} title="Delete" onClick={e => { e.stopPropagation(); onDeleteBookmark(node); }}>
              <DeleteSvg />
            </button>
          </span>
        )}
      </div>
    );
  }

  // Folder
  const isCollapsed = collapsed.has(node.id);
  const hasChildren = (node.children ?? []).length > 0;
  const isRoot = ROOT_IDS.has(node.id);

  return (
    <div>
      <div
        style={{ ...rowStyle, paddingLeft: 8 + depth * 14, cursor: 'pointer' }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onClick={() => onToggle(node.id)}
      >
        <span style={{ ...chevronStyle, transform: isCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)', opacity: hasChildren ? 1 : 0.2 }}>
          <ChevronSvg />
        </span>
        <span style={{ ...iconStyle, color: 'rgba(255,255,255,0.45)' }}>
          <FolderSvg />
        </span>
        <span style={folderLabelStyle}>{node.title || '(unnamed folder)'}</span>
        {hovered && (
          <span style={actionsStyle} onClick={e => e.stopPropagation()}>
            <button style={actBtnStyle} title="New subfolder" onClick={() => onAddFolder(node.id)}>
              <PlusSvg />
            </button>
            {!isRoot && (
              <>
                <button style={actBtnStyle} title="Rename" onClick={() => onEditFolder(node)}>
                  <EditSvg />
                </button>
                <button style={actBtnStyle} title="Delete folder" onClick={() => onDeleteFolder(node)}>
                  <DeleteSvg />
                </button>
              </>
            )}
          </span>
        )}
      </div>
      {!isCollapsed && (node.children ?? []).length > 0 && (
        <div>
          {(node.children ?? []).map(child => (
            <BookmarkNodeComponent
              key={child.id}
              node={child}
              depth={depth + 1}
              collapsed={collapsed}
              onToggle={onToggle}
              onAddFolder={onAddFolder}
              onEditFolder={onEditFolder}
              onDeleteFolder={onDeleteFolder}
              onEditBookmark={onEditBookmark}
              onDeleteBookmark={onDeleteBookmark}
            />
          ))}
        </div>
      )}
    </div>
  );
}

const rowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 5,
  padding: '3px 10px 3px 8px',
  borderRadius: 5,
  userSelect: 'none',
};

const chevronStyle: React.CSSProperties = {
  width: 12,
  height: 12,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0,
  color: 'rgba(255,255,255,0.4)',
  transition: 'transform 0.15s',
};

const chevronEmptyStyle: React.CSSProperties = {
  width: 12,
  flexShrink: 0,
};

const iconStyle: React.CSSProperties = {
  width: 14,
  height: 14,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0,
};

const folderLabelStyle: React.CSSProperties = {
  flex: 1,
  fontSize: 12,
  fontFamily: 'Inter, sans-serif',
  color: 'rgba(255,255,255,0.7)',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
};

const bookmarkLabelStyle: React.CSSProperties = {
  flex: 1,
  fontSize: 12,
  fontFamily: 'Inter, sans-serif',
  color: 'rgba(255,255,255,0.6)',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
  textDecoration: 'none',
};

const actionsStyle: React.CSSProperties = {
  display: 'flex',
  gap: 2,
  flexShrink: 0,
};

const actBtnStyle: React.CSSProperties = {
  width: 20,
  height: 20,
  borderRadius: 4,
  border: '1px solid rgba(255,255,255,0.08)',
  background: 'rgba(255,255,255,0.05)',
  color: 'rgba(255,255,255,0.4)',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 0,
};

function ChevronSvg() {
  return (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6 9 12 15 18 9"/>
    </svg>
  );
}
function FolderSvg() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
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
function EditSvg() {
  return (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
    </svg>
  );
}
function DeleteSvg() {
  return (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6"/>
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
      <path d="M10 11v6M14 11v6"/>
    </svg>
  );
}
