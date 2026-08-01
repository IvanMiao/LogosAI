import { useRef, useState, type ChangeEvent, type ReactElement } from 'react';
import { BookOpen, Upload, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { WorkspaceController } from '../workspace.types';

interface ImportPanelProps {
  importState: WorkspaceController['importState'];
  onPasteTextChange: (text: string) => void;
  onImportPastedText: () => void;
  onImportTextFile: (file: File | null) => Promise<void>;
}

export function ImportPanel({
  importState,
  onPasteTextChange,
  onImportPastedText,
  onImportTextFile,
}: ImportPanelProps): ReactElement {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isPasteEditorOpen, setIsPasteEditorOpen] = useState(false);
  const hasPasteText = importState.pasteText.trim().length > 0;

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    void onImportTextFile(event.target.files?.[0] ?? null);
    event.target.value = '';
  };

  return (
    <section aria-labelledby="import-heading" className="px-4 py-10 sm:py-16">
      <div className="mx-auto max-w-3xl border-2 border-border bg-card p-5 shadow-[8px_8px_0px_0px_var(--border)] sm:p-8">
        <p className="mb-5 border-b-2 border-border pb-3 text-xs font-black uppercase tracking-[0.18em] text-muted-foreground">
          Import_Text
        </p>
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center border-2 border-border bg-secondary shadow-[4px_4px_0px_0px_var(--border)]">
            <BookOpen className="h-5 w-5" />
          </span>
          <div>
            <h1 id="import-heading" className="text-2xl font-black">Start with a text</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Paste a passage or open a local Markdown or text file.
            </p>
          </div>
        </div>

        {isPasteEditorOpen ? (
          <div className="mt-8 border-t-2 border-border pt-5">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-sm font-black">Paste source text</h2>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="Close paste editor"
                onClick={() => setIsPasteEditorOpen(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <textarea
              autoFocus
              value={importState.pasteText}
              onChange={(event) => onPasteTextChange(event.target.value)}
              placeholder="Paste source text here..."
              rows={10}
              className="mt-3 w-full resize-y border-2 border-border bg-input p-3 font-sans text-base leading-7 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            {importState.importError ? (
              <p role="alert" className="mt-2 text-sm font-bold text-destructive">
                {importState.importError}
              </p>
            ) : null}
            <div className="mt-4 flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => setIsPasteEditorOpen(false)}>
                Cancel
              </Button>
              <Button type="button" onClick={onImportPastedText} disabled={!hasPasteText}>
                Start reading
              </Button>
            </div>
          </div>
        ) : (
          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            <Button type="button" size="lg" variant="outline" onClick={() => setIsPasteEditorOpen(true)}>
              <BookOpen className="h-4 w-4" />
              Paste text
            </Button>
            <Button type="button" size="lg" variant="outline" onClick={() => fileInputRef.current?.click()}>
              <Upload className="h-4 w-4" />
              Open file
            </Button>
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept=".txt,.md,text/plain,text/markdown"
          className="sr-only"
          onChange={handleFileChange}
        />
      </div>
    </section>
  );
}
