import { ApiError } from '../http/api-error';

const AES_KEY_LENGTH = 32;
const AES_GCM_IV_LENGTH = 12;

export interface EncryptedSecret {
  ciphertext: string;
  iv: string;
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
}

function base64ToBytes(value: string): Uint8Array<ArrayBuffer> {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');

  try {
    const binary = atob(normalized);
    return Uint8Array.from(binary, (character) => character.charCodeAt(0));
  } catch {
    throw new ApiError(
      500,
      'INVALID_ENCRYPTION_KEY',
      'Credential encryption is not configured correctly.',
    );
  }
}

async function importEncryptionKey(encodedKey: string): Promise<CryptoKey> {
  const keyBytes = base64ToBytes(encodedKey);
  if (keyBytes.byteLength !== AES_KEY_LENGTH) {
    throw new ApiError(
      500,
      'INVALID_ENCRYPTION_KEY',
      'Credential encryption is not configured correctly.',
    );
  }

  return crypto.subtle.importKey(
    'raw',
    keyBytes,
    'AES-GCM',
    false,
    ['encrypt', 'decrypt'],
  );
}

function additionalData(userId: string): Uint8Array<ArrayBuffer> {
  return new TextEncoder().encode(`logosai:gemini-key:${userId}`);
}

export async function encryptUserSecret(
  plaintext: string,
  encodedKey: string,
  userId: string,
): Promise<EncryptedSecret> {
  const key = await importEncryptionKey(encodedKey);
  const iv = crypto.getRandomValues(new Uint8Array(AES_GCM_IV_LENGTH));
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv, additionalData: additionalData(userId) },
    key,
    new TextEncoder().encode(plaintext),
  );

  return {
    ciphertext: bytesToBase64(new Uint8Array(ciphertext)),
    iv: bytesToBase64(iv),
  };
}

export async function decryptUserSecret(
  secret: EncryptedSecret,
  encodedKey: string,
  userId: string,
): Promise<string> {
  const key = await importEncryptionKey(encodedKey);

  try {
    const plaintext = await crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: base64ToBytes(secret.iv),
        additionalData: additionalData(userId),
      },
      key,
      base64ToBytes(secret.ciphertext),
    );
    return new TextDecoder().decode(plaintext);
  } catch {
    throw new ApiError(
      500,
      'CREDENTIAL_DECRYPTION_FAILED',
      'The saved API key could not be read. Save it again in Settings.',
    );
  }
}

export function createSecretHint(secret: string): string {
  return `•••• ${secret.slice(-4)}`;
}
