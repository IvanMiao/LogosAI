import { describe, expect, it } from 'vitest';
import {
  createSecretHint,
  decryptUserSecret,
  encryptUserSecret,
} from '../src/security/secret-encryption';

const ENCRYPTION_KEY = btoa(String.fromCharCode(...new Uint8Array(32).fill(7)));

describe('user secret encryption', () => {
  it('round-trips a secret only for the same user', async () => {
    const encrypted = await encryptUserSecret(
      'gemini-secret-value',
      ENCRYPTION_KEY,
      'user-1',
    );

    await expect(
      decryptUserSecret(encrypted, ENCRYPTION_KEY, 'user-1'),
    ).resolves.toBe('gemini-secret-value');
    await expect(
      decryptUserSecret(encrypted, ENCRYPTION_KEY, 'user-2'),
    ).rejects.toMatchObject({ code: 'CREDENTIAL_DECRYPTION_FAILED' });
  });

  it('shows only the final four characters in a hint', () => {
    expect(createSecretHint('gemini-secret-value')).toBe('•••• alue');
  });
});
