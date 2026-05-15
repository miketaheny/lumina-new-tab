import { describe, it, expect, beforeEach } from 'vitest';
import { setAuthProvider, getAccessToken, isSignedIn, getAuthProvider } from '../auth';
import type { AuthProvider } from '../auth';

const mockProvider: AuthProvider = {
  getAccessToken: async () => 'mock-token-123',
  signIn: async () => 'mock-token-123',
  signOut: async () => {},
  getProfile: async () => ({ email: 'test@example.com', name: 'Test User' }),
};

beforeEach(() => {
  setAuthProvider(mockProvider);
});

describe('auth', () => {
  it('returns token from provider', async () => {
    const token = await getAccessToken();
    expect(token).toBe('mock-token-123');
  });

  it('reports signed in when token exists', async () => {
    expect(await isSignedIn()).toBe(true);
  });

  it('reports signed out when token is null', async () => {
    setAuthProvider({ ...mockProvider, getAccessToken: async () => null });
    expect(await isSignedIn()).toBe(false);
  });

  it('throws when no provider set', () => {
    setAuthProvider(null as any);
    expect(() => getAuthProvider()).toThrow('Auth provider not initialized');
  });
});
