import {
  useCallback,
  useMemo,
  type ReactElement,
  type ReactNode,
} from 'react';
import { authClient } from './auth-client';
import { AuthContext } from './auth-context';
import type { AuthContextValue, AuthStatus } from './auth.types';

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps): ReactElement {
  const { data, isPending, refetch } = authClient.useSession();
  const user = data?.user ?? null;
  const status: AuthStatus = isPending
    ? 'loading'
    : user
      ? 'authenticated'
      : 'anonymous';

  const refreshSession = useCallback(async () => {
    await refetch();
  }, [refetch]);

  const signOut = useCallback(async () => {
    await authClient.signOut();
    await refetch();
  }, [refetch]);

  const value = useMemo<AuthContextValue>(() => ({
    user,
    status,
    refreshSession,
    signOut,
  }), [refreshSession, signOut, status, user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
