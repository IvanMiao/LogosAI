import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { SiteFooter } from '@/components/SiteFooter';
import { AuthContext } from '@/features/auth/auth-context';
import { LandingPage } from '@/pages/landing';
import { WorkspacePage } from '@/pages/workspace';

const anonymousAuth = {
  user: null,
  status: 'anonymous' as const,
  refreshSession: async () => undefined,
  signOut: async () => undefined,
};

describe('Share feedback footer', () => {
  it('opens the Tally form in a new tab', () => {
    render(<SiteFooter source="landing" />);

    const link = screen.getByRole('link', { name: 'Share feedback' });
    expect(link).toHaveAttribute('href', 'https://tally.so/r/68E7VP?source=landing');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('places the survey at the bottom of the landing page', () => {
    render(
      <MemoryRouter>
        <AuthContext.Provider value={anonymousAuth}>
          <LandingPage />
        </AuthContext.Provider>
      </MemoryRouter>,
    );

    expect(screen.getByRole('link', { name: 'Share feedback' })).toHaveAttribute(
      'href',
      'https://tally.so/r/68E7VP?source=landing',
    );
  });

  it('keeps the workspace survey link below the reading surface', () => {
    render(
      <MemoryRouter>
        <WorkspacePage userId="test-user" hasApiKey={false} model="gemini-2.5-flash" />
      </MemoryRouter>,
    );

    const main = screen.getByRole('main');
    const feedback = screen.getByRole('link', { name: 'Share feedback' });
    expect(main).toContainElement(feedback);
    expect(feedback).toHaveAttribute('href', 'https://tally.so/r/68E7VP?source=workspace');
  });
});
