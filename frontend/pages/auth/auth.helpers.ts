export type AuthMode = 'sign-in' | 'sign-up';

export interface AuthFields {
  name: string;
  email: string;
  password: string;
}

export interface AuthFieldErrors {
  name?: string;
  email?: string;
  password?: string;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateAuthFields(
  fields: AuthFields,
  mode: AuthMode,
): AuthFieldErrors {
  const errors: AuthFieldErrors = {};
  if (mode === 'sign-up' && fields.name.trim().length < 2) {
    errors.name = 'Enter the name you want to use in LogosAI.';
  }
  if (!EMAIL_PATTERN.test(fields.email.trim())) {
    errors.email = 'Enter a valid email address.';
  }
  if (fields.password.length < 10) {
    errors.password = mode === 'sign-up'
      ? 'Use at least 10 characters for your password.'
      : 'Enter your password.';
  }
  return errors;
}

export function getSafeNextPath(search: string): string {
  const next = new URLSearchParams(search).get('next');
  if (!next || next.startsWith('//') || next.includes('\\')) {
    return '/app';
  }

  const pathname = next.split(/[?#]/, 1)[0];
  return pathname === '/app' || pathname.startsWith('/app/') ? next : '/app';
}

export function getAuthErrorMessage(error: {
  code?: string;
  message?: string;
}): string {
  if (error.code?.includes('USER_ALREADY_EXISTS')) {
    return 'An account already uses this email. Sign in instead.';
  }
  if (
    error.code?.includes('INVALID_EMAIL_OR_PASSWORD')
    || error.code?.includes('INVALID_PASSWORD')
  ) {
    return 'Email or password is incorrect. Try again.';
  }
  return error.message || 'Unable to continue. Check your details and try again.';
}
