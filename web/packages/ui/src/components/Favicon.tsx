import React, { useState } from 'react';

interface FaviconProps {
  url: string;
  label: string;
  size?: number;
  bgOverride?: string;
}

function getFaviconUrl(url: string): string | null {
  try {
    const { hostname } = new URL(url);
    return `https://www.google.com/s2/favicons?sz=64&domain=${hostname}`;
  } catch {
    return null;
  }
}

export function Favicon({ url, label, size = 44, bgOverride }: FaviconProps) {
  const [useFallback, setUseFallback] = useState(false);
  const googleUrl = getFaviconUrl(url);
  const letter = (label || '?')[0].toUpperCase();

  const fallbackStyle: React.CSSProperties = {
    width: size,
    height: size,
    borderRadius: 10,
    flexShrink: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: size * 0.4,
    fontWeight: 600,
    background: bgOverride ?? 'rgba(255,255,255,0.1)',
    color: 'rgba(255,255,255,0.6)',
    fontFamily: 'Inter, sans-serif',
  };

  if (!googleUrl || useFallback) {
    return <div style={fallbackStyle}>{letter}</div>;
  }

  return (
    <>
      <img
        src={googleUrl}
        alt=""
        width={size}
        height={size}
        style={{
          borderRadius: 10,
          flexShrink: 0,
          objectFit: 'cover',
          background: bgOverride ?? 'rgba(255,255,255,0.1)',
          display: useFallback ? 'none' : undefined,
        }}
        onLoad={e => {
          const img = e.currentTarget;
          if (img.naturalWidth <= 16 && img.naturalHeight <= 16) {
            setUseFallback(true);
          }
        }}
        onError={() => setUseFallback(true)}
      />
      {useFallback && <div style={fallbackStyle}>{letter}</div>}
    </>
  );
}
