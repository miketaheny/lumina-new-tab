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

  return (
    <div id="quote-wrap">
      <span id="quote-text">&ldquo;{verse.text}&rdquo;</span>
      <a id="quote-link" href={verse.url} target="_blank" rel="noopener noreferrer">
        <span id="quote-author">— {verse.reference}</span>
      </a>
    </div>
  );
}
