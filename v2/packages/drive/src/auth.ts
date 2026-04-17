export interface UserProfile {
  email: string;
  name: string;
  picture?: string;
}

export interface AuthProvider {
  getAccessToken(): Promise<string | null>;
  signIn(): Promise<string>;
  signOut(): Promise<void>;
  getProfile(): Promise<UserProfile | null>;
}

let provider: AuthProvider | null = null;

export function setAuthProvider(p: AuthProvider) {
  provider = p;
}

export function getAuthProvider(): AuthProvider {
  if (!provider) throw new Error('Auth provider not initialized. Call setAuthProvider() first.');
  return provider;
}

export async function getAccessToken(): Promise<string | null> {
  return getAuthProvider().getAccessToken();
}

export async function isSignedIn(): Promise<boolean> {
  const token = await getAccessToken();
  return token !== null;
}
