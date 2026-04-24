import type { AuthProvider, UserProfile } from '@lumina/drive';

const CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '603010888709-h4m431c39ar5mbnl10oh5ariq50kp4sq.apps.googleusercontent.com';
const SCOPES = 'https://www.googleapis.com/auth/drive https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email';

let accessToken: string | null = null;
let tokenClient: google.accounts.oauth2.TokenClient | null = null;

function ensureGisLoaded(): Promise<void> {
  if (typeof google !== 'undefined' && google.accounts) return Promise.resolve();
  return new Promise((resolve) => {
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.onload = () => resolve();
    document.head.appendChild(script);
  });
}

export const webAuthProvider: AuthProvider = {
  async getAccessToken() {
    return accessToken;
  },

  async signIn() {
    await ensureGisLoaded();
    return new Promise<string>((resolve, reject) => {
      tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: CLIENT_ID,
        scope: SCOPES,
        callback: (response) => {
          if (response.error) {
            reject(new Error(response.error));
            return;
          }
          accessToken = response.access_token;
          resolve(response.access_token);
        },
      });
      tokenClient.requestAccessToken();
    });
  },

  async signOut() {
    if (accessToken) {
      google.accounts.oauth2.revoke(accessToken, () => {});
    }
    accessToken = null;
  },

  async getProfile(): Promise<UserProfile | null> {
    if (!accessToken) return null;
    const res = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) return null;
    const data = await res.json();
    return { email: data.email, name: data.name, picture: data.picture };
  },
};
