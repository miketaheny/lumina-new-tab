import type { AuthProvider, UserProfile } from '@lumina/drive';

export const extensionAuthProvider: AuthProvider = {
  async getAccessToken() {
    const result = await chrome.identity.getAuthToken({ interactive: false });
    return result?.token ?? null;
  },

  async signIn() {
    const result = await chrome.identity.getAuthToken({ interactive: true });
    if (!result?.token) {
      throw new Error('Sign-in failed');
    }
    return result.token;
  },

  async signOut() {
    const result = await chrome.identity.getAuthToken({ interactive: false });
    const token = result?.token;
    if (token) {
      await new Promise<void>((resolve) => {
        chrome.identity.removeCachedAuthToken({ token }, () => resolve());
      });
    }
  },

  async getProfile(): Promise<UserProfile | null> {
    const token = await this.getAccessToken();
    if (!token) return null;
    const res = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return null;
    const data = await res.json();
    return { email: data.email, name: data.name, picture: data.picture };
  },
};
