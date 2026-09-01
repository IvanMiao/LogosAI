import type { ReactElement } from 'react';
import { Link } from 'react-router-dom';
import { KeyRound } from 'lucide-react';

export function MissingApiKeyBanner(): ReactElement {
  return (
    <p
      role="status"
      aria-label="Gemini API key missing"
      className="shrink-0 border-b-2 border-border bg-accent px-4 py-2 text-center font-mono text-sm font-bold text-accent-foreground"
    >
      <KeyRound className="mr-2 inline h-4 w-4 align-text-bottom" aria-hidden="true" />
      Gemini API key missing.{' '}
      <Link
        to="/app/settings"
        className="underline underline-offset-2 hover:bg-foreground hover:text-background"
      >
        Open Settings
      </Link>
      {' '}to add it.
    </p>
  );
}
