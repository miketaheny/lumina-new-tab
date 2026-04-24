import React from 'react';
import { THEMES } from '@lumina/core';

interface ThemeGridProps {
  selectedThemes: string[];
  onChange: (themes: string[]) => void;
}

export function ThemeGrid({ selectedThemes, onChange }: ThemeGridProps) {
  function toggle(key: string) {
    const idx = selectedThemes.indexOf(key);
    if (idx >= 0) {
      if (selectedThemes.length > 1) onChange(selectedThemes.filter(t => t !== key));
    } else {
      onChange([...selectedThemes, key]);
    }
  }

  return (
    <div style={gridStyle}>
      {Object.entries(THEMES).map(([key, theme]) => {
        const active = selectedThemes.includes(key);
        return (
          <div
            key={key}
            style={{
              ...cardStyle,
              background: theme.preview,
              outline: active ? '2px solid rgba(167,139,250,0.7)' : '2px solid transparent',
              outlineOffset: 2,
            }}
            onClick={() => toggle(key)}
            role="checkbox"
            aria-checked={active}
            tabIndex={0}
            onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(key); } }}
          >
            <div style={checkStyle(active)}>✓</div>
            <div style={nameStyle}>{theme.name}</div>
            <div style={descStyle}>{theme.desc}</div>
          </div>
        );
      })}
    </div>
  );
}

const gridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))',
  gap: 8,
};

const cardStyle: React.CSSProperties = {
  borderRadius: 12,
  padding: '10px 8px 8px',
  cursor: 'pointer',
  position: 'relative',
  minHeight: 64,
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'flex-end',
  transition: 'outline 0.15s, transform 0.15s',
  userSelect: 'none',
};

function checkStyle(active: boolean): React.CSSProperties {
  return {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 18,
    height: 18,
    borderRadius: '50%',
    background: active ? 'rgba(167,139,250,0.85)' : 'rgba(0,0,0,0.35)',
    border: '1.5px solid rgba(255,255,255,0.3)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 10,
    color: active ? '#1a0f2e' : 'transparent',
    fontWeight: 700,
    transition: 'background 0.15s, color 0.15s',
  };
}

const nameStyle: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 700,
  color: 'rgba(255,255,255,0.9)',
  textShadow: '0 1px 4px rgba(0,0,0,0.8)',
  position: 'relative',
  zIndex: 1,
};

const descStyle: React.CSSProperties = {
  fontSize: 9,
  color: 'rgba(255,255,255,0.55)',
  textShadow: '0 1px 4px rgba(0,0,0,0.8)',
  position: 'relative',
  zIndex: 1,
  marginTop: 1,
};
