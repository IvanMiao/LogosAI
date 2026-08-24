import { describe, expect, it } from 'vitest';
import { getSafeNextPath, validateAuthFields } from '@/pages/auth/auth-helpers';

describe('auth form helpers', () => {
  it('validates account creation fields with actionable messages', () => {
    expect(validateAuthFields({ name: '', email: 'bad', password: 'short' }, 'sign-up')).toEqual({
      name: 'Enter the name you want to use in LogosAI.',
      email: 'Enter a valid email address.',
      password: 'Use at least 10 characters for your password.',
    });
  });

  it('allows only internal post-auth redirects', () => {
    expect(getSafeNextPath('?next=%2Fapp%2Fsettings')).toBe('/app/settings');
    expect(getSafeNextPath('?next=https%3A%2F%2Fevil.example')).toBe('/app');
    expect(getSafeNextPath('?next=%2F%2Fevil.example')).toBe('/app');
    expect(getSafeNextPath('?next=%2F%5Cevil.example')).toBe('/app');
    expect(getSafeNextPath('?next=%2Fregister')).toBe('/app');
  });
});
