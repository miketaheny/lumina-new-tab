import { storage, noteToMarkdown, markdownToNote } from '@lumina/core';
import type { SyncDomain, SyncMeta, PendingChange, Note } from '@lumina/core';
import {
  getLuminaFolderId, findOrCreateFolder, listFiles,
  readTextFile, writeTextFile, deleteFile,
} from './drive-client';
import { isSignedIn } from './auth';
import type { DriveFile } from './drive-client';

let syncInProgress = false;
let pushTimer: ReturnType<typeof setTimeout> | null = null;

const JSON_FILES: Record<string, SyncDomain> = {
  'settings.json': 'settings',
  'quick-links.json': 'quickLinks',
  'kindling.json': 'kindling',
  'bookmarks.json': 'bookmarks',
  'wallpapers-manifest.json': 'wallpapers',
};

const DOMAIN_TO_FILE: Record<string, string> = Object.fromEntries(
  Object.entries(JSON_FILES).map(([file, domain]) => [domain, file]),
);

export type SyncStatus = 'idle' | 'syncing' | 'connected' | 'disconnected' | 'error';
export type SyncListener = (status: SyncStatus, message: string) => void;

let statusListeners: SyncListener[] = [];
export function onSyncStatus(listener: SyncListener) {
  statusListeners.push(listener);
  return () => { statusListeners = statusListeners.filter(l => l !== listener); };
}
function emitStatus(status: SyncStatus, message: string) {
  statusListeners.forEach(l => l(status, message));
}

export async function markDirty(domain: SyncDomain, noteId?: string): Promise<void> {
  const meta = await storage.getSyncMeta();
  const change: PendingChange = { domain, timestamp: new Date().toISOString() };
  if (noteId) change.noteId = noteId;
  meta.pendingChanges.push(change);
  await storage.setSyncMeta(meta);
}

export function schedulePush(): void {
  if (pushTimer) clearTimeout(pushTimer);
  pushTimer = setTimeout(() => { pushTimer = null; pushChanges(); }, 3000);
}

export function flushPush(): void {
  if (pushTimer) { clearTimeout(pushTimer); pushTimer = null; }
  pushChanges();
}

async function pushChanges(): Promise<void> {
  if (syncInProgress || !(await isSignedIn())) return;
  syncInProgress = true;
  emitStatus('syncing', 'Pushing changes...');

  try {
    const meta = await storage.getSyncMeta();
    if (!meta.pendingChanges.length) { syncInProgress = false; return; }

    const folderId = await getLuminaFolderId();
    const remoteFiles = await listFiles(folderId);
    const fileMap = new Map(remoteFiles.map(f => [f.name, f]));

    const domains = new Set(meta.pendingChanges.map(c => c.domain));
    const noteIds = new Set(
      meta.pendingChanges.filter(c => c.domain === 'notes' && c.noteId).map(c => c.noteId!),
    );

    for (const domain of domains) {
      if (domain === 'notes') {
        await pushNotes(folderId, fileMap, noteIds);
      } else {
        await pushJsonDomain(domain, folderId, fileMap);
      }
    }

    meta.pendingChanges = [];
    await storage.setSyncMeta(meta);

    const t = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    emitStatus('connected', `Synced — ${t}`);
  } catch (err) {
    emitStatus('error', `Sync error: ${(err as Error).message}`);
  } finally {
    syncInProgress = false;
  }
}

async function pushJsonDomain(
  domain: SyncDomain,
  folderId: string,
  fileMap: Map<string, DriveFile>,
): Promise<void> {
  const fileName = DOMAIN_TO_FILE[domain];
  const existing = fileMap.get(fileName);

  let data: unknown;
  switch (domain) {
    case 'settings': data = await storage.getSettings(); break;
    case 'quickLinks': data = await storage.getQuickLinks(); break;
    case 'kindling': data = await storage.getKindling(); break;
    case 'bookmarks': data = await storage.getBookmarks(); break;
    case 'wallpapers': data = await storage.getWallpapers(); break;
  }

  await writeTextFile(fileName, JSON.stringify(data, null, 2), 'application/json', folderId, existing?.id);

  const meta = await storage.getSyncMeta();
  meta.timestamps[domain] = new Date().toISOString();
  await storage.setSyncMeta(meta);
}

async function pushNotes(
  folderId: string,
  fileMap: Map<string, DriveFile>,
  dirtyNoteIds: Set<string>,
): Promise<void> {
  const notesFolderId = await findOrCreateFolder('notes', folderId);
  const remoteNoteFiles = await listFiles(notesFolderId);
  const remoteByName = new Map(remoteNoteFiles.map(f => [f.name, f]));

  const localNotes = await storage.getNotes();

  for (const note of localNotes) {
    if (!dirtyNoteIds.has(note.id)) continue;
    const fileName = `${note.id}.md`;
    const existing = remoteByName.get(fileName);
    const md = noteToMarkdown(note);
    await writeTextFile(fileName, md, 'text/markdown', notesFolderId, existing?.id);
  }

  const meta = await storage.getSyncMeta();
  if (!meta.timestamps.notes) meta.timestamps.notes = {};
  for (const noteId of dirtyNoteIds) {
    meta.timestamps.notes[noteId] = new Date().toISOString();
  }
  await storage.setSyncMeta(meta);
}

export async function pullAll(): Promise<void> {
  if (syncInProgress || !(await isSignedIn())) return;
  syncInProgress = true;
  emitStatus('syncing', 'Pulling from Drive...');

  try {
    const folderId = await getLuminaFolderId();
    const remoteFiles = await listFiles(folderId);
    const meta = await storage.getSyncMeta();

    for (const file of remoteFiles) {
      const domain = JSON_FILES[file.name];
      if (!domain) continue;

      const localTime = meta.timestamps[domain];
      if (localTime && new Date(localTime) >= new Date(file.modifiedTime)) continue;

      const content = await readTextFile(file.id);
      const parsed = JSON.parse(content);

      switch (domain) {
        case 'settings': await storage.setSettings(parsed); break;
        case 'quickLinks': await storage.setQuickLinks(parsed); break;
        case 'kindling': await storage.setKindling(parsed); break;
        case 'bookmarks': await storage.setBookmarks(parsed); break;
        case 'wallpapers': await storage.setWallpapers(parsed); break;
      }

      meta.timestamps[domain] = file.modifiedTime;
    }

    await pullNotes(folderId, meta);

    meta.lastFullSync = new Date().toISOString();
    await storage.setSyncMeta(meta);

    const t = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    emitStatus('connected', `Synced — ${t}`);
  } catch (err) {
    emitStatus('error', `Sync error: ${(err as Error).message}`);
  } finally {
    syncInProgress = false;
  }
}

async function pullNotes(folderId: string, meta: SyncMeta): Promise<void> {
  const notesFolderFiles = await listFiles(folderId);
  const notesFolder = notesFolderFiles.find(f => f.name === 'notes' && f.mimeType === 'application/vnd.google-apps.folder');
  if (!notesFolder) return;

  const remoteNoteFiles = await listFiles(notesFolder.id);
  const localNotes = await storage.getNotes();
  const localById = new Map(localNotes.map(n => [n.id, n]));
  const pulledIds = new Set<string>();

  if (!meta.timestamps.notes) meta.timestamps.notes = {};

  for (const file of remoteNoteFiles) {
    if (!file.name.endsWith('.md')) continue;
    const noteId = file.name.replace(/\.md$/, '');
    const localTime = meta.timestamps.notes[noteId];

    if (localTime && new Date(localTime) >= new Date(file.modifiedTime)) {
      pulledIds.add(noteId);
      continue;
    }

    const md = await readTextFile(file.id);
    const note = markdownToNote(md);
    localById.set(note.id, note);
    meta.timestamps.notes[noteId] = file.modifiedTime;
    pulledIds.add(note.id);
  }

  const merged = Array.from(localById.values());
  await storage.setNotes(merged);
}

export function setupSyncListeners(): () => void {
  const onFocus = () => { pullAll(); };
  const onBeforeUnload = () => { flushPush(); };

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') onFocus();
  });
  window.addEventListener('pagehide', onBeforeUnload);

  return () => {
    document.removeEventListener('visibilitychange', onFocus);
    window.removeEventListener('pagehide', onBeforeUnload);
  };
}
