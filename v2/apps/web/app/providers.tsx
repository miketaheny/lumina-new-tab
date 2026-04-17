'use client';

import { useEffect, useState } from 'react';
import { storage } from '@lumina/core';
import { setAuthProvider, setupSyncListeners } from '@lumina/drive';
import { webAuthProvider } from '../lib/web-auth-provider';

export function LuminaProviders({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setAuthProvider(webAuthProvider);
    storage.getSettings().then(() => setReady(true));
    const cleanup = setupSyncListeners();
    return cleanup;
  }, []);

  if (!ready) return null;
  return <>{children}</>;
}
