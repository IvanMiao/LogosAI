import { describe, expect, it } from 'vitest';
import { mapGitHubProfileToUser } from '../src/auth/auth';

describe('GitHub profile mapping', () => {
  it('uses the provider email when GitHub returns one', () => {
    expect(mapGitHubProfileToUser({ id: 42, email: 'reader@example.com' }))
      .toEqual({ email: 'reader@example.com' });
  });

  it('creates a reserved fallback for email-less GitHub profiles', () => {
    expect(mapGitHubProfileToUser({ id: 42, email: null }))
      .toEqual({ email: 'github-42@github.oauth.invalid' });
  });
});
