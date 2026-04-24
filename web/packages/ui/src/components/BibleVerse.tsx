import React, { useEffect, useState } from 'react';
import { VERSE_REFS } from '@lumina/core';

const CACHE_KEY = 'lumina_verse';

const FALLBACK = {
  text: 'I can do all things through Christ who strengthens me.',
  reference: 'Philippians 4:13',
  url: 'https://www.bible.com/bible/111/PHP.4.13',
};

interface CachedVerse {
  date: string;
  text: string;
  reference: string;
  url: string;
}

interface BibleVerseProps {
  showQuote?: boolean;
}

function getDailyRef() {
  const dayIdx = Math.floor(Date.now() / 86400000) % VERSE_REFS.length;
  return VERSE_REFS[dayIdx];
}

export function BibleVerse({ showQuote = true }: BibleVerseProps) {
  const [verse, setVerse] = useState<CachedVerse | null>(null);

  useEffect(() => {
    if (!showQuote) return;

    let cancelled = false;

    async function load() {
      const today = new Date().toDateString();
      const cached = JSON.parse(localStorage.getItem(CACHE_KEY) ?? 'null') as CachedVerse | null;

      if (cached && cached.date === today) {
        if (!cancelled) setVerse(cached);
        return;
      }

      const pick = getDailyRef();
      try {
        const res = await fetch(
          `https://bible-api.com/${encodeURIComponent(pick.ref)}?translation=web`,
        );
        const data = await res.json() as { text: string; reference: string };
        const v: CachedVerse = {
          date: today,
          text: data.text.trim().replace(/\s+/g, ' '),
          reference: data.reference,
          url: pick.url,
        };
        localStorage.setItem(CACHE_KEY, JSON.stringify(v));
        if (!cancelled) setVerse(v);
      } catch {
        if (!cancelled) setVerse({ date: today, ...FALLBACK });
      }
    }

    load();
    return () => { cancelled = true; };
  }, [showQuote]);

  if (!showQuote || !verse) return null;

  const quoteWrapStyle: React.CSSProperties = {
    position: 'fixed',
    bottom: 20,
    left: 0,
    right: 0,
    zIndex: 3,
    textAlign: 'center',
    maxWidth: 480,
    margin: '0 auto',
    opacity: 0,
    animation: 'fadeUp 0.6s ease 0.6s forwards',
    pointerEvents: 'none',
  };

  const quoteTextStyle: React.CSSProperties = {
    fontSize: 13,
    lineHeight: 1.6,
    color: 'rgba(255,255,255,0.55)',
    display: 'block',
    marginBottom: 6,
    pointerEvents: 'auto',
  };

  const quoteLinkStyle: React.CSSProperties = {
    textDecoration: 'none',
    pointerEvents: 'auto',
  };

  const quoteAuthorStyle: React.CSSProperties = {
    fontSize: 11,
    color: 'rgba(255,255,255,0.35)',
    letterSpacing: '0.04em',
  };

  return (
    <div id="quote-wrap" style={quoteWrapStyle}>
      <span id="quote-text" style={quoteTextStyle}>&ldquo;{verse.text}&rdquo;</span>
      <a id="quote-link" href={verse.url} target="_blank" rel="noopener noreferrer" style={quoteLinkStyle}>
        <span id="quote-author" style={quoteAuthorStyle}>— {verse.reference}</span>
      </a>
    </div>
  );
}
