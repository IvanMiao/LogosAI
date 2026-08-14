/** Create a globally unique browser-owned ID with a readable domain prefix. */
export function createClientId(prefix: string): string {
  return `${prefix}-${crypto.randomUUID()}`;
}
