import React, { useState, useEffect, useRef } from 'react';
import { HEROICONS, Heroicon } from './Heroicon';
import type { QuickLink, QuickLinkSection } from '@lumina/core';

interface QuickLinkModalProps {
  link?: QuickLink | null;
  sections: QuickLinkSection[];
  onSave: (data: Omit<QuickLink, 'id'> & { id?: string }) => void;
  onClose: () => void;
}

const FAVICON_BG_OPTIONS = [
  { value: 'white', label: 'White' },
  { value: 'dark', label: 'Dark' },
  { value: 'transparent', label: 'None' },
] as const;

export function QuickLinkModal({ link, sections, onSave, onClose }: QuickLinkModalProps) {
  const [url, setUrl] = useState(link?.url ?? '');
  const [label, setLabel] = useState(link?.label ?? '');
  const [sectionId, setSectionId] = useState(link?.section ?? sections[0]?.id ?? 'default');
  const [iconName, setIconName] = useState<string | null>(link?.iconName ?? null);
  const [faviconBg, setFaviconBg] = useState<'white' | 'dark' | 'transparent'>(
    (link?.faviconBg as 'white' | 'dark' | 'transparent') ?? 'white'
  );
  const [showIconPicker, setShowIconPicker] = useState(false);
  const [iconSearch, setIconSearch] = useState('');
  const urlRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const t = setTimeout(() => urlRef.current?.focus(), 50);
    return () => clearTimeout(t);
  }, []);

  function handleBackdropClick(e: React.MouseEvent<HTMLDivElement>) {
    if (e.target === e.currentTarget) onClose();
  }

  function handleSave() {
    let finalUrl = url.trim();
    if (!finalUrl) return;
    if (!/^https?:\/\//i.test(finalUrl)) finalUrl = 'https://' + finalUrl;
    const finalLabel = label.trim() || getUrlLabel(finalUrl);
    onSave({
      id: link?.id,
      url: finalUrl,
      label: finalLabel,
      favicon: null,
      section: sectionId,
      iconName: iconName ?? null,
      faviconBg: faviconBg !== 'white' ? faviconBg : undefined,
    });
  }

  const heroiconKeys = Object.keys(HEROICONS).filter(k =>
    !iconSearch || k.includes(iconSearch.toLowerCase())
  );

  return (
    <div
      style={backdropStyle}
      onClick={handleBackdropClick}
    >
      <div style={modalStyle}>
        <h2 style={headingStyle}>{link ? 'Edit Link' : 'Add Quick Link'}</h2>

        <div style={fieldGroupStyle}>
          <label style={labelStyle}>URL</label>
          <input
            ref={urlRef}
            style={inputStyle}
            value={url}
            onChange={e => setUrl(e.target.value)}
            placeholder="https://example.com"
            onKeyDown={e => { if (e.key === 'Enter') document.getElementById('ql-modal-label-input')?.focus(); }}
          />
        </div>

        <div style={fieldGroupStyle}>
          <label style={labelStyle}>Label</label>
          <input
            id="ql-modal-label-input"
            style={inputStyle}
            value={label}
            onChange={e => setLabel(e.target.value)}
            placeholder="My Link"
            onKeyDown={e => { if (e.key === 'Enter') handleSave(); }}
          />
        </div>

        {sections.length > 1 && (
          <div style={fieldGroupStyle}>
            <label style={labelStyle}>Section</label>
            <select
              style={{ ...inputStyle, cursor: 'pointer' }}
              value={sectionId}
              onChange={e => setSectionId(e.target.value)}
            >
              {sections.map(s => (
                <option key={s.id} value={s.id}>{s.label}</option>
              ))}
            </select>
          </div>
        )}

        <div style={fieldGroupStyle}>
          <label style={labelStyle}>Icon</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              style={iconPreviewBtnStyle}
              onClick={() => setShowIconPicker(v => !v)}
              title={iconName ?? 'No icon'}
            >
              {iconName
                ? <Heroicon name={iconName} size={18} />
                : <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>None</span>
              }
            </button>
            {iconName && (
              <button
                style={clearBtnStyle}
                onClick={() => setIconName(null)}
              >
                Clear icon
              </button>
            )}
          </div>

          {showIconPicker && (
            <div style={iconPickerContainerStyle}>
              <input
                style={{ ...inputStyle, marginBottom: 8 }}
                placeholder="Search icons..."
                value={iconSearch}
                onChange={e => setIconSearch(e.target.value)}
                autoFocus
              />
              <div style={iconGridStyle}>
                {heroiconKeys.map(k => (
                  <button
                    key={k}
                    title={k}
                    style={{
                      ...iconGridBtnStyle,
                      background: iconName === k ? 'rgba(167,139,250,0.25)' : 'rgba(255,255,255,0.06)',
                      borderColor: iconName === k ? 'rgba(167,139,250,0.5)' : 'rgba(255,255,255,0.1)',
                    }}
                    onClick={() => { setIconName(k); setShowIconPicker(false); setIconSearch(''); }}
                  >
                    <Heroicon name={k} size={16} />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div style={fieldGroupStyle}>
          <label style={labelStyle}>Favicon background</label>
          <div style={{ display: 'flex', gap: 8 }}>
            {FAVICON_BG_OPTIONS.map(opt => (
              <button
                key={opt.value}
                style={{
                  ...bgOptBtnStyle,
                  background: faviconBg === opt.value ? 'rgba(167,139,250,0.2)' : 'rgba(255,255,255,0.06)',
                  borderColor: faviconBg === opt.value ? 'rgba(167,139,250,0.5)' : 'rgba(255,255,255,0.12)',
                  color: faviconBg === opt.value ? '#c4b5fd' : 'rgba(255,255,255,0.5)',
                }}
                onClick={() => setFaviconBg(opt.value)}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 24 }}>
          <button style={cancelBtnStyle} onClick={onClose}>Cancel</button>
          <button style={saveBtnStyle} onClick={handleSave}>
            {link ? 'Update Link' : 'Save Link'}
          </button>
        </div>
      </div>
    </div>
  );
}

function getUrlLabel(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

const backdropStyle: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  zIndex: 100,
  background: 'rgba(0,0,0,0.6)',
  backdropFilter: 'blur(8px)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  animation: 'fadeIn 0.2s ease forwards',
};

const modalStyle: React.CSSProperties = {
  background: 'rgba(18,14,32,0.96)',
  border: '1px solid rgba(255,255,255,0.13)',
  borderRadius: 20,
  padding: 28,
  width: 440,
  maxWidth: 'calc(100vw - 32px)',
  animation: 'modalIn 0.25s ease forwards',
};

const headingStyle: React.CSSProperties = {
  fontFamily: 'Inter, sans-serif',
  fontSize: 18,
  fontWeight: 700,
  marginBottom: 20,
  color: 'rgba(255,255,255,0.92)',
};

const fieldGroupStyle: React.CSSProperties = {
  marginBottom: 14,
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 11,
  fontWeight: 600,
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  color: 'rgba(255,255,255,0.4)',
  marginBottom: 6,
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  background: 'rgba(255,255,255,0.07)',
  border: '1px solid rgba(255,255,255,0.13)',
  borderRadius: 10,
  padding: '9px 12px',
  fontSize: 14,
  color: 'rgba(255,255,255,0.85)',
  outline: 'none',
  fontFamily: 'Inter, sans-serif',
};

const iconPreviewBtnStyle: React.CSSProperties = {
  width: 36,
  height: 36,
  borderRadius: 8,
  border: '1px solid rgba(255,255,255,0.13)',
  background: 'rgba(255,255,255,0.07)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
  color: 'rgba(255,255,255,0.7)',
  flexShrink: 0,
};

const clearBtnStyle: React.CSSProperties = {
  fontSize: 12,
  padding: '5px 10px',
  borderRadius: 7,
  border: '1px solid rgba(255,255,255,0.13)',
  background: 'transparent',
  color: 'rgba(255,255,255,0.45)',
  cursor: 'pointer',
  fontFamily: 'Inter, sans-serif',
};

const iconPickerContainerStyle: React.CSSProperties = {
  marginTop: 8,
  padding: 12,
  background: 'rgba(0,0,0,0.4)',
  borderRadius: 10,
  border: '1px solid rgba(255,255,255,0.1)',
};

const iconGridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(32px, 1fr))',
  gap: 4,
  maxHeight: 180,
  overflowY: 'auto',
};

const iconGridBtnStyle: React.CSSProperties = {
  width: 32,
  height: 32,
  borderRadius: 6,
  border: '1px solid',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
  color: 'rgba(255,255,255,0.65)',
  transition: 'all 0.15s',
};

const bgOptBtnStyle: React.CSSProperties = {
  padding: '6px 14px',
  borderRadius: 8,
  border: '1px solid',
  fontSize: 12,
  cursor: 'pointer',
  fontFamily: 'Inter, sans-serif',
  transition: 'all 0.15s',
};

const cancelBtnStyle: React.CSSProperties = {
  padding: '9px 20px',
  borderRadius: 10,
  border: '1px solid rgba(255,255,255,0.13)',
  background: 'rgba(255,255,255,0.07)',
  color: 'rgba(255,255,255,0.5)',
  fontSize: 13,
  fontWeight: 500,
  cursor: 'pointer',
  fontFamily: 'Inter, sans-serif',
};

const saveBtnStyle: React.CSSProperties = {
  padding: '9px 20px',
  borderRadius: 10,
  border: 'none',
  background: '#a78bfa',
  color: '#1a0f2e',
  fontSize: 13,
  fontWeight: 600,
  cursor: 'pointer',
  fontFamily: 'Inter, sans-serif',
  boxShadow: '0 2px 12px rgba(167,139,250,0.3)',
};
