import { useRef, type ChangeEvent, type ReactElement } from 'react';
import { Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { ImportState } from '../workspace-types';

interface ImportPanelProps {
  importState: ImportState;
  onPasteTextChange: (text: string) => void;
  onSessionTitleChange: (title: string) => void;
  onImportPastedText: () => void;
  onImportTextFile: (file: File | null) => Promise<void>;
}

function ImportFields({
  importState, onPasteTextChange, onSessionTitleChange,
}: Pick<ImportPanelProps, 'importState' | 'onPasteTextChange' | 'onSessionTitleChange'>): ReactElement {
  return (
    <>
      <label htmlFor="workspace-paste-text" className="mt-6 block text-sm font-black">
        Source text
      </label>
      <textarea
        id="workspace-paste-text"
        value={importState.pasteText}
        onChange={(event) => onPasteTextChange(event.target.value)}
        placeholder="Paste source text here..."
        rows={6}
        className="mt-2 w-full resize-y border-2 border-border bg-input p-3 font-sans text-base leading-7 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      />
      <label htmlFor="workspace-session-title" className="mt-5 block text-sm font-black">
        Session title <span className="font-normal text-muted-foreground">(optional)</span>
      </label>
      <input
        id="workspace-session-title"
        value={importState.sessionTitle}
        maxLength={160}
        onChange={(event) => onSessionTitleChange(event.target.value)}
        placeholder="Defaults to the file name or first line"
        className="mt-2 h-11 w-full border-2 border-border bg-input px-3 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      />
    </>
  );
}

export function ImportPanel(props: ImportPanelProps): ReactElement {
  const { importState, onImportPastedText, onImportTextFile } = props;
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    void onImportTextFile(event.target.files?.[0] ?? null);
    event.target.value = '';
  };

  return (
    <section aria-labelledby="import-heading" className="px-4 py-8 sm:py-12">
      <form
        className="mx-auto max-w-3xl border-2 border-border bg-card p-5 shadow-[5px_5px_0px_0px_var(--border)] sm:p-8"
        onSubmit={(event) => { event.preventDefault(); onImportPastedText(); }}
      >
        <h1 id="import-heading" className="text-2xl font-black">Start with a text</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Paste a passage or open a local Markdown or text file.
        </p>
        <ImportFields {...props} />
        {importState.importError ? (
          <div role="alert" className="mt-5 border-s-4 border-destructive bg-destructive/5 p-3 font-sans text-sm">
            <p className="font-bold text-error-foreground">{importState.importError}</p>
            <p className="mt-1 text-muted-foreground">Your pasted text and title are still here.</p>
          </div>
        ) : null}
        <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <Button type="button" variant="outline" className="h-11 shadow-none" onClick={() => fileInputRef.current?.click()}>
              <Upload className="h-4 w-4" aria-hidden="true" />Open file
            </Button>
            <span className="text-xs text-muted-foreground">.txt / .md</span>
          </div>
          <Button type="submit" className="h-11" disabled={!importState.pasteText.trim()}>Start reading</Button>
        </div>
        <input ref={fileInputRef} type="file" aria-label="Open text file" accept=".txt,.md,text/plain,text/markdown" hidden onChange={handleFileChange} />
      </form>
    </section>
  );
}
