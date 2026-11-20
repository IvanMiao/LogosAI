import { useId, useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import type { Artifact } from '@/features/artifacts';
import { Button } from '@/components/ui/button';
import { getLatestThoughtHeading } from './artifact-thinking-helpers';

export function ArtifactThinking({ artifact }: { artifact: Artifact }) {
  const panelId = useId();
  const [expanded, setExpanded] = useState(false);
  const isThinking = artifact.status === 'running' && !artifact.content;
  const latestHeading = getLatestThoughtHeading(artifact.thinking ?? '');
  const Chevron = expanded ? ChevronDown : ChevronRight;
  if (!artifact.thinking) return null;

  return (
    <section className="min-w-0 space-y-1">
      <Button
        type="button" variant="ghost" size="sm"
        aria-expanded={expanded} aria-controls={panelId}
        onClick={() => setExpanded(!expanded)}
        className="h-7 max-w-full justify-start gap-1 px-1 text-xs font-normal text-muted-foreground"
      >
        <Chevron className="h-3 w-3 shrink-0" aria-hidden="true" />
        <span className={isThinking ? 'shrink-0 animate-pulse' : 'shrink-0'}>
          {isThinking ? 'Thinking…' : expanded ? 'Hide thinking' : 'Show thinking'}
        </span>{' '}
        {isThinking && latestHeading ? <span className="truncate">{latestHeading}</span> : null}
      </Button>
      <div id={panelId} hidden={!expanded} className="prose prose-sm max-h-64 max-w-none overflow-y-auto border-l border-border py-1 pl-3 text-xs leading-relaxed text-muted-foreground [&_p]:my-2 [&_ul]:my-2 [&_h3]:my-2">
        <ReactMarkdown>{artifact.thinking}</ReactMarkdown>
      </div>
    </section>
  );
}
