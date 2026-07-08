import { useRef, useState, type ChangeEvent } from 'react';
import ReactMarkdown from 'react-markdown';
import { Link, useNavigate } from 'react-router-dom';
import type { TextAnchor } from '@/features/anchors';
import type { Artifact } from '@/features/artifacts';
import type { AnchorSkill } from '@/client-api/anchorApi';
import type { HistoryItem } from '@/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/utils/className';
import {
  BookOpen,
  Brain,
  Copy,
  Eraser,
  FileText,
  History,
  Info,
  KeyRound,
  Languages,
  List,
  Loader2,
  Menu,
  PanelRight,
  RotateCcw,
  SlidersHorizontal,
  Settings,
  Square,
  Upload,
} from 'lucide-react';
import {
  formatDocumentMeta,
  splitDocumentParagraphsWithOffsets,
} from './workspace.helpers';
import { useWorkspace } from './useWorkspace';
import type {
  AnchorMarkStatus,
  ReaderFontFamily,
  ReaderPreferences,
  SelectionToolbarPlacement,
  WorkspaceController,
  WorkspaceDocument,
  WorkspacePageProps,
  WorkspaceViewModel,
} from './workspace.types';

function GlobalAppBar({
  viewModel,
  onOpenHistory,
}: {
  viewModel: WorkspaceViewModel;
  onOpenHistory: () => void;
}) {
  const navigate = useNavigate();
  const statusClassName = cn(
    'flex h-9 items-center gap-2 border-2 border-border px-2 text-xs font-bold shadow-[2px_2px_0px_0px_var(--border)] sm:px-3',
    viewModel.apiKeyStatusTone === 'ready' ? 'bg-secondary' : 'bg-accent',
  );

  return (
    <header className="border-b-2 border-border bg-card">
      <div className="mx-auto flex min-h-14 max-w-7xl items-center justify-between gap-3 px-3 py-2 sm:px-4">
        <button
          type="button"
          onClick={() => navigate('/app')}
          className="flex min-w-0 items-center gap-3 border-0 bg-transparent p-0 text-left"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center border-2 border-border bg-primary shadow-[2px_2px_0px_0px_var(--border)]">
            <Brain className="h-5 w-5" />
          </span>
          <span className="min-w-0">
            <span className="block truncate text-lg font-black leading-tight">LogosAI</span>
            <span className="block truncate text-xs text-muted-foreground">Workspace Alpha</span>
          </span>
        </button>

        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={() => navigate('/app/settings')}
            className={statusClassName}
            aria-label={viewModel.apiKeyStatusLabel}
            title={viewModel.apiKeyStatusLabel}
          >
            <KeyRound className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{viewModel.apiKeyStatusLabel}</span>
          </button>
          <Badge variant="outline" className="hidden border-2 border-border bg-background text-xs font-bold sm:block">
            {viewModel.modelLabel}
          </Badge>
          <Button type="button" variant="outline" size="icon" aria-label="Open legacy history" onClick={onOpenHistory} className="h-9 w-9">
            <History className="h-4 w-4" />
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button aria-label="Open app menu" variant="secondary" size="icon" className="h-9 w-9">
                <Menu className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem onClick={() => navigate('/app/settings')} className="gap-2">
                <Settings className="h-4 w-4" />
                <span>Settings</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate('/app/about')} className="gap-2">
                <Info className="h-4 w-4" />
                <span>About</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate('/app/analysis')} className="gap-2">
                <FileText className="h-4 w-4" />
                <span>Legacy analysis</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}

function ImportPanel({
  importState,
  onPasteTextChange,
  onImportPastedText,
  onImportTextFile,
}: {
  importState: WorkspaceController['importState'];
  onPasteTextChange: (text: string) => void;
  onImportPastedText: () => void;
  onImportTextFile: (file: File | null) => Promise<void>;
}) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const hasPasteText = importState.pasteText.trim().length > 0;

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    void onImportTextFile(event.target.files?.[0] ?? null);
    event.target.value = '';
  };

  return (
    <section className="border-b-2 border-border bg-background">
      <div className="mx-auto grid max-w-7xl gap-4 px-3 py-4 sm:px-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="border-2 border-border bg-card p-4 shadow-[4px_4px_0px_0px_var(--border)]">
          <div className="flex items-start gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center border-2 border-border bg-secondary shadow-[2px_2px_0px_0px_var(--border)]">
              <BookOpen className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <h1 className="text-xl font-black leading-tight">Import a text to start reading</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
                Paste text or open a local Markdown or text file. The reader, anchors, and artifacts live in this workspace.
              </p>
              <textarea
                value={importState.pasteText}
                onChange={(event) => onPasteTextChange(event.target.value)}
                placeholder="Paste source text here..."
                rows={5}
                className="mt-4 w-full resize-y border-2 border-border bg-input p-3 text-sm leading-6 shadow-[2px_2px_0px_0px_var(--border)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
              {importState.importError ? (
                <p role="alert" className="mt-2 text-sm font-bold text-destructive">
                  {importState.importError}
                </p>
              ) : null}
              <div className="mt-4 flex flex-wrap gap-2">
                <Button type="button" onClick={onImportPastedText} disabled={!hasPasteText}>
                  <BookOpen className="h-4 w-4" />
                  Paste text
                </Button>
                <Button type="button" variant="secondary" onClick={() => fileInputRef.current?.click()}>
                  <Upload className="h-4 w-4" />
                  Open file
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".txt,.md,text/plain,text/markdown"
                  className="sr-only"
                  onChange={handleFileChange}
                />
              </div>
            </div>
          </div>
        </div>
        <aside className="border-2 border-border bg-card p-4 shadow-[4px_4px_0px_0px_var(--border)]">
          <h2 className="text-sm font-black">Session</h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            No active document yet. Reader state appears here after import.
          </p>
        </aside>
      </div>
    </section>
  );
}

function ReaderSettings({
  preferences,
  onPreferenceChange,
}: {
  preferences: ReaderPreferences;
  onPreferenceChange: WorkspaceController['updateReaderPreference'];
}) {
  const fontOptions: Array<{ label: string; value: ReaderFontFamily }> = [
    { label: 'Serif', value: 'serif' },
    { label: 'Sans', value: 'sans' },
    { label: 'Mono', value: 'mono' },
  ];

  return (
    <div className="flex flex-wrap items-center gap-2">
      {fontOptions.map((option) => (
        <Button
          key={option.value}
          type="button"
          variant={preferences.fontFamily === option.value ? 'default' : 'outline'}
          size="sm"
          onClick={() => onPreferenceChange('fontFamily', option.value)}
        >
          {option.label}
        </Button>
      ))}
      <label className="flex items-center gap-2 text-xs font-bold">
        Size
        <input
          type="range"
          min={16}
          max={22}
          value={preferences.fontSize}
          onChange={(event) => onPreferenceChange('fontSize', Number(event.target.value))}
          className="w-24 accent-black"
        />
      </label>
      <label className="flex items-center gap-2 text-xs font-bold">
        Spacing
        <input
          type="range"
          min={1.4}
          max={2}
          step={0.05}
          value={preferences.lineSpacing}
          onChange={(event) => onPreferenceChange('lineSpacing', Number(event.target.value))}
          className="w-24 accent-black"
        />
      </label>
    </div>
  );
}

function ReaderToolbar({
  activeDocument,
  preferences,
  onPreferenceChange,
  onClearDocument,
  onCloseReadDocument,
  onOpenContextPanel,
}: {
  activeDocument: WorkspaceDocument | null;
  preferences: ReaderPreferences;
  onPreferenceChange: WorkspaceController['updateReaderPreference'];
  onClearDocument: () => void;
  onCloseReadDocument: () => void;
  onOpenContextPanel: () => void;
}) {
  if (!activeDocument) {
    return null;
  }

  return (
    <div className="border-b-2 border-border bg-card px-3 py-3 sm:px-4">
      <div className="mx-auto flex max-w-7xl flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <h1 className="truncate text-lg font-black">{activeDocument.title}</h1>
          <p className="mt-1 text-xs text-muted-foreground">{formatDocumentMeta(activeDocument)}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="flex items-center gap-2 text-xs font-black">
            <SlidersHorizontal className="h-4 w-4" />
            Reading
          </span>
          <ReaderSettings preferences={preferences} onPreferenceChange={onPreferenceChange} />
          <Button type="button" variant="secondary" size="sm" onClick={onCloseReadDocument}>
            <Brain className="h-4 w-4" />
            Close Read
          </Button>
          <Button type="button" variant="outline" size="icon" aria-label="Open context panel" onClick={onOpenContextPanel} className="lg:hidden">
            <PanelRight className="h-4 w-4" />
          </Button>
          <Button type="button" variant="ghost" size="icon" aria-label="Close document" onClick={onClearDocument}>
            <Eraser className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

function EmptyReadingSurface() {
  return (
    <section aria-label="Reading surface" className="min-h-[420px] bg-[#fbfbf8] px-3 py-6 sm:px-4">
      <div className="mx-auto max-w-[780px] border border-dashed border-muted-foreground/50 bg-white p-6 text-center">
        <BookOpen className="mx-auto h-8 w-8 text-muted-foreground" />
        <h2 className="mt-3 text-lg font-black">Reading surface</h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Imported paragraphs will render here in a calm bounded column.
        </p>
      </div>
    </section>
  );
}

function getReaderFontClass(fontFamily: ReaderFontFamily): string {
  if (fontFamily === 'sans') {
    return 'font-sans';
  }

  if (fontFamily === 'mono') {
    return 'font-mono';
  }

  return 'font-serif';
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

function AnchorMark({
  anchor,
  status,
  onSelectAnchor,
}: {
  anchor: TextAnchor;
  status: AnchorMarkStatus;
  onSelectAnchor: (anchorId: string) => void;
}) {
  return (
    <button
      type="button"
      aria-label={`Open ${status} selection`}
      title={`${status} selection`}
      onClick={() => onSelectAnchor(anchor.id)}
      className={cn(
        'h-5 w-5 border-2 border-border shadow-[2px_2px_0px_0px_var(--border)]',
        getAnchorMarkClassName(status),
      )}
    />
  );
}

function ReadingSurface({
  activeDocument,
  preferences,
  activeAnchor,
  anchors,
  anchorMarkStatusById,
  selectionToolbarPlacement,
  onCreateSelectionAnchor,
  onRunSkill,
  onStartNote,
  onSelectAnchor,
  onCloseReadParagraph,
}: {
  activeDocument: WorkspaceDocument | null;
  preferences: ReaderPreferences;
  activeAnchor: TextAnchor | null;
  anchors: TextAnchor[];
  anchorMarkStatusById: Record<string, AnchorMarkStatus>;
  selectionToolbarPlacement: SelectionToolbarPlacement | null;
  onCreateSelectionAnchor: WorkspaceController['createSelectionAnchor'];
  onRunSkill: (skill: AnchorSkill) => void;
  onStartNote: () => void;
  onSelectAnchor: (anchorId: string) => void;
  onCloseReadParagraph: WorkspaceController['runCloseReadParagraph'];
}) {
  const articleRef = useRef<HTMLElement | null>(null);

  if (!activeDocument) {
    return <EmptyReadingSurface />;
  }

  const paragraphs = splitDocumentParagraphsWithOffsets(activeDocument.text);
  const fontClassName = getReaderFontClass(preferences.fontFamily);

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

    const rect = range.getBoundingClientRect();
    onCreateSelectionAnchor(selectedText, {
      top: Math.max(56, rect.top - 8),
      left: Math.max(12, Math.min(rect.left, window.innerWidth - 260)),
    });
  };

  return (
    <section aria-label="Reading surface" className="reader-surface min-h-[520px] bg-[#fbfbf8] px-3 py-8 sm:px-4">
      <article
        ref={articleRef}
        className={cn('mx-auto max-w-[780px] text-[#171717]', fontClassName)}
        style={{ fontSize: `${preferences.fontSize}px`, lineHeight: preferences.lineSpacing }}
        onMouseUp={handleSelection}
        onKeyUp={handleSelection}
      >
        {paragraphs.map((paragraph, index) => {
          const paragraphAnchors = anchors.filter((anchor) => (
            anchor.startOffset >= paragraph.startOffset && anchor.startOffset < paragraph.endOffset
          ));

          return (
            <div key={`${activeDocument.id}-${index}`} className="grid grid-cols-[1.75rem_minmax(0,1fr)] gap-3">
              <div className="flex flex-col items-center gap-2 pt-1">
                <button
                  type="button"
                  aria-label="Close read paragraph"
                  title="Close read paragraph"
                  onClick={() => {
                    void onCloseReadParagraph(paragraph);
                  }}
                  className="flex h-5 w-5 items-center justify-center border-2 border-border bg-background shadow-[2px_2px_0px_0px_var(--border)] hover:bg-primary"
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
              <p className="mb-6 whitespace-pre-wrap">{paragraph.text}</p>
            </div>
          );
        })}
      </article>
      <SelectionToolbar
        activeAnchor={activeAnchor}
        placement={selectionToolbarPlacement}
        onRunSkill={onRunSkill}
        onStartNote={onStartNote}
      />
    </section>
  );
}

function SelectionToolbar({
  activeAnchor,
  placement,
  onRunSkill,
  onStartNote,
}: {
  activeAnchor: TextAnchor | null;
  placement: SelectionToolbarPlacement | null;
  onRunSkill: (skill: AnchorSkill) => void;
  onStartNote: () => void;
}) {
  if (!activeAnchor || !placement) {
    return null;
  }

  return (
    <>
      <div
        className="fixed z-40 hidden -translate-y-full gap-2 border-2 border-border bg-card p-2 shadow-[4px_4px_0px_0px_var(--border)] sm:flex"
        style={{ top: placement.top, left: placement.left }}
        role="toolbar"
        aria-label="Selection actions"
      >
        <Button type="button" size="sm" onClick={() => onRunSkill('explain')}>
          Explain
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={() => onRunSkill('translate')}>
          Translate
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={() => onRunSkill('vocab')}>
          Vocab
        </Button>
        <Button type="button" size="sm" variant="secondary" onClick={onStartNote}>
          Note
        </Button>
      </div>
      <div
        className="fixed inset-x-0 bottom-0 z-40 flex gap-2 border-t-2 border-border bg-card p-3 shadow-[0_-4px_0px_0px_var(--border)] sm:hidden"
        role="toolbar"
        aria-label="Selection actions"
      >
        <Button type="button" className="flex-1" size="sm" onClick={() => onRunSkill('explain')}>
          Explain
        </Button>
        <Button type="button" className="flex-1" size="sm" variant="outline" onClick={() => onRunSkill('translate')}>
          Translate
        </Button>
        <Button type="button" className="flex-1" size="sm" variant="outline" onClick={() => onRunSkill('vocab')}>
          Vocab
        </Button>
        <Button type="button" className="flex-1" size="sm" variant="secondary" onClick={onStartNote}>
          Note
        </Button>
      </div>
    </>
  );
}

function getArtifactLabel(artifact: Artifact): string {
  const labels: Record<Artifact['type'], string> = {
    close_read: 'Close Read',
    explanation: 'Explanation',
    note: 'Note',
    translation: 'Translation',
    vocabulary: 'Vocabulary',
  };

  return labels[artifact.type];
}

function ArtifactTypeIcon({ type }: { type: Artifact['type'] }) {
  if (type === 'translation') {
    return <Languages className="h-4 w-4" />;
  }

  if (type === 'vocabulary') {
    return <List className="h-4 w-4" />;
  }

  return <Brain className="h-4 w-4" />;
}

function ActiveArtifact({
  artifact,
  onStopArtifact,
  onRetryArtifact,
}: {
  artifact: Artifact | null;
  onStopArtifact: (artifact: Artifact) => void;
  onRetryArtifact: (artifact: Artifact) => void;
}) {
  if (!artifact) {
    return (
      <div className="mt-4 border-2 border-dashed border-muted-foreground/40 bg-background p-3">
        <p className="text-sm leading-6 text-muted-foreground">No artifacts for this selection yet.</p>
      </div>
    );
  }

  return (
    <div className="mt-4 border-2 border-border bg-background p-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          {artifact.status === 'running' ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {artifact.status === 'running' ? null : <ArtifactTypeIcon type={artifact.type} />}
          <h3 className="truncate text-sm font-black">{getArtifactLabel(artifact)}</h3>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span className="text-xs font-bold text-muted-foreground">{artifact.status}</span>
          {artifact.status === 'running' ? (
            <Button type="button" size="icon" variant="ghost" aria-label="Stop artifact" onClick={() => onStopArtifact(artifact)}>
              <Square className="h-4 w-4" />
            </Button>
          ) : null}
          {artifact.status === 'failed' || artifact.status === 'stopped' ? (
            <Button type="button" size="icon" variant="ghost" aria-label="Retry artifact" onClick={() => onRetryArtifact(artifact)}>
              <RotateCcw className="h-4 w-4" />
            </Button>
          ) : null}
        </div>
      </div>
      {artifact.errorMessage ? (
        <div role="alert" className="mt-3 border-2 border-destructive bg-destructive/10 p-2">
          <p className="text-sm font-bold text-destructive">{artifact.errorMessage}</p>
          {artifact.traceId ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="mt-2"
              onClick={() => {
                void navigator.clipboard.writeText(artifact.traceId ?? '');
              }}
            >
              <Copy className="h-4 w-4" />
              Copy trace
            </Button>
          ) : null}
        </div>
      ) : null}
      {artifact.content ? (
        <div className="prose prose-sm mt-3 max-w-none font-sans text-sm">
          <ReactMarkdown>{artifact.content}</ReactMarkdown>
        </div>
      ) : (
        <p className="mt-3 text-sm leading-6 text-muted-foreground">Draft started.</p>
      )}
    </div>
  );
}

function PastArtifactList({ artifacts }: { artifacts: Artifact[] }) {
  if (artifacts.length === 0) {
    return null;
  }

  return (
    <div className="mt-5">
      <h3 className="text-xs font-black uppercase tracking-wide text-muted-foreground">Past artifacts</h3>
      <div className="mt-2 space-y-2">
        {artifacts.map((artifact) => (
          <div key={artifact.id} className="border border-border bg-background p-2">
            <p className="text-xs font-black">{getArtifactLabel(artifact)}</p>
            <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground">{artifact.content || artifact.status}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function ContextPanel({
  activeAnchor,
  anchors,
  activeAnchorId,
  activeArtifact,
  pastArtifacts,
  noteDraftContent,
  onSelectAnchor,
  onNoteDraftChange,
  onRunSkill,
  onStopArtifact,
  onRetryArtifact,
}: {
  activeAnchor: TextAnchor | null;
  anchors: TextAnchor[];
  activeAnchorId: string | null;
  activeArtifact: Artifact | null;
  pastArtifacts: Artifact[];
  noteDraftContent: string;
  onSelectAnchor: (anchorId: string) => void;
  onNoteDraftChange: (content: string) => void;
  onRunSkill: (skill: AnchorSkill) => void;
  onStopArtifact: (artifact: Artifact) => void;
  onRetryArtifact: (artifact: Artifact) => void;
}) {
  return (
    <aside aria-label="Context panel" className="border-t-2 border-border bg-card p-4 lg:border-l-2 lg:border-t-0">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-black">Context</h2>
        <PanelRight className="h-4 w-4 text-muted-foreground" />
      </div>
      {activeAnchor ? (
        <>
          <div className="mt-4 border-l-4 border-primary bg-background p-3">
            <p className="text-xs font-black uppercase tracking-wide text-muted-foreground">Selection</p>
            <p className="mt-2 text-sm leading-6">{activeAnchor.quote}</p>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2">
            <Button type="button" size="sm" onClick={() => onRunSkill('explain')}>Explain</Button>
            <Button type="button" size="sm" variant="outline" onClick={() => onRunSkill('translate')}>Translate</Button>
            <Button type="button" size="sm" variant="outline" onClick={() => onRunSkill('vocab')}>Vocab</Button>
          </div>
          <label className="mt-4 block text-xs font-black uppercase tracking-wide text-muted-foreground">
            Note draft
            <textarea
              value={noteDraftContent}
              onChange={(event) => onNoteDraftChange(event.target.value)}
              placeholder="Write a note attached to this selection..."
              rows={4}
              className="mt-2 w-full resize-y border-2 border-border bg-background p-2 text-sm normal-case leading-6 tracking-normal text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </label>
          <ActiveArtifact
            artifact={activeArtifact}
            onStopArtifact={onStopArtifact}
            onRetryArtifact={onRetryArtifact}
          />
          <PastArtifactList artifacts={pastArtifacts} />
        </>
      ) : (
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          Select text in the reader to create a source-linked context.
        </p>
      )}
      {anchors.length > 0 ? (
        <div className="mt-5">
          <h3 className="text-xs font-black uppercase tracking-wide text-muted-foreground">Recent selections</h3>
          <div className="mt-3 space-y-2">
            {anchors.map((anchor) => (
              <button
                key={anchor.id}
                type="button"
                onClick={() => onSelectAnchor(anchor.id)}
                className={cn(
                  'block w-full border-2 border-border bg-background p-2 text-left text-sm leading-5',
                  activeAnchorId === anchor.id ? 'shadow-[2px_2px_0px_0px_var(--border)]' : '',
                )}
              >
                {anchor.quote}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </aside>
  );
}

function ReaderWorkspace({
  activeDocument,
  preferences,
  activeAnchor,
  anchors,
  activeAnchorId,
  activeArtifact,
  pastArtifacts,
  noteDraftContent,
  anchorMarkStatusById,
  selectionToolbarPlacement,
  onPreferenceChange,
  onClearDocument,
  onCreateSelectionAnchor,
  onRunSkill,
  onSelectAnchor,
  onNoteDraftChange,
  onCloseReadDocument,
  onCloseReadParagraph,
  onStopArtifact,
  onRetryArtifact,
  isContextPanelOpen,
  onContextPanelOpenChange,
}: {
  activeDocument: WorkspaceDocument | null;
  preferences: ReaderPreferences;
  activeAnchor: TextAnchor | null;
  anchors: TextAnchor[];
  activeAnchorId: string | null;
  activeArtifact: Artifact | null;
  pastArtifacts: Artifact[];
  noteDraftContent: string;
  anchorMarkStatusById: Record<string, AnchorMarkStatus>;
  selectionToolbarPlacement: SelectionToolbarPlacement | null;
  onPreferenceChange: WorkspaceController['updateReaderPreference'];
  onClearDocument: () => void;
  onCreateSelectionAnchor: WorkspaceController['createSelectionAnchor'];
  onRunSkill: (skill: AnchorSkill) => void;
  onSelectAnchor: (anchorId: string) => void;
  onNoteDraftChange: (content: string) => void;
  onCloseReadDocument: () => void;
  onCloseReadParagraph: WorkspaceController['runCloseReadParagraph'];
  onStopArtifact: (artifact: Artifact) => void;
  onRetryArtifact: (artifact: Artifact) => void;
  isContextPanelOpen: boolean;
  onContextPanelOpenChange: (open: boolean) => void;
}) {
  const contextPanel = (
    <ContextPanel
      activeAnchor={activeAnchor}
      anchors={anchors}
      activeAnchorId={activeAnchorId}
      activeArtifact={activeArtifact}
      pastArtifacts={pastArtifacts}
      noteDraftContent={noteDraftContent}
      onSelectAnchor={onSelectAnchor}
      onNoteDraftChange={onNoteDraftChange}
      onRunSkill={onRunSkill}
      onStopArtifact={onStopArtifact}
      onRetryArtifact={onRetryArtifact}
    />
  );

  return (
    <>
      <ReaderToolbar
        activeDocument={activeDocument}
        preferences={preferences}
        onPreferenceChange={onPreferenceChange}
        onClearDocument={onClearDocument}
        onCloseReadDocument={onCloseReadDocument}
        onOpenContextPanel={() => onContextPanelOpenChange(true)}
      />
      <div className="mx-auto grid max-w-7xl lg:min-h-[calc(100vh-14rem)] lg:grid-cols-[minmax(0,1fr)_340px]">
        <ReadingSurface
          activeDocument={activeDocument}
          preferences={preferences}
          activeAnchor={activeAnchor}
          anchors={anchors}
          anchorMarkStatusById={anchorMarkStatusById}
          selectionToolbarPlacement={selectionToolbarPlacement}
          onCreateSelectionAnchor={onCreateSelectionAnchor}
          onRunSkill={onRunSkill}
          onStartNote={() => onNoteDraftChange(noteDraftContent)}
          onSelectAnchor={onSelectAnchor}
          onCloseReadParagraph={onCloseReadParagraph}
        />
        <div className="hidden lg:block">{contextPanel}</div>
      </div>
      <Dialog open={isContextPanelOpen} onOpenChange={onContextPanelOpenChange}>
        <DialogContent className="left-0 top-auto bottom-0 max-h-[85vh] max-w-none translate-x-0 translate-y-0 overflow-y-auto p-0 sm:left-[50%] sm:top-[50%] sm:max-w-lg sm:translate-x-[-50%] sm:translate-y-[-50%]">
          <DialogHeader className="sr-only">
            <DialogTitle>Context panel</DialogTitle>
            <DialogDescription>Selection artifacts and note drafts.</DialogDescription>
          </DialogHeader>
          {contextPanel}
        </DialogContent>
      </Dialog>
    </>
  );
}

function HistoryDrawer({
  open,
  history,
  onOpenChange,
  onOpenAsDocument,
  onDeleteHistoryItem,
}: {
  open: boolean;
  history: HistoryItem[];
  onOpenChange: (open: boolean) => void;
  onOpenAsDocument: (item: HistoryItem) => void;
  onDeleteHistoryItem: (id: number) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="left-auto right-0 top-0 h-dvh max-h-dvh max-w-md translate-x-0 translate-y-0 overflow-y-auto p-4">
        <DialogHeader>
          <DialogTitle>Legacy history</DialogTitle>
          <DialogDescription>Open an older analysis prompt as a workspace document.</DialogDescription>
        </DialogHeader>
        <div className="mt-4 space-y-3">
          {history.length === 0 ? (
            <p className="text-sm text-muted-foreground">No legacy history yet.</p>
          ) : history.map((item) => (
            <div key={item.id} className="border-2 border-border bg-background p-3">
              <p className="line-clamp-3 text-sm leading-6">{item.prompt}</p>
              <div className="mt-3 flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  onClick={() => {
                    onOpenAsDocument(item);
                    onOpenChange(false);
                  }}
                >
                  Open as document
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  aria-label="Delete history item"
                  onClick={() => onDeleteHistoryItem(item.id)}
                >
                  Delete
                </Button>
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function WorkspacePage(props: WorkspacePageProps) {
  const workspace = useWorkspace(props);
  const [historyDrawerOpen, setHistoryDrawerOpen] = useState(false);
  const [contextPanelOpen, setContextPanelOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <GlobalAppBar
        viewModel={workspace.viewModel}
        onOpenHistory={() => setHistoryDrawerOpen(true)}
      />
      <main>
        {workspace.activeDocument ? null : (
          <ImportPanel
            importState={workspace.importState}
            onPasteTextChange={workspace.setPasteText}
            onImportPastedText={workspace.importPastedText}
            onImportTextFile={workspace.importTextFile}
          />
        )}
        <ReaderWorkspace
          activeDocument={workspace.activeDocument}
          preferences={workspace.readerPreferences}
          activeAnchor={workspace.activeAnchor}
          anchors={workspace.anchors}
          activeAnchorId={workspace.activeAnchorId}
          activeArtifact={workspace.activeArtifact}
          pastArtifacts={workspace.pastArtifacts}
          noteDraftContent={workspace.noteDraftContent}
          anchorMarkStatusById={workspace.anchorMarkStatusById}
          selectionToolbarPlacement={workspace.selectionToolbarPlacement}
          onPreferenceChange={workspace.updateReaderPreference}
          onClearDocument={workspace.clearDocument}
          onCreateSelectionAnchor={workspace.createSelectionAnchor}
          onRunSkill={(skill) => {
            setContextPanelOpen(true);
            void workspace.runAnchorSkillForActiveAnchor(skill);
          }}
          onSelectAnchor={workspace.setActiveAnchorId}
          onNoteDraftChange={workspace.updateNoteDraft}
          onCloseReadDocument={() => {
            void workspace.runCloseReadDocument();
          }}
          onCloseReadParagraph={workspace.runCloseReadParagraph}
          onStopArtifact={workspace.stopArtifact}
          onRetryArtifact={(artifact) => {
            void workspace.retryArtifact(artifact);
          }}
          isContextPanelOpen={contextPanelOpen}
          onContextPanelOpenChange={setContextPanelOpen}
        />
      </main>
      <HistoryDrawer
        open={historyDrawerOpen}
        history={workspace.history}
        onOpenChange={setHistoryDrawerOpen}
        onOpenAsDocument={workspace.openHistoryAsDocument}
        onDeleteHistoryItem={workspace.deleteHistoryItem}
      />
      <footer className="border-t-2 border-border bg-card px-3 py-3 text-xs text-muted-foreground sm:px-4">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2">
          <span>Workspace Alpha</span>
          <Link to="/app/analysis" className="font-bold underline">
            Open legacy analysis
          </Link>
        </div>
      </footer>
    </div>
  );
}
