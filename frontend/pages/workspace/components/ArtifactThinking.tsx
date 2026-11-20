import { useId, useState } from 'react';
import { Brain } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import type { Artifact } from '@/features/artifacts';
import { Button } from '@/components/ui/button';

export function ArtifactThinking({ artifact }: { artifact: Artifact }) {
  const panelId = useId();
  const [userExpanded, setUserExpanded] = useState<boolean | null>(null);
  const isThinking = artifact.status === 'running' && !artifact.content;
  const expanded = userExpanded ?? isThinking;
  if (!artifact.thinking) return null;

  return (
    <section className="space-y-2">
      <Button
        type="button" variant="ghost" size="sm"
        aria-expanded={expanded} aria-controls={panelId}
        onClick={() => setUserExpanded(!expanded)}
        className="text-muted-foreground"
      >
        <Brain className={isThinking ? 'h-4 w-4 animate-pulse' : 'h-4 w-4'} aria-hidden="true" />
        {isThinking ? 'Thinking…' : expanded ? 'Hide thinking' : 'Show thinking'}
      </Button>
      <div id={panelId} hidden={!expanded} className="prose prose-sm max-w-none text-sm text-muted-foreground">
        <ReactMarkdown>{artifact.thinking}</ReactMarkdown>
      </div>
    </section>
  );
}
