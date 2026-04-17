import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setAuthProvider } from '../auth';
import { listFiles, readTextFile, writeTextFile, findOrCreateFolder } from '../drive-client';

const mockFetch = vi.fn();
globalThis.fetch = mockFetch;

beforeEach(() => {
  vi.clearAllMocks();
  setAuthProvider({
    getAccessToken: async () => 'test-token',
    signIn: async () => 'test-token',
    signOut: async () => {},
    getProfile: async () => null,
  });
});

describe('drive-client', () => {
  it('listFiles sends correct auth header and query', async () => {
    mockFetch.mockResolvedValueOnce({
      json: async () => ({ files: [{ id: 'f1', name: 'settings.json', mimeType: 'application/json', modifiedTime: '2026-01-01T00:00:00Z' }] }),
    });

    const files = await listFiles('folder-id');
    expect(files).toHaveLength(1);
    expect(files[0].name).toBe('settings.json');

    const [url, opts] = mockFetch.mock.calls[0];
    expect(url).toContain('folder-id');
    expect(opts.headers.Authorization).toBe('Bearer test-token');
  });

  it('readTextFile fetches file content', async () => {
    mockFetch.mockResolvedValueOnce({
      text: async () => '{"themes":["cosmic"]}',
    });

    const content = await readTextFile('file-id');
    expect(content).toBe('{"themes":["cosmic"]}');

    const [url] = mockFetch.mock.calls[0];
    expect(url).toContain('file-id');
    expect(url).toContain('alt=media');
  });

  it('writeTextFile creates new file with multipart upload', async () => {
    mockFetch.mockResolvedValueOnce({
      json: async () => ({ id: 'new-file', name: 'test.json', mimeType: 'application/json', modifiedTime: '2026-01-01T00:00:00Z' }),
    });

    const result = await writeTextFile('test.json', '{}', 'application/json', 'folder-id');
    expect(result.id).toBe('new-file');

    const [url, opts] = mockFetch.mock.calls[0];
    expect(url).toContain('uploadType=multipart');
    expect(opts.method).toBe('POST');
  });

  it('writeTextFile updates existing file with PATCH', async () => {
    mockFetch.mockResolvedValueOnce({
      json: async () => ({ id: 'existing', name: 'test.json', mimeType: 'application/json', modifiedTime: '2026-01-01T00:00:00Z' }),
    });

    const result = await writeTextFile('test.json', '{}', 'application/json', 'folder-id', 'existing');
    expect(result.id).toBe('existing');

    const [url, opts] = mockFetch.mock.calls[0];
    expect(url).toContain('existing');
    expect(opts.method).toBe('PATCH');
  });

  it('findOrCreateFolder returns existing folder', async () => {
    mockFetch.mockResolvedValueOnce({
      json: async () => ({ files: [{ id: 'existing-folder', name: 'Lumina' }] }),
    });

    const id = await findOrCreateFolder('Lumina');
    expect(id).toBe('existing-folder');
  });

  it('findOrCreateFolder creates folder when not found', async () => {
    mockFetch
      .mockResolvedValueOnce({ json: async () => ({ files: [] }) })
      .mockResolvedValueOnce({ json: async () => ({ id: 'new-folder' }) });

    const id = await findOrCreateFolder('Lumina');
    expect(id).toBe('new-folder');
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });
});
