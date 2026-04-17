import React from 'react';
import { SEARCH_URLS } from '@lumina/core';
import type { LuminaSettings } from '@lumina/core';

interface GeneralSettingsProps {
  settings: LuminaSettings;
  onChange: (next: LuminaSettings) => void;
}

const SEARCH_ENGINES = Object.keys(SEARCH_URLS);

const ENGINE_LABELS: Record<string, string> = {
  claude: 'Claude',
  gemini: 'Gemini',
  chatgpt: 'ChatGPT',
  perplexity: 'Perplexity',
  google: 'Google',
  googleai: 'Google AI',
  bing: 'Bing',
  duckduckgo: 'DuckDuckGo',
  github: 'GitHub',
  stackoverflow: 'Stack Overflow',
};

export function GeneralSettings({ settings, onChange }: GeneralSettingsProps) {
  function set<K extends keyof LuminaSettings>(key: K, value: LuminaSettings[K]) {
    onChange({ ...settings, [key]: value });
  }

  return (
    <div style={containerStyle}>
      <SectionLabel>Search</SectionLabel>

      <div style={fieldStyle}>
        <label style={fieldLabelStyle}>Search Engine</label>
        <select
          style={selectStyle}
          value={settings.searchEngine}
          onChange={e => set('searchEngine', e.target.value)}
        >
          {SEARCH_ENGINES.map(eng => (
            <option key={eng} value={eng}>{ENGINE_LABELS[eng] ?? eng}</option>
          ))}
        </select>
      </div>

      <SectionLabel>Display</SectionLabel>

      <ToggleRow
        label="Show Clock"
        value={settings.showClock}
        onToggle={() => set('showClock', !settings.showClock)}
      />
      <ToggleRow
        label="Show Focus Line"
        value={settings.showQuote}
        onToggle={() => set('showQuote', !settings.showQuote)}
      />
      <ToggleRow
        label="Grain Overlay"
        value={settings.showGrain}
        onToggle={() => set('showGrain', !settings.showGrain)}
      />
      <ToggleRow
        label="Animate Background"
        value={settings.animateBg}
        onToggle={() => set('animateBg', !settings.animateBg)}
      />
      <ToggleRow
        label="Icons-Only Quick Links"
        value={settings.qlIconsOnly}
        onToggle={() => set('qlIconsOnly', !settings.qlIconsOnly)}
      />

      <SectionLabel>Panel Theme</SectionLabel>
      <div style={segmentedStyle}>
        {(['dark', 'light', 'system'] as const).map(t => (
          <button
            key={t}
            style={{
              ...segBtnStyle,
              background: settings.panelTheme === t ? 'rgba(167,139,250,0.2)' : 'rgba(255,255,255,0.05)',
              borderColor: settings.panelTheme === t ? 'rgba(167,139,250,0.4)' : 'rgba(255,255,255,0.1)',
              color: settings.panelTheme === t ? '#c4b5fd' : 'rgba(255,255,255,0.45)',
            }}
            onClick={() => set('panelTheme', t)}
          >
            {t === 'dark' ? 'Dark' : t === 'light' ? 'Light' : 'System'}
          </button>
        ))}
      </div>

      <SectionLabel>Greeting</SectionLabel>

      <div style={fieldStyle}>
        <label style={fieldLabelStyle}>Your Name</label>
        <input
          style={inputStyle}
          value={settings.greetingName}
          onChange={e => set('greetingName', e.target.value)}
          placeholder="Name"
          maxLength={32}
        />
      </div>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <div style={sectionLabelStyle}>{children}</div>;
}

interface ToggleRowProps {
  label: string;
  value: boolean;
  onToggle: () => void;
}

function ToggleRow({ label, value, onToggle }: ToggleRowProps) {
  return (
    <div style={toggleRowStyle}>
      <span style={toggleLabelStyle}>{label}</span>
      <button
        style={toggleBtnStyle(value)}
        onClick={onToggle}
        role="switch"
        aria-checked={value}
      >
        <div style={toggleKnobStyle(value)} />
      </button>
    </div>
  );
}

const containerStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 6,
};

const sectionLabelStyle: React.CSSProperties = {
  fontSize: 10,
  fontWeight: 600,
  letterSpacing: '0.1em',
  textTransform: 'uppercase',
  color: 'rgba(255,255,255,0.35)',
  marginTop: 16,
  marginBottom: 4,
};

const fieldStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 5,
  marginBottom: 4,
};

const fieldLabelStyle: React.CSSProperties = {
  fontSize: 12,
  color: 'rgba(255,255,255,0.5)',
};

const selectStyle: React.CSSProperties = {
  background: 'rgba(255,255,255,0.07)',
  border: '1px solid rgba(255,255,255,0.13)',
  borderRadius: 9,
  padding: '7px 10px',
  fontSize: 13,
  color: 'rgba(255,255,255,0.8)',
  outline: 'none',
  cursor: 'pointer',
  fontFamily: 'Inter, sans-serif',
};

const inputStyle: React.CSSProperties = {
  background: 'rgba(255,255,255,0.07)',
  border: '1px solid rgba(255,255,255,0.13)',
  borderRadius: 9,
  padding: '7px 10px',
  fontSize: 13,
  color: 'rgba(255,255,255,0.8)',
  outline: 'none',
  fontFamily: 'Inter, sans-serif',
};

const toggleRowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '7px 0',
  borderBottom: '1px solid rgba(255,255,255,0.05)',
};

const toggleLabelStyle: React.CSSProperties = {
  fontSize: 13,
  color: 'rgba(255,255,255,0.72)',
};

function toggleBtnStyle(on: boolean): React.CSSProperties {
  return {
    width: 38,
    height: 22,
    borderRadius: 11,
    border: 'none',
    background: on ? '#a78bfa' : 'rgba(255,255,255,0.15)',
    cursor: 'pointer',
    position: 'relative',
    flexShrink: 0,
    transition: 'background 0.2s',
    padding: 0,
  };
}

function toggleKnobStyle(on: boolean): React.CSSProperties {
  return {
    position: 'absolute',
    top: 3,
    left: on ? 19 : 3,
    width: 16,
    height: 16,
    borderRadius: '50%',
    background: '#fff',
    transition: 'left 0.2s',
    boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
  };
}

const segmentedStyle: React.CSSProperties = {
  display: 'flex',
  gap: 6,
};

const segBtnStyle: React.CSSProperties = {
  flex: 1,
  padding: '7px 10px',
  borderRadius: 9,
  border: '1px solid',
  fontSize: 12,
  cursor: 'pointer',
  fontFamily: 'Inter, sans-serif',
  transition: 'all 0.15s',
  textAlign: 'center',
};
