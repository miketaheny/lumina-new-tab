import React, { useRef, useEffect, useState } from 'react';
import { storage, SEARCH_URLS, CLIPBOARD_ENGINES } from '@lumina/core';
import { showToast } from './Toast';

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

interface SearchBarProps {
  searchEngine?: string;
}

export function SearchBar({ searchEngine = 'claude' }: SearchBarProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState('');
  const [engine, setEngine] = useState(searchEngine);
  const [showPicker, setShowPicker] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      inputRef.current?.focus();
    }, 300);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    function handleGlobalKey(e: KeyboardEvent) {
      if (e.key !== '/') return;
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || (e.target as HTMLElement)?.isContentEditable) return;
      e.preventDefault();
      inputRef.current?.focus();
    }
    document.addEventListener('keydown', handleGlobalKey);
    return () => document.removeEventListener('keydown', handleGlobalKey);
  }, []);

  function switchEngine(key: string) {
    setEngine(key);
    setShowPicker(false);
    storage.getSettings().then(s => {
      storage.setSettings({ ...s, searchEngine: key, updatedAt: new Date().toISOString() });
    });
  }

  function doSearch() {
    const q = query.trim();
    if (!q) return;
    const base = SEARCH_URLS[engine] ?? SEARCH_URLS.claude;
    if (CLIPBOARD_ENGINES.has(engine)) {
      navigator.clipboard.writeText(q);
      showToast('Query copied — paste into the chat input');
      window.open(base, '_blank');
    } else {
      window.open(base + encodeURIComponent(q), '_blank');
    }
    setQuery('');
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') doSearch();
  }

  return (
    <div id="search-wrap" style={{ position: 'relative' }}>
      <div id="search-form">
        <button
          type="button"
          style={engineBtnStyle}
          title="Switch search engine"
          onClick={() => setShowPicker(v => !v)}
        >
          {ENGINE_LABELS[engine] ?? engine}
          <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
            <polyline points="6 9 12 15 18 9"/>
          </svg>
        </button>
        <input
          ref={inputRef}
          id="search-input"
          type="text"
          placeholder="Search…"
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          autoComplete="off"
        />
        <button id="search-btn" type="button" onClick={doSearch} aria-label="Search">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" width="18" height="18">
            <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
          </svg>
        </button>
      </div>
      {showPicker && (
        <>
          <div style={pickerBackdropStyle} onClick={() => setShowPicker(false)} />
          <div style={pickerStyle}>
            {Object.keys(SEARCH_URLS).map(key => (
              <button
                key={key}
                style={{
                  ...pickerItemStyle,
                  background: key === engine ? 'rgba(167,139,250,0.15)' : 'transparent',
                  color: key === engine ? '#c4b5fd' : 'rgba(255,255,255,0.65)',
                }}
                onClick={() => switchEngine(key)}
              >
                {ENGINE_LABELS[key] ?? key}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

const engineBtnStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 4,
  padding: '4px 8px',
  borderRadius: 6,
  border: '1px solid rgba(255,255,255,0.1)',
  background: 'rgba(255,255,255,0.05)',
  color: 'rgba(255,255,255,0.5)',
  fontSize: 11,
  fontFamily: 'Inter, sans-serif',
  cursor: 'pointer',
  flexShrink: 0,
  whiteSpace: 'nowrap',
};

const pickerBackdropStyle: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  zIndex: 49,
};

const pickerStyle: React.CSSProperties = {
  position: 'absolute',
  top: '100%',
  left: 0,
  marginTop: 4,
  zIndex: 50,
  background: 'rgba(14,10,28,0.97)',
  border: '1px solid rgba(255,255,255,0.12)',
  borderRadius: 10,
  padding: '4px',
  display: 'flex',
  flexDirection: 'column',
  gap: 1,
  boxShadow: '0 8px 30px rgba(0,0,0,0.5)',
  backdropFilter: 'blur(16px)',
  minWidth: 140,
};

const pickerItemStyle: React.CSSProperties = {
  padding: '6px 10px',
  borderRadius: 7,
  border: 'none',
  fontSize: 12,
  fontFamily: 'Inter, sans-serif',
  cursor: 'pointer',
  textAlign: 'left',
};
