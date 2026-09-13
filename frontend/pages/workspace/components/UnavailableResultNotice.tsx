import { useEffect, useState, type ReactElement } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface UnavailableResultNoticeProps {
  onDismiss: () => void;
  onOpenHistory: () => void;
}

export function UnavailableResultNotice({ onDismiss, onOpenHistory }: UnavailableResultNoticeProps): ReactElement {
  const [isHovered, setIsHovered] = useState(false);
  const [hasFocus, setHasFocus] = useState(false);
  useEffect(() => {
    if (isHovered || hasFocus) return;
    const timeout = window.setTimeout(onDismiss, 8000);
    return () => window.clearTimeout(timeout);
  }, [hasFocus, isHovered, onDismiss]);

  return (
    <div
      className="absolute inset-x-3 bottom-3 z-30 mx-auto flex max-w-lg flex-wrap items-center gap-x-2 border-2 border-border bg-card p-3 shadow-[4px_4px_0px_0px_var(--border)]"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onFocusCapture={() => setHasFocus(true)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setHasFocus(false);
      }}
    >
      <p role="status" className="min-w-0 flex-1 text-sm">This saved result is no longer available.</p>
      <Button type="button" variant="ghost" size="icon" className="h-11 w-11 shrink-0"
        aria-label="Dismiss unavailable result notice" onClick={onDismiss}>
        <X className="h-4 w-4" aria-hidden="true" />
      </Button>
      <Button type="button" variant="link" className="min-h-11 px-0" onClick={onOpenHistory}>
        Open History
      </Button>
    </div>
  );
}
