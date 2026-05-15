'use client';

import { useEffect, useState } from 'react';
import { storage } from '@lumina/core';

export function LuminaProviders({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    storage.getSettings().then(() => setReady(true));
  }, []);

  if (!ready) return null;
  return <>{children}</>;
}
