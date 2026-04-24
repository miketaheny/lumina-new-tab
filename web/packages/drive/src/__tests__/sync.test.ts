import { describe, it, expect, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import { storage } from '@lumina/core';
import { markDirty } from '../sync';

beforeEach(async () => {
  await storage.clearAll();
});

describe('sync', () => {
  it('markDirty adds a pending change', async () => {
    await markDirty('settings');
    const meta = await storage.getSyncMeta();
    expect(meta.pendingChanges).toHaveLength(1);
    expect(meta.pendingChanges[0].domain).toBe('settings');
  });

  it('markDirty for notes includes noteId', async () => {
    await markDirty('notes', 'note-123');
    const meta = await storage.getSyncMeta();
    expect(meta.pendingChanges[0].noteId).toBe('note-123');
  });

  it('accumulates multiple dirty marks', async () => {
    await markDirty('settings');
    await markDirty('quickLinks');
    await markDirty('notes', 'n1');
    const meta = await storage.getSyncMeta();
    expect(meta.pendingChanges).toHaveLength(3);
  });
});
