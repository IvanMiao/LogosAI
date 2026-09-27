import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import type { ReadingConflict } from '@/features/reading/reading-session-merge';
import type { ConflictResolution } from '@/features/reading/reading-sync-state';

interface Props {
  conflicts: ReadingConflict[];
  onResolve: (conflict: ReadingConflict, choice: ConflictResolution) => void;
}

export function WorkspaceSyncRecovery({ conflicts, onResolve }: Props) {
  const [open, setOpen] = useState(false);
  if (!conflicts.length) return null;
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <div role="status" className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-2 font-sans text-sm">
        <p>Some changes need review. Your local version stays on this device until you choose.</p>
        <DialogTrigger asChild><Button variant="outline" size="sm">Review sync changes</Button></DialogTrigger>
      </div>
      <DialogContent className="max-h-[85dvh] w-[calc(100%-2rem)] max-w-3xl overflow-y-auto font-sans">
        <DialogHeader>
          <DialogTitle>Review sync changes</DialogTitle>
          <DialogDescription>
            These changes overlap with another device. Changes that do not overlap are kept automatically.
            You can close this window and decide later.
          </DialogDescription>
        </DialogHeader>
        {conflicts.map((conflict) => <ReadingRecovery key={conflict.sessionId} conflict={conflict} onResolve={onResolve} />)}
      </DialogContent>
    </Dialog>
  );
}

function ReadingRecovery({ conflict, onResolve }: { conflict: ReadingConflict; onResolve: Props['onResolve'] }) {
  return (
    <section className="min-w-0 space-y-4 border-t border-border pt-4" aria-label={conflict.title}>
      <h3 className="break-words text-lg font-semibold">{conflict.title}</h3>
      {conflict.items.map((item, index) => (
        <div key={index} className="space-y-2">
          <h4 className="font-semibold">{item.label}</h4>
          <div className="grid gap-4 sm:grid-cols-2">
            <Version label="On this device" content={item.local} />
            <Version label="In the cloud" content={item.remote} />
          </div>
        </div>
      ))}
      <div className="flex flex-wrap gap-2">
        {canKeepBoth(conflict) && <Button variant="outline" onClick={() => onResolve(conflict, 'both')}>Keep both versions</Button>}
        <Button variant="outline" onClick={() => onResolve(conflict, 'local')}>
          {localActionLabel(conflict)}
        </Button>
        <Button variant="outline" onClick={() => onResolve(conflict, 'remote')}>
          {conflict.remoteDeleted ? 'Accept cloud deletion' : 'Use cloud changes'}
        </Button>
        {!conflict.localDeleted && !conflict.remoteDeleted && (
          <Button variant="ghost" onClick={() => onResolve(conflict, 'copy')}>Save local version as a new reading</Button>
        )}
      </div>
    </section>
  );
}

function localActionLabel(conflict: ReadingConflict): string {
  if (conflict.remoteDeleted) return 'Restore local version as a new reading';
  return conflict.localDeleted ? 'Delete updated cloud reading' : 'Use this device’s changes';
}

function Version({ label, content }: { label: string; content: string }) {
  return <div className="min-w-0">
    <p className="mb-2 text-sm font-medium text-muted-foreground">{label}</p>
    <p className="max-h-56 overflow-y-auto whitespace-pre-wrap break-words border border-border bg-muted/30 p-3 text-base">{content}</p>
  </div>;
}

function canKeepBoth(conflict: ReadingConflict): boolean {
  return conflict.items.length > 0 && conflict.items.every((item) =>
    item.key?.startsWith('artifact:') && item.local !== 'Deleted' && item.remote !== 'Deleted');
}
