const LEGACY_CACHE_OWNER_KEY = 'logosai.localCacheOwner:v1';

function getScopedKey(baseKey: string, scope?: string): string {
  return scope ? `${baseKey}:${scope}` : baseKey;
}

function canClaimLegacyCache(scope: string): boolean {
  const owner = localStorage.getItem(LEGACY_CACHE_OWNER_KEY);
  if (owner) return owner === scope;
  localStorage.setItem(LEGACY_CACHE_OWNER_KEY, scope);
  return true;
}

export function readScopedStorage(
  baseKey: string,
  scope?: string,
): string | null {
  const scopedValue = localStorage.getItem(getScopedKey(baseKey, scope));
  if (scopedValue !== null || !scope || !canClaimLegacyCache(scope)) {
    return scopedValue;
  }
  return localStorage.getItem(baseKey);
}

export function writeScopedStorage(
  baseKey: string,
  value: string,
  scope?: string,
): void {
  localStorage.setItem(getScopedKey(baseKey, scope), value);
}

export function removeScopedStorage(baseKey: string, scope?: string): void {
  localStorage.removeItem(getScopedKey(baseKey, scope));
}
