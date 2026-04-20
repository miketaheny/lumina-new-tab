import React, { useState, useEffect, useCallback, useRef } from 'react';
import { storage } from '@lumina/core';
import type { CodeSnippet, SnippetsData } from '@lumina/core';
import { showToast } from './Toast';

const LANGUAGES = [
  { id: 'javascript', label: 'JavaScript' },
  { id: 'typescript', label: 'TypeScript' },
  { id: 'python', label: 'Python' },
  { id: 'bash', label: 'Bash / Shell' },
  { id: 'html', label: 'HTML' },
  { id: 'css', label: 'CSS' },
  { id: 'json', label: 'JSON' },
  { id: 'sql', label: 'SQL' },
  { id: 'go', label: 'Go' },
  { id: 'rust', label: 'Rust' },
  { id: 'ruby', label: 'Ruby' },
  { id: 'php', label: 'PHP' },
  { id: 'yaml', label: 'YAML' },
  { id: 'markdown', label: 'Markdown' },
  { id: 'text', label: 'Plain Text' },
];

export function SnippetsPanel() {
  const [data, setData] = useState<SnippetsData | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState<string | null>(null);
  const [titleDraft, setTitleDraft] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    storage.getSnippets().then(d => {
      setData(d);
      if (d.snippets.length > 0) setActiveId(d.snippets[0].id);
    });
  }, []);

  const persist = useCallback(async (next: SnippetsData) => {
    setData(next);
    await storage.setSnippets({ ...next, updatedAt: new Date().toISOString() });
  }, []);

  const active = data?.snippets.find(s => s.id === activeId) ?? null;

  function addSnippet() {
    if (!data) return;
    const id = `snip-${Date.now()}`;
    const title = uniqueTitle(data.snippets);
    const snippet: CodeSnippet = {
      id, title, code: '', language: 'javascript',
      sortOrder: data.snippets.length, updatedAt: new Date().toISOString(),
    };
    const next = { ...data, snippets: [...data.snippets, snippet] };
    persist(next);
    setActiveId(id);
  }

  function deleteSnippet(id: string) {
    if (!data || data.snippets.length <= 0) return;
    const idx = data.snippets.findIndex(s => s.id === id);
    const next = { ...data, snippets: data.snippets.filter(s => s.id !== id) };
    persist(next);
    if (id === activeId) {
      const remaining = next.snippets;
      setActiveId(remaining.length > 0 ? remaining[Math.max(0, idx - 1)].id : null);
    }
  }

  function startRename(id: string) {
    const s = data?.snippets.find(x => x.id === id);
    if (s) { setEditingTitle(id); setTitleDraft(s.title); }
  }

  function commitRename() {
    if (!data || !editingTitle || !titleDraft.trim()) { setEditingTitle(null); return; }
    const next = {
      ...data,
      snippets: data.snippets.map(s => s.id === editingTitle ? { ...s, title: titleDraft.trim() } : s),
    };
    persist(next);
    setEditingTitle(null);
  }

  function updateCode(code: string) {
    if (!data || !activeId) return;
    const next = { ...data, snippets: data.snippets.map(s => s.id === activeId ? { ...s, code } : s) };
    setData(next);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => { persist(next); }, 1500);
  }

  function updateLanguage(language: string) {
    if (!data || !activeId) return;
    const next = { ...data, snippets: data.snippets.map(s => s.id === activeId ? { ...s, language } : s) };
    persist(next);
  }

  function copyToClipboard() {
    if (!active) return;
    navigator.clipboard.writeText(active.code).then(() => showToast('Copied to clipboard'));
  }

  function formatCode() {
    if (!active || !data) return;
    let formatted = active.code;
    if (active.language === 'json') {
      try {
        formatted = JSON.stringify(JSON.parse(active.code), null, 2);
      } catch {
        showToast('Invalid JSON');
        return;
      }
    } else {
      formatted = active.code
        .split('\n')
        .map(line => line.trimEnd())
        .join('\n')
        .replace(/\n{3,}/g, '\n\n')
        .trimEnd() + '\n';
    }
    const next = { ...data, snippets: data.snippets.map(s => s.id === activeId ? { ...s, code: formatted } : s) };
    persist(next);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Tab') {
      e.preventDefault();
      const ta = e.currentTarget;
      const start = ta.selectionStart;
      const end = ta.selectionEnd;
      const val = ta.value;
      const newVal = val.substring(0, start) + '  ' + val.substring(end);
      updateCode(newVal);
      requestAnimationFrame(() => {
        ta.selectionStart = ta.selectionEnd = start + 2;
      });
    }
  }

  if (!data) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Snippet tabs */}
      <div style={tabBarStyle}>
        <div style={{ display: 'flex', flex: 1, overflowX: 'auto', gap: 2 }}>
          {data.snippets.map(s => (
            <div
              key={s.id}
              style={{
                ...tabStyle,
                background: s.id === activeId ? 'rgba(167,139,250,0.15)' : 'transparent',
                borderBottom: s.id === activeId ? '2px solid rgba(167,139,250,0.7)' : '2px solid transparent',
                color: s.id === activeId ? '#c4b5fd' : 'rgba(255,255,255,0.4)',
              }}
              onClick={() => setActiveId(s.id)}
              onDoubleClick={() => startRename(s.id)}
            >
              {editingTitle === s.id ? (
                <input
                  style={renameInputStyle}
                  value={titleDraft}
                  onChange={e => setTitleDraft(e.target.value)}
                  onBlur={commitRename}
                  onKeyDown={e => { if (e.key === 'Enter') commitRename(); if (e.key === 'Escape') setEditingTitle(null); }}
                  autoFocus
                  onClick={e => e.stopPropagation()}
                />
              ) : (
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.title}</span>
              )}
              {data.snippets.length > 0 && (
                <button
                  style={tabCloseBtnStyle}
                  title="Delete snippet"
                  onClick={e => { e.stopPropagation(); deleteSnippet(s.id); }}
                >
                  ×
                </button>
              )}
            </div>
          ))}
        </div>
        <button style={addBtnStyle} onClick={addSnippet} title="New snippet">+</button>
      </div>

      {active ? (
        <>
          {/* Toolbar */}
          <div style={toolbarStyle}>
            <select
              style={langSelectStyle}
              value={active.language}
              onChange={e => updateLanguage(e.target.value)}
            >
              {LANGUAGES.map(l => (
                <option key={l.id} value={l.id}>{l.label}</option>
              ))}
            </select>
            <div style={{ flex: 1 }} />
            <button style={toolBtnStyle} onClick={formatCode} title="Format code">
              <FormatSvg />
            </button>
            <button style={toolBtnStyle} onClick={copyToClipboard} title="Copy to clipboard">
              <CopySvg />
            </button>
          </div>

          {/* Code editor */}
          <div style={{ flex: 1, position: 'relative', minHeight: 0 }}>
            <textarea
              ref={textareaRef}
              style={editorStyle}
              value={active.code}
              onChange={e => updateCode(e.target.value)}
              onKeyDown={handleKeyDown}
              spellCheck={false}
              placeholder={`// ${LANGUAGES.find(l => l.id === active.language)?.label ?? 'Code'} snippet...`}
            />
          </div>
        </>
      ) : (
        <div style={emptyStyle}>
          No snippets yet. Click <strong>+</strong> to create one.
        </div>
      )}
    </div>
  );
}

function uniqueTitle(snippets: CodeSnippet[], base = 'untitled'): string {
  const titles = new Set(snippets.map(s => s.title));
  if (!titles.has(base)) return base;
  let i = 1;
  while (titles.has(`${base} ${i}`)) i++;
  return `${base} ${i}`;
}

const tabBarStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'stretch',
  borderBottom: '1px solid rgba(255,255,255,0.07)',
  flexShrink: 0,
  minHeight: 34,
};

const tabStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 4,
  padding: '0 10px',
  fontSize: 11,
  fontWeight: 600,
  fontFamily: 'Inter, sans-serif',
  cursor: 'pointer',
  flexShrink: 0,
  maxWidth: 140,
  transition: 'all 0.15s',
  border: 'none',
  letterSpacing: '0.01em',
};

const tabCloseBtnStyle: React.CSSProperties = {
  background: 'none',
  border: 'none',
  color: 'rgba(255,255,255,0.3)',
  cursor: 'pointer',
  fontSize: 14,
  lineHeight: 1,
  padding: 0,
  flexShrink: 0,
};

const addBtnStyle: React.CSSProperties = {
  width: 34,
  border: 'none',
  background: 'transparent',
  color: 'rgba(255,255,255,0.35)',
  fontSize: 18,
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0,
  borderLeft: '1px solid rgba(255,255,255,0.07)',
};

const renameInputStyle: React.CSSProperties = {
  background: 'rgba(255,255,255,0.1)',
  border: '1px solid rgba(167,139,250,0.4)',
  borderRadius: 4,
  padding: '1px 4px',
  fontSize: 11,
  color: 'rgba(255,255,255,0.9)',
  outline: 'none',
  width: '100%',
  fontFamily: 'Inter, sans-serif',
};

const toolbarStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 6,
  padding: '6px 10px',
  borderBottom: '1px solid rgba(255,255,255,0.05)',
  flexShrink: 0,
};

const langSelectStyle: React.CSSProperties = {
  background: 'rgba(255,255,255,0.08)',
  border: '1px solid rgba(255,255,255,0.12)',
  borderRadius: 6,
  padding: '3px 8px',
  fontSize: 11,
  color: 'rgba(255,255,255,0.7)',
  fontFamily: 'Inter, sans-serif',
  cursor: 'pointer',
  outline: 'none',
};

const toolBtnStyle: React.CSSProperties = {
  background: 'rgba(255,255,255,0.06)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 6,
  padding: '4px 6px',
  cursor: 'pointer',
  color: 'rgba(255,255,255,0.5)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};

const editorStyle: React.CSSProperties = {
  position: 'absolute',
  inset: 0,
  background: 'transparent',
  color: 'rgba(255,255,255,0.85)',
  fontFamily: "'SF Mono', 'Fira Code', 'JetBrains Mono', 'Cascadia Code', Menlo, Consolas, monospace",
  fontSize: 13,
  lineHeight: 1.6,
  padding: '12px 14px',
  border: 'none',
  outline: 'none',
  resize: 'none',
  width: '100%',
  height: '100%',
  overflow: 'auto',
  tabSize: 2,
};

const emptyStyle: React.CSSProperties = {
  flex: 1,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: 'rgba(255,255,255,0.25)',
  fontSize: 13,
  fontFamily: 'Inter, sans-serif',
  gap: 4,
};

function CopySvg() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
    </svg>
  );
}

function FormatSvg() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="21" y1="10" x2="7" y2="10"/>
      <line x1="21" y1="6" x2="3" y2="6"/>
      <line x1="21" y1="14" x2="3" y2="14"/>
      <line x1="21" y1="18" x2="7" y2="18"/>
    </svg>
  );
}
