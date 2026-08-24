export interface AuthUser {
  id: string;
  name: string;
  email: string;
  image?: string | null;
}

export type AuthStatus = 'loading' | 'authenticated' | 'anonymous';

export interface AuthContextValue {
  user: AuthUser | null;
  status: AuthStatus;
  refreshSession: () => Promise<void>;
  signOut: () => Promise<void>;
}
