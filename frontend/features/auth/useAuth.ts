import { useContext } from 'react';
import { AuthContext } from './auth-context';
import type { AuthContextValue } from './auth.types';

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider.');
  }
  return context;
}
