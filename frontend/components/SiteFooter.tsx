import type { ReactElement } from 'react';
import { getFeedbackFormUrl, type FeedbackSource } from '@/features/feedback';

interface SiteFooterProps {
  source: FeedbackSource;
}

export function SiteFooter({ source }: SiteFooterProps): ReactElement {
  return (
    <footer className="mt-8 shrink-0 border-t-2 border-border px-4 py-3">
      <a
        href={getFeedbackFormUrl(source)}
        target="_blank"
        rel="noopener noreferrer"
        className="mx-auto block w-fit font-mono text-xs text-muted-foreground underline-offset-4 hover:underline"
      >
        Share feedback
      </a>
    </footer>
  );
}
