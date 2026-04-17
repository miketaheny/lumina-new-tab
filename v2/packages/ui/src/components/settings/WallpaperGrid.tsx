import React, { useState } from 'react';
import { storage } from '@lumina/core';
import type { WallpapersManifest, WallpaperEntry } from '@lumina/core';

const WP_EMOJIS = ['🌅','🌌','⛰️','🌊','🌲','🌠','🏙️','🏜️','⚡','🌸','🍂','❄️','🌋','🏖️','🌃','🌄','🌿','🦋','🎑','🏔️','🌺','🌙','☁️','🌈','🌾','🏕️','🐚','🦅','🌏','🎋','🗻','🌻','🌴','🏞️','🦁','🐬'];

interface WallpaperGridProps {
  manifest: WallpapersManifest;
  onChange: (next: WallpapersManifest) => void;
}

interface EditState {
  id: string;
  label: string;
  emoji: string;
}

export function WallpaperGrid({ manifest, onChange }: WallpaperGridProps) {
  const [editState, setEditState] = useState<EditState | null>(null);
  const [addLabel, setAddLabel] = useState('');
  const [addEmoji, setAddEmoji] = useState('🌅');
  const [showAddEmojiPicker, setShowAddEmojiPicker] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const { wallpapers, activeIds } = manifest;

  function toggleActive(id: string) {
    const next = activeIds.includes(id)
      ? activeIds.filter(x => x !== id)
      : [...activeIds, id];
    onChange({ ...manifest, activeIds: next });
  }

  function deleteWallpaper(id: string) {
    storage.deleteWallpaperBlob(id);
    onChange({
      ...manifest,
      wallpapers: wallpapers.filter(w => w.id !== id),
      activeIds: activeIds.filter(x => x !== id),
    });
  }

  function startEdit(wp: WallpaperEntry) {
    setEditState({ id: wp.id, label: wp.label, emoji: wp.emoji });
  }

  function saveEdit() {
    if (!editState) return;
    onChange({
      ...manifest,
      wallpapers: wallpapers.map(w =>
        w.id === editState.id ? { ...w, label: editState.label, emoji: editState.emoji } : w
      ),
    });
    setEditState(null);
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    let current = manifest;
    for (const file of files) {
      const name = file.name.replace(/\.[^.]+$/, '');
      const id = 'wp-u-' + Date.now() + '-' + Math.random().toString(36).slice(2);
      await storage.setWallpaperBlob(id, file);
      const newWp: WallpaperEntry = {
        id,
        source: 'drive',
        label: name,
        emoji: addEmoji,
        isActive: false,
      };
      current = {
        ...current,
        wallpapers: [...current.wallpapers, newWp],
      };
    }
    onChange(current);
    e.target.value = '';
  }

  return (
    <div>
      <div style={gridStyle}>
        {wallpapers.map(wp => {
          const active = activeIds.includes(wp.id);
          const isEditing = editState?.id === wp.id;
          return (
            <div
              key={wp.id}
              style={{
                ...cardStyle,
                outline: active ? '2px solid rgba(167,139,250,0.7)' : '2px solid transparent',
                outlineOffset: 2,
              }}
              onClick={() => !isEditing && toggleActive(wp.id)}
            >
              <div style={checkStyle(active)}>✓</div>

              {isEditing ? (
                <div
                  style={editOverlayStyle}
                  onClick={e => e.stopPropagation()}
                >
                  <span
                    style={emojiPickerBtnStyle}
                    title="Cycle emoji"
                    onClick={e => {
                      e.stopPropagation();
                      const i = WP_EMOJIS.indexOf(editState.emoji);
                      setEditState(s => s ? { ...s, emoji: WP_EMOJIS[(i + 1) % WP_EMOJIS.length] } : null);
                    }}
                  >
                    {editState.emoji}
                  </span>
                  <input
                    style={editInputStyle}
                    value={editState.label}
                    maxLength={30}
                    onChange={e => setEditState(s => s ? { ...s, label: e.target.value } : null)}
                    autoFocus
                    onClick={e => e.stopPropagation()}
                  />
                  <button style={editSaveBtnStyle} onClick={e => { e.stopPropagation(); saveEdit(); }}>✓</button>
                  <button style={editCancelBtnStyle} onClick={e => { e.stopPropagation(); setEditState(null); }}>✕</button>
                </div>
              ) : (
                <>
                  <div style={cardNameStyle}>{wp.emoji} {wp.label}</div>
                  <div style={cardBtnsStyle} className="wp-card-btns" onClick={e => e.stopPropagation()}>
                    <button style={cardBtnStyle} title="Edit" onClick={() => startEdit(wp)}>✏</button>
                    <button
                      style={{ ...cardBtnStyle, color: '#f87171' }}
                      title="Delete"
                      onClick={() => deleteWallpaper(wp.id)}
                    >✕</button>
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>

      <div style={addRowStyle}>
        <button
          style={uploadBtnStyle}
          onClick={() => fileInputRef.current?.click()}
        >
          + Upload wallpaper
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          style={{ display: 'none' }}
          onChange={handleFileUpload}
        />
        <div style={emojiSelectorStyle}>
          <span
            style={emojiPickerBtnStyle}
            title="Select emoji for next upload"
            onClick={() => setShowAddEmojiPicker(v => !v)}
          >
            {addEmoji}
          </span>
        </div>
      </div>

      {showAddEmojiPicker && (
        <div style={emojiGridStyle}>
          {WP_EMOJIS.map(em => (
            <span
              key={em}
              style={{
                ...emojiOptStyle,
                background: em === addEmoji ? 'rgba(167,139,250,0.2)' : 'transparent',
              }}
              onClick={() => { setAddEmoji(em); setShowAddEmojiPicker(false); }}
            >
              {em}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

const gridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))',
  gap: 8,
  marginBottom: 12,
};

const cardStyle: React.CSSProperties = {
  borderRadius: 12,
  padding: '8px',
  cursor: 'pointer',
  position: 'relative',
  minHeight: 64,
  display: 'flex',
  alignItems: 'flex-end',
  justifyContent: 'space-between',
  background: 'linear-gradient(135deg,#1a1a2e,#16213e,#0f3460)',
  transition: 'outline 0.15s',
  overflow: 'hidden',
  userSelect: 'none',
};

function checkStyle(active: boolean): React.CSSProperties {
  return {
    position: 'absolute',
    top: 6,
    left: 6,
    width: 18,
    height: 18,
    borderRadius: '50%',
    background: active ? 'rgba(167,139,250,0.85)' : 'rgba(0,0,0,0.5)',
    border: '1.5px solid rgba(255,255,255,0.3)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 10,
    color: active ? '#1a0f2e' : 'transparent',
    fontWeight: 700,
    transition: 'all 0.15s',
    zIndex: 2,
  };
}

const cardNameStyle: React.CSSProperties = {
  fontSize: 10,
  fontWeight: 600,
  color: 'rgba(255,255,255,0.9)',
  textShadow: '0 1px 6px rgba(0,0,0,1)',
  position: 'relative',
  zIndex: 1,
  flex: 1,
};

const cardBtnsStyle: React.CSSProperties = {
  display: 'flex',
  gap: 2,
  position: 'absolute',
  top: 4,
  right: 4,
  opacity: 0,
  transition: 'opacity 0.15s',
};

const cardBtnStyle: React.CSSProperties = {
  background: 'rgba(0,0,0,0.5)',
  border: '1px solid rgba(255,255,255,0.15)',
  borderRadius: 5,
  padding: '2px 5px',
  fontSize: 10,
  cursor: 'pointer',
  color: 'rgba(255,255,255,0.7)',
};

const editOverlayStyle: React.CSSProperties = {
  position: 'absolute',
  inset: 0,
  background: 'rgba(10,8,20,0.92)',
  borderRadius: 12,
  display: 'flex',
  alignItems: 'center',
  padding: '0 6px',
  gap: 4,
  zIndex: 3,
};

const emojiPickerBtnStyle: React.CSSProperties = {
  cursor: 'pointer',
  fontSize: 16,
  flexShrink: 0,
};

const editInputStyle: React.CSSProperties = {
  flex: 1,
  background: 'rgba(255,255,255,0.1)',
  border: '1px solid rgba(255,255,255,0.15)',
  borderRadius: 6,
  padding: '3px 6px',
  fontSize: 11,
  color: 'rgba(255,255,255,0.85)',
  outline: 'none',
  minWidth: 0,
  fontFamily: 'Inter, sans-serif',
};

const editSaveBtnStyle: React.CSSProperties = {
  background: 'rgba(167,139,250,0.3)',
  border: '1px solid rgba(167,139,250,0.4)',
  borderRadius: 5,
  padding: '2px 5px',
  fontSize: 11,
  cursor: 'pointer',
  color: '#c4b5fd',
  flexShrink: 0,
};

const editCancelBtnStyle: React.CSSProperties = {
  background: 'transparent',
  border: '1px solid rgba(255,255,255,0.15)',
  borderRadius: 5,
  padding: '2px 5px',
  fontSize: 11,
  cursor: 'pointer',
  color: 'rgba(255,255,255,0.5)',
  flexShrink: 0,
};

const addRowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  marginTop: 8,
};

const uploadBtnStyle: React.CSSProperties = {
  padding: '7px 14px',
  borderRadius: 9,
  border: '1px solid rgba(255,255,255,0.13)',
  background: 'rgba(255,255,255,0.07)',
  color: 'rgba(255,255,255,0.6)',
  fontSize: 12,
  cursor: 'pointer',
  fontFamily: 'Inter, sans-serif',
  transition: 'background 0.15s',
};

const emojiSelectorStyle: React.CSSProperties = {
  position: 'relative',
};

const emojiGridStyle: React.CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: 4,
  marginTop: 8,
  padding: 8,
  background: 'rgba(0,0,0,0.3)',
  borderRadius: 10,
  border: '1px solid rgba(255,255,255,0.1)',
};

const emojiOptStyle: React.CSSProperties = {
  cursor: 'pointer',
  padding: '3px 4px',
  borderRadius: 5,
  fontSize: 16,
  transition: 'background 0.1s',
};
