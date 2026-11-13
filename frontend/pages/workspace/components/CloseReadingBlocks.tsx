import type { ReactElement } from 'react';
import ReactMarkdown from 'react-markdown';
import { CornerUpLeft } from 'lucide-react';
import type { CloseReadingBlock } from '@/features/reading/close-reading-blocks';

interface CloseReadingBlocksProps {
  blocks: CloseReadingBlock[];
  /** Jumps to a source paragraph by its 1-based number; omitted where no source is shown. */
  onShowParagraph?: (paragraphNumber: number) => void;
}

const LABEL_CLASS_NAME = 'not-prose font-mono text-[11px] font-black uppercase tracking-[0.1em] text-muted-foreground';

function BlockLabel({
  block,
  onShowParagraph,
}: {
  block: CloseReadingBlock;
  onShowParagraph?: (paragraphNumber: number) => void;
}): ReactElement | null {
  if (block.kind === 'untagged') return null;
  if (block.kind !== 'paragraph') {
    return <p className={LABEL_CLASS_NAME}>{block.kind === 'overview' ? 'Overview' : 'Synthesis'}</p>;
  }

  const paragraphNumber = block.paragraphNumber ?? 0;
  if (!onShowParagraph) {
    return <p className={LABEL_CLASS_NAME}>Paragraph {paragraphNumber}</p>;
  }

  return (
    <button
      type="button"
      aria-label={`Show paragraph ${paragraphNumber} in source`}
      title="Show in source"
      onClick={() => onShowParagraph(paragraphNumber)}
      className={`${LABEL_CLASS_NAME} inline-flex min-h-8 items-center gap-1.5 border-2 border-border bg-background px-2 text-foreground hover:bg-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`}
    >
      <CornerUpLeft className="h-3.5 w-3.5" aria-hidden="true" />
      Paragraph {paragraphNumber}
    </button>
  );
}

export function CloseReadingBlocks({
  blocks,
  onShowParagraph,
}: CloseReadingBlocksProps): ReactElement {
  return (
    <>
      {blocks.map((block, index) => (
        <section
          key={`${block.kind}-${block.paragraphNumber ?? ''}-${index}`}
          data-close-reading-block={block.kind}
          className="mt-8 border-t-2 border-border/20 pt-5 first:mt-0 first:border-t-0 first:pt-0"
        >
          <BlockLabel block={block} onShowParagraph={onShowParagraph} />
          <ReactMarkdown>{block.content}</ReactMarkdown>
        </section>
      ))}
    </>
  );
}
