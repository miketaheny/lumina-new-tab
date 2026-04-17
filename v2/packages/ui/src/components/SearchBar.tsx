import React, { useRef, useEffect, useState } from 'react';
import { SEARCH_URLS } from '@lumina/core';

interface SearchBarProps {
  searchEngine?: string;
}

export function SearchBar({ searchEngine = 'claude' }: SearchBarProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => {
      inputRef.current?.focus();
    }, 300);
    return () => clearTimeout(timer);
  }, []);

  function doSearch() {
    const q = query.trim();
    if (!q) return;
    const base = SEARCH_URLS[searchEngine] ?? SEARCH_URLS.claude;
    window.open(base + encodeURIComponent(q), '_blank');
    setQuery('');
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') doSearch();
  }

  return (
    <div id="search-wrap">
      <div id="search-form">
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
    </div>
  );
}
