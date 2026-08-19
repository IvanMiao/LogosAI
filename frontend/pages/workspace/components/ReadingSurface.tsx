import { useEffect, useRef, useState, type ReactElement } from 'react';
import { Brain } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { AnchorSkill } from '@/client-api/anchorApi';
import type { TextAnchor } from '@/features/anchors';
import type { ReaderPreferences, WorkspaceDocument } from '@/features/reading';
import { cn } from '@/utils/className';
import {
  splitDocumentParagraphsWithOffsets,
  type DocumentParagraph,
} from '../workspace.helpers';
import { getReaderFontClassName } from '../reading-typography';
import type {
  AnchorMarkStatus,
  PendingSelection,
  SelectionToolbarPlacement,
  WorkspaceController,
} from '../workspace.types';

interface ReadingSurfaceProps {
  activeDocument: WorkspaceDocument;
  preferences: ReaderPreferences;
  isIndependentScroll?: boolean;
  sourceRevealRequest?: number;
  activeAnchor: TextAnchor | null;
  anchors: TextAnchor[];
  anchorMarkStatusById: Record<string, AnchorMarkStatus>;
  selectionToolbarPlacement: SelectionToolbarPlacement | null;
  onShowSelectionActions: WorkspaceController['showSelectionActions'];
  onDismissSelectionToolbar: WorkspaceController['dismissSelectionToolbar'];
  onRunSkill: (skill: AnchorSkill) => void;
  onStartNote: () => void;
  onSelectAnchor: (anchorId: string) => void;
  onCloseReadParagraph: WorkspaceController['runCloseReadParagraph'];
}

interface AnchorMarkProps {
  anchor: TextAnchor;
  status: AnchorMarkStatus;
  onSelectAnchor: (anchorId: string) => void;
}

interface SelectionToolbarProps {
  placement: SelectionToolbarPlacement | null;
  onRunSkill: (skill: AnchorSkill) => void;
  onStartNote: () => void;
}

function getAnchorMarkClassName(status: AnchorMarkStatus): string {
  if (status === 'active') {
    return 'bg-primary';
  }

  if (status === 'draft') {
    return 'bg-accent';
  }

  return 'bg-secondary';
}

function isAnchorStartInParagraph(
  activeAnchor: TextAnchor | null,
  paragraph: DocumentParagraph,
): boolean {
  if (!activeAnchor) {
    return false;
  }

  return activeAnchor.startOffset >= paragraph.startOffset
    && activeAnchor.startOffset < paragraph.endOffset;
}

function getParagraphElement(node: Node): HTMLElement | null {
  const element = node instanceof HTMLElement ? node : node.parentElement;
  return element?.closest<HTMLElement>('[data-paragraph-start]') ?? null;
}

function getOffsetWithinParagraph(
  paragraph: HTMLElement,
  container: Node,
  offset: number,
): number | null {
  const paragraphStart = Number(paragraph.dataset.paragraphStart);
  if (!Number.isInteger(paragraphStart)) {
    return null;
  }

  const prefixRange = document.createRange();
  prefixRange.selectNodeContents(paragraph);
  prefixRange.setEnd(container, offset);
  return paragraphStart + prefixRange.toString().length;
}

function getSelectionOffsets(
  range: Range,
): Pick<PendingSelection, 'startOffset' | 'endOffset'> | null {
  const startParagraph = getParagraphElement(range.startContainer);
  const endParagraph = getParagraphElement(range.endContainer);
  if (!startParagraph || !endParagraph) {
    return null;
  }

  const startOffset = getOffsetWithinParagraph(
    startParagraph,
    range.startContainer,
    range.startOffset,
  );
  const endOffset = getOffsetWithinParagraph(
    endParagraph,
    range.endContainer,
    range.endOffset,
  );
  if (startOffset === null || endOffset === null || endOffset <= startOffset) {
    return null;
  }

  return { startOffset, endOffset };
}

function AnchorMark({
  anchor,
  status,
  onSelectAnchor,
}: AnchorMarkProps): ReactElement {
  return (
    <button
      type="button"
      aria-label={`Open ${status} selection`}
      title={`${status} selection`}
      onClick={() => onSelectAnchor(anchor.id)}
      className={cn(
        'h-4 w-4 border-2 border-border shadow-[2px_2px_0px_0px_var(--border)] transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        getAnchorMarkClassName(status),
      )}
    />
  );
}

function SelectionToolbar({
  placement,
  onRunSkill,
  onStartNote,
}: SelectionToolbarProps): ReactElement | null {
  if (!placement) {
    return null;
  }

  return (
    <>
      <div
        data-selection-actions="true"
        className="fixed z-40 hidden -translate-y-full gap-1 border-2 border-border bg-card p-1 shadow-[4px_4px_0px_0px_var(--border)] sm:flex"
        style={{ top: placement.top, left: placement.left }}
        role="toolbar"
        aria-label="Selection actions"
      >
        <Button type="button" size="sm" onClick={() => onRunSkill('explain')}>Explain</Button>
        <Button type="button" size="sm" variant="ghost" onClick={() => onRunSkill('translate')}>Translate</Button>
        <Button type="button" size="sm" variant="ghost" onClick={() => onRunSkill('vocab')}>Vocab</Button>
        <Button type="button" size="sm" variant="secondary" onClick={onStartNote}>Note</Button>
      </div>
      <div
        data-selection-actions="true"
        className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-4 gap-1 border-t-2 border-border bg-card p-2 shadow-[0_-4px_0px_0px_var(--border)] sm:hidden"
        role="toolbar"
        aria-label="Selection actions"
      >
        <Button type="button" size="sm" onClick={() => onRunSkill('explain')}>Explain</Button>
        <Button type="button" size="sm" variant="ghost" onClick={() => onRunSkill('translate')}>Translate</Button>
        <Button type="button" size="sm" variant="ghost" onClick={() => onRunSkill('vocab')}>Vocab</Button>
        <Button type="button" size="sm" variant="secondary" onClick={onStartNote}>Note</Button>
      </div>
    </>
  );
}

export function ReadingSurface({
  activeDocument,
  preferences,
  isIndependentScroll = false,
  sourceRevealRequest = 0,
  activeAnchor,
  anchors,
  anchorMarkStatusById,
  selectionToolbarPlacement,
  onShowSelectionActions,
  onDismissSelectionToolbar,
  onRunSkill,
  onStartNote,
  onSelectAnchor,
  onCloseReadParagraph,
}: ReadingSurfaceProps): ReactElement {
  const articleRef = useRef<HTMLElement | null>(null);
  const [revealedAnchorId, setRevealedAnchorId] = useState<string | null>(null);
  const paragraphs = splitDocumentParagraphsWithOffsets(activeDocument.text);
  const fontClassName = getReaderFontClassName(preferences.fontFamily);

  useEffect(() => {
    if (!selectionToolbarPlacement) {
      return undefined;
    }

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (target instanceof Element && target.closest('[data-selection-actions="true"]')) {
        return;
      }
      onDismissSelectionToolbar();
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onDismissSelectionToolbar();
      }
    };

    document.addEventListener('pointerdown', handlePointerDown, true);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown, true);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onDismissSelectionToolbar, selectionToolbarPlacement]);

  useEffect(() => {
    if (sourceRevealRequest === 0 || !activeAnchor) {
      return undefined;
    }

    const anchorId = activeAnchor.id;
    setRevealedAnchorId(anchorId);
    const scrollTimer = window.setTimeout(() => {
      const source = articleRef.current?.querySelector<HTMLElement>(
        '[data-active-source="true"]',
      );
      const prefersReducedMotion = window.matchMedia?.(
        '(prefers-reduced-motion: reduce)',
      ).matches ?? false;
      source?.scrollIntoView?.({
        behavior: prefersReducedMotion ? 'auto' : 'smooth',
        block: 'center',
      });
    }, 0);
    const highlightTimer = window.setTimeout(() => {
      setRevealedAnchorId((currentAnchorId) => (
        currentAnchorId === anchorId ? null : currentAnchorId
      ));
    }, 1800);

    return () => {
      window.clearTimeout(scrollTimer);
      window.clearTimeout(highlightTimer);
    };
  }, [activeAnchor, sourceRevealRequest]);

  const handleSelection = () => {
    const selection = window.getSelection();
    const selectedText = selection?.toString() ?? '';
    if (!selection || selection.rangeCount === 0 || !selectedText.trim()) {
      return;
    }

    const range = selection.getRangeAt(0);
    if (!articleRef.current?.contains(range.commonAncestorContainer)) {
      return;
    }

    const offsets = getSelectionOffsets(range);
    if (!offsets) {
      return;
    }

    const rect = range.getBoundingClientRect();
    onShowSelectionActions(
      { selectedText, ...offsets },
      {
        top: Math.max(56, rect.top - 8),
        left: Math.max(12, Math.min(rect.left, window.innerWidth - 260)),
      },
    );
  };

  return (
    <section
      aria-label="Reading surface"
      className={cn(
        'reader-surface border-x-2 border-border bg-[#fbfbf8] px-4 py-8 sm:py-12',
        isIndependentScroll
          ? 'h-[calc(100dvh-8.25rem)] min-h-[32rem] overflow-y-auto'
          : 'min-h-[calc(100vh-7rem)]',
      )}
    >
      <article
        ref={articleRef}
        className={cn('mx-auto max-w-[780px] text-[#171717]', fontClassName)}
        style={{ fontSize: `${preferences.fontSize}px`, lineHeight: preferences.lineSpacing }}
        onMouseUp={handleSelection}
        onKeyUp={handleSelection}
      >
        {paragraphs.map((paragraph, index) => {
          const isActiveSource = isAnchorStartInParagraph(activeAnchor, paragraph);
          const isRevealedSource = isActiveSource && revealedAnchorId === activeAnchor?.id;
          const paragraphAnchors = anchors.filter((anchor) => (
            anchor.startOffset >= paragraph.startOffset && anchor.startOffset < paragraph.endOffset
          ));

          return (
            <div
              key={`${activeDocument.id}-${index}`}
              data-active-source={isActiveSource ? 'true' : undefined}
              className={cn(
                'group grid scroll-mt-36 grid-cols-1 border-l-4 border-l-transparent px-3 transition-colors duration-300 lg:grid-cols-[1.5rem_minmax(0,1fr)] lg:gap-3',
                isRevealedSource ? 'border-l-secondary bg-secondary/10' : '',
              )}
            >
              <div className="hidden flex-col items-center gap-2 pt-1 lg:flex">
                <button
                  type="button"
                  aria-label="Close read paragraph"
                  title="Close read paragraph"
                  onClick={() => {
                    void onCloseReadParagraph(paragraph);
                  }}
                  className="flex h-6 w-6 items-center justify-center border-2 border-border bg-background opacity-0 shadow-[2px_2px_0px_0px_var(--border)] transition-opacity hover:bg-primary focus:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring group-hover:opacity-100 group-focus-within:opacity-100"
                >
                  <Brain className="h-3 w-3" />
                </button>
                {paragraphAnchors.map((anchor) => (
                  <AnchorMark
                    key={anchor.id}
                    anchor={anchor}
                    status={anchorMarkStatusById[anchor.id] ?? 'saved'}
                    onSelectAnchor={onSelectAnchor}
                  />
                ))}
              </div>
              <p
                data-paragraph-start={paragraph.startOffset}
                className="mb-7 whitespace-pre-wrap"
              >
                {paragraph.text}
              </p>
            </div>
          );
        })}
      </article>
      <SelectionToolbar
        placement={selectionToolbarPlacement}
        onRunSkill={onRunSkill}
        onStartNote={onStartNote}
      />
    </section>
  );
}
