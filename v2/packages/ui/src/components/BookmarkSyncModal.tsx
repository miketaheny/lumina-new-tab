import { useState, useEffect } from 'react';

// chrome is only available in the extension context; declared here so the shared
// package compiles without @types/chrome. The isBookmarksAvailable() guard
// ensures the component renders null in web contexts.
declare const chrome: {
  bookmarks: {
    getTree: (callback: (results: ChromeBookmarkTreeNode[]) => void) => void;
  };
};

interface ChromeBookmarkTreeNode {
  id: string;
  parentId?: string;
  title: string;
  url?: string;
  children?: ChromeBookmarkTreeNode[];
}

interface ImportLink {
  url: string;
  label: string;
}

interface BookmarkSyncModalProps {
  onImport: (links: ImportLink[]) => void;
  onClose: () => void;
}

function isBookmarksAvailable(): boolean {
  return typeof chrome !== 'undefined' && typeof chrome.bookmarks !== 'undefined';
}

function collectFolders(nodes: ChromeBookmarkTreeNode[], depth = 0): Array<{ node: ChromeBookmarkTreeNode; depth: number }> {
  const result: Array<{ node: ChromeBookmarkTreeNode; depth: number }> = [];
  for (const node of nodes) {
    if (!node.url) {
      result.push({ node, depth });
      if (node.children) {
        result.push(...collectFolders(node.children, depth + 1));
      }
    }
  }
  return result;
}

function getDirectBookmarks(nodes: ChromeBookmarkTreeNode[], folderId: string): ChromeBookmarkTreeNode[] {
  for (const node of nodes) {
    if (node.id === folderId) {
      return (node.children ?? []).filter(c => !!c.url);
    }
    if (node.children) {
      const found = getDirectBookmarks(node.children, folderId);
      if (found.length > 0 || node.id === folderId) return found;
    }
  }
  return [];
}

function findFolder(nodes: ChromeBookmarkTreeNode[], folderId: string): ChromeBookmarkTreeNode | null {
  for (const node of nodes) {
    if (node.id === folderId) return node;
    if (node.children) {
      const found = findFolder(node.children, folderId);
      if (found) return found;
    }
  }
  return null;
}

export function BookmarkSyncModal({ onImport, onClose }: BookmarkSyncModalProps) {
  const [tree, setTree] = useState<ChromeBookmarkTreeNode[]>([]);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [step, setStep] = useState<'select' | 'preview'>('select');
  const [previewLinks, setPreviewLinks] = useState<ImportLink[]>([]);

  if (!isBookmarksAvailable()) return null;

  useEffect(() => {
    chrome.bookmarks.getTree((results) => {
      setTree(results);
    });
  }, []);

  const folders = collectFolders(tree);

  function handleSelectFolder(id: string) {
    setSelectedFolderId(id);
  }

  function handleNext() {
    if (!selectedFolderId) return;
    const folder = findFolder(tree, selectedFolderId);
    if (!folder) return;
    const bookmarks = getDirectBookmarks(tree, selectedFolderId);
    setPreviewLinks(bookmarks.map(b => ({ url: b.url!, label: b.title || b.url! })));
    setStep('preview');
  }

  function handleImport() {
    onImport(previewLinks);
    onClose();
  }

  return (
    <div style={overlayStyle} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={modalStyle}>
        <div style={headerStyle}>
          <span style={titleStyle}>
            {step === 'select' ? 'Select Bookmark Folder' : 'Preview Import'}
          </span>
          <button style={iconBtnStyle} onClick={onClose} title="Close"><CloseSvg /></button>
        </div>

        {step === 'select' && (
          <>
            <div style={bodyStyle}>
              {folders.length === 0 ? (
                <p style={emptyStyle}>Loading folders...</p>
              ) : (
                <div style={folderListStyle}>
                  {folders.map(({ node, depth }) => (
                    <button
                      key={node.id}
                      style={{
                        ...folderItemStyle,
                        paddingLeft: 12 + depth * 16,
                        background: selectedFolderId === node.id
                          ? 'rgba(167,139,250,0.15)'
                          : 'transparent',
                        borderColor: selectedFolderId === node.id
                          ? 'rgba(167,139,250,0.4)'
                          : 'rgba(255,255,255,0.06)',
                        color: selectedFolderId === node.id
                          ? '#c4b5fd'
                          : 'rgba(255,255,255,0.72)',
                      }}
                      onClick={() => handleSelectFolder(node.id)}
                    >
                      <FolderSvg />
                      <span style={{ marginLeft: 8 }}>{node.title || 'Untitled Folder'}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div style={footerStyle}>
              <button style={cancelBtnStyle} onClick={onClose}>Cancel</button>
              <button
                style={{ ...primaryBtnStyle, opacity: selectedFolderId ? 1 : 0.4 }}
                onClick={handleNext}
                disabled={!selectedFolderId}
              >
                Next
              </button>
            </div>
          </>
        )}

        {step === 'preview' && (
          <>
            <div style={bodyStyle}>
              {previewLinks.length === 0 ? (
                <p style={emptyStyle}>No bookmarks found in this folder.</p>
              ) : (
                <div style={previewListStyle}>
                  {previewLinks.map((link, i) => (
                    <div key={i} style={previewItemStyle}>
                      <span style={previewLabelStyle}>{link.label}</span>
                      <span style={previewUrlStyle}>{link.url}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div style={footerStyle}>
              <button style={cancelBtnStyle} onClick={() => setStep('select')}>Back</button>
              <button
                style={{ ...primaryBtnStyle, opacity: previewLinks.length > 0 ? 1 : 0.4 }}
                onClick={handleImport}
                disabled={previewLinks.length === 0}
              >
                Import {previewLinks.length > 0 ? `${previewLinks.length} Links` : ''}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

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
  width: 380,
  maxWidth: '90vw',
  maxHeight: '80vh',
  display: 'flex',
  flexDirection: 'column',
  background: 'rgba(20,15,40,0.98)',
  border: '1px solid rgba(255,255,255,0.12)',
  borderRadius: 14,
  boxShadow: '0 20px 60px rgba(0,0,0,0.7)',
  backdropFilter: 'blur(20px)',
};

const headerStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '16px 20px 12px',
  borderBottom: '1px solid rgba(255,255,255,0.07)',
  flexShrink: 0,
};

const titleStyle: React.CSSProperties = {
  fontSize: 14,
  fontWeight: 700,
  color: 'rgba(255,255,255,0.85)',
  fontFamily: 'Inter, sans-serif',
};

const bodyStyle: React.CSSProperties = {
  flex: 1,
  overflowY: 'auto',
  padding: '12px 0',
};

const folderListStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 2,
  padding: '0 12px',
};

const folderItemStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  padding: '8px 12px',
  borderRadius: 8,
  border: '1px solid',
  cursor: 'pointer',
  fontSize: 13,
  fontFamily: 'Inter, sans-serif',
  textAlign: 'left',
  transition: 'all 0.15s',
};

const previewListStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 1,
  padding: '0 12px',
};

const previewItemStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  padding: '8px 10px',
  borderRadius: 8,
  borderBottom: '1px solid rgba(255,255,255,0.05)',
};

const previewLabelStyle: React.CSSProperties = {
  fontSize: 13,
  color: 'rgba(255,255,255,0.8)',
  fontFamily: 'Inter, sans-serif',
};

const previewUrlStyle: React.CSSProperties = {
  fontSize: 11,
  color: 'rgba(255,255,255,0.35)',
  fontFamily: 'Inter, sans-serif',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
};

const emptyStyle: React.CSSProperties = {
  padding: '16px 20px',
  fontSize: 13,
  color: 'rgba(255,255,255,0.35)',
  fontFamily: 'Inter, sans-serif',
};

const footerStyle: React.CSSProperties = {
  display: 'flex',
  gap: 8,
  justifyContent: 'flex-end',
  padding: '12px 20px',
  borderTop: '1px solid rgba(255,255,255,0.07)',
  flexShrink: 0,
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

const primaryBtnStyle: React.CSSProperties = {
  padding: '7px 14px',
  borderRadius: 8,
  border: '1px solid rgba(167,139,250,0.35)',
  background: 'rgba(167,139,250,0.15)',
  color: '#c4b5fd',
  fontSize: 12,
  fontFamily: 'Inter, sans-serif',
  cursor: 'pointer',
  fontWeight: 600,
  transition: 'opacity 0.15s',
};

function CloseSvg() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
    </svg>
  );
}

function FolderSvg() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
    </svg>
  );
}
