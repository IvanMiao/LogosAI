import { useEffect, useId, useRef, useState, type ReactElement } from 'react';
import { LocateFixed } from 'lucide-react';
import type { TextAnchor } from '@/features/anchors';
import { Button } from '@/components/ui/button';
import { cn } from '@/utils/class-name';

interface ExplainSourceQuoteProps {
  anchor: TextAnchor;
  canShowSource: boolean;
  onShowSource: () => void;
}

function useQuoteExpansion(quote: string) {
  const quoteRef = useRef<HTMLQuoteElement>(null);
  const [expanded, setExpanded] = useState(false);
  const [canExpand, setCanExpand] = useState(false);
  useEffect(() => {
    const element = quoteRef.current;
    if (!element) return;
    const measure = () => {
      const lineHeight = Number.parseFloat(getComputedStyle(element).lineHeight);
      setCanExpand(element.scrollHeight > lineHeight * 3 + 1);
    };
    measure();
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(measure);
    observer?.observe(element);
    document.fonts?.addEventListener('loadingdone', measure);
    return () => {
      observer?.disconnect();
      document.fonts?.removeEventListener('loadingdone', measure);
    };
  }, [quote]);
  return { quoteRef, expanded, canExpand, toggle: () => setExpanded((value) => !value) };
}

export function ExplainSourceQuote({ anchor, canShowSource, onShowSource }: ExplainSourceQuoteProps): ReactElement {
  const id = useId();
  const { quoteRef, expanded, canExpand, toggle } = useQuoteExpansion(anchor.quote);
  const labels = { paragraph: 'Paragraph', document: 'Document', selection: 'Selected text' };
  return (
    <section aria-label="Selected source">
      <div className="flex flex-wrap items-center justify-between gap-x-2">
        <p className="text-xs font-black uppercase tracking-wide text-muted-foreground">{labels[anchor.scope]}</p>
        <Button
          type="button" variant="ghost" size="sm" disabled={!canShowSource} onClick={onShowSource}
          className="min-h-10 border-0 px-1 shadow-none hover:shadow-none active:translate-none"
          aria-describedby={!canShowSource ? `${id}-unavailable` : undefined}
        >
          <LocateFixed className="h-4 w-4" aria-hidden="true" />Show in source
        </Button>
      </div>
      <blockquote
        id={id} ref={quoteRef}
        className={cn('mt-2 whitespace-pre-wrap break-words border-s-4 border-secondary ps-3 font-sans text-[15px] leading-7 text-foreground', !expanded && 'line-clamp-3')}
      >{anchor.quote}</blockquote>
      {canExpand ? (
        <Button type="button" variant="link" size="sm" className="min-h-10 px-3" aria-controls={id} aria-expanded={expanded} onClick={toggle}>
          {expanded ? 'Show less' : 'Show full quote'}
        </Button>
      ) : null}
      {!canShowSource ? (
        <p id={`${id}-unavailable`} className="mt-2 font-sans text-xs leading-5 text-muted-foreground">
          The saved quote is available, but its position in this text could not be uniquely matched.
        </p>
      ) : null}
    </section>
  );
}
