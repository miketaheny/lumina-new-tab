import React, { useState, useEffect, useRef } from 'react';
import type { KindlingData, KindlingItem, KindlingTag } from '@lumina/core';

const TAG_COLORS = [
  '#ef4444', '#f97316', '#eab308', '#22c55e',
  '#14b8a6', '#3b82f6', '#a78bfa', '#ec4899',
];

interface KindlingModalProps {
  editItem?: KindlingItem | null;
  data: KindlingData;
  onSave: (data: KindlingData) => void;
  onClose: () => void;
}

function generateId() {
  return `kl-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function getDomainLabel(url: string): string {
  try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return url; }
}

export function KindlingModal({ editItem, data, onSave, onClose }: KindlingModalProps) {
  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState(TAG_COLORS[6]);
  const urlRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editItem) {
      setUrl(editItem.url);
      setTitle(editItem.title);
      setSelectedTags(editItem.tags ?? []);
    }
    setTimeout(() => urlRef.current?.focus(), 50);
  }, [editItem]);

  function toggleTag(name: string) {
    setSelectedTags(prev =>
      prev.includes(name) ? prev.filter(t => t !== name) : [...prev, name]
    );
  }

  function addNewTag() {
    const name = newTagName.trim();
    if (!name) return;
    let tags = data.tags;
    if (!tags.find(t => t.name === name)) {
      tags = [...tags, { name, color: newTagColor }];
    }
    if (!selectedTags.includes(name)) {
      setSelectedTags(prev => [...prev, name]);
    }
    // update data with new tag in place
    onSave({ ...data, tags, updatedAt: new Date().toISOString() });
    setNewTagName('');
  }

  function handleSave() {
    let trimUrl = url.trim();
    if (!trimUrl) return;
    if (!/^https?:\/\//i.test(trimUrl)) trimUrl = 'https://' + trimUrl;
    const trimTitle = title.trim() || getDomainLabel(trimUrl);
    const now = new Date().toISOString();

    let items: KindlingItem[];
    if (editItem) {
      items = data.items.map(i =>
        i.id === editItem.id
          ? { ...i, url: trimUrl, title: trimTitle, tags: [...selectedTags], updatedAt: now }
          : i
      );
    } else {
      const newItem: KindlingItem = {
        id: generateId(),
        url: trimUrl,
        title: trimTitle,
        tags: [...selectedTags],
        readAt: null,
        sortOrder: data.items.length,
        updatedAt: now,
      };
      items = [...data.items, newItem];
    }
    onSave({ ...data, items, updatedAt: now });
    onClose();
  }

  const isEdit = !!editItem;

  return (
    <div style={overlayStyle} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={modalStyle}>
        <div style={headerStyle}>
          <span style={titleStyle}>{isEdit ? 'Edit Link' : 'Save Link'}</span>
          <button style={iconBtnStyle} onClick={onClose}><CloseSvg /></button>
        </div>
        <div style={bodyStyle}>
          <label style={labelStyle}>
            URL
            <input
              ref={urlRef}
              style={inputStyle}
              value={url}
              onChange={e => setUrl(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') onClose(); }}
              placeholder="https://example.com"
            />
          </label>
          <label style={labelStyle}>
            Title
            <input
              style={inputStyle}
              value={title}
              onChange={e => setTitle(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') onClose(); }}
              placeholder="Optional title"
            />
          </label>

          <div style={labelStyle}>
            Tags
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, minHeight: 28 }}>
              {data.tags.map(tag => (
                <button
                  key={tag.name}
                  type="button"
                  style={{
                    ...tagToggleStyle,
                    background: `${tag.color}22`,
                    color: tag.color,
                    borderColor: selectedTags.includes(tag.name) ? tag.color : `${tag.color}44`,
                    fontWeight: selectedTags.includes(tag.name) ? 700 : 400,
                    boxShadow: selectedTags.includes(tag.name) ? `0 0 0 1px ${tag.color}` : 'none',
                  }}
                  onClick={() => toggleTag(tag.name)}
                >
                  {tag.name}
                </button>
              ))}
              {data.tags.length === 0 && (
                <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: 11 }}>No tags yet. Create one below.</span>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <input
              style={{ ...inputStyle, flex: 1 }}
              placeholder="New tag name…"
              value={newTagName}
              onChange={e => setNewTagName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addNewTag(); } }}
            />
            <button style={addTagBtnStyle} type="button" onClick={addNewTag}>Add</button>
          </div>

          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
            {TAG_COLORS.map(color => (
              <button
                key={color}
                type="button"
                style={{
                  width: 18,
                  height: 18,
                  borderRadius: '50%',
                  background: color,
                  border: newTagColor === color ? '2px solid white' : '2px solid transparent',
                  cursor: 'pointer',
                  padding: 0,
                  flexShrink: 0,
                }}
                onClick={() => setNewTagColor(color)}
              />
            ))}
          </div>

          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 4 }}>
            <button style={cancelBtnStyle} onClick={onClose}>Cancel</button>
            <button style={saveBtnStyle} onClick={handleSave}>
              {isEdit ? 'Save Changes' : 'Save Link'}
            </button>
          </div>
        </div>
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
  width: 360,
  maxWidth: '92vw',
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
};

const titleStyle: React.CSSProperties = {
  fontSize: 14,
  fontWeight: 700,
  color: 'rgba(255,255,255,0.85)',
  fontFamily: 'Inter, sans-serif',
};

const bodyStyle: React.CSSProperties = {
  padding: '16px 20px',
  display: 'flex',
  flexDirection: 'column',
  gap: 12,
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
  padding: '7px 10px',
  outline: 'none',
};

const tagToggleStyle: React.CSSProperties = {
  padding: '3px 9px',
  borderRadius: 20,
  border: '1px solid',
  fontSize: 11,
  fontFamily: 'Inter, sans-serif',
  cursor: 'pointer',
  transition: 'all 0.1s',
};

const addTagBtnStyle: React.CSSProperties = {
  padding: '7px 12px',
  borderRadius: 8,
  border: '1px solid rgba(255,255,255,0.1)',
  background: 'rgba(255,255,255,0.06)',
  color: 'rgba(255,255,255,0.6)',
  fontSize: 12,
  fontFamily: 'Inter, sans-serif',
  cursor: 'pointer',
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
