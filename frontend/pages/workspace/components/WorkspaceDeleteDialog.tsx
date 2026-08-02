import type { ReactElement } from 'react';
import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

export type WorkspaceDeletionTarget =
  | {
    kind: 'document';
    id: string;
    label: string;
  }
  | {
    kind: 'anchor';
    id: string;
    label: string;
    scope: 'document' | 'paragraph' | 'selection';
    outputCount: number;
  }
  | {
    kind: 'artifact';
    id: string;
    label: string;
  };

interface WorkspaceDeleteDialogProps {
  target: WorkspaceDeletionTarget | null;
  onCancel: () => void;
  onConfirm: () => void;
}

function getDialogCopy(target: WorkspaceDeletionTarget): {
  title: string;
  description: string;
  confirmLabel: string;
} {
  if (target.kind === 'artifact') {
    return {
      title: 'Delete output?',
      description: 'This permanently removes this saved output. The source passage stays saved.',
      confirmLabel: 'Delete output',
    };
  }

  if (target.kind === 'document') {
    return {
      title: 'Delete text?',
      description: 'This permanently removes the text, its saved selections, notes, and outputs.',
      confirmLabel: 'Delete text',
    };
  }

  const sourceLabel = target.scope === 'selection' ? 'selection' : 'Close Read source';
  if (target.outputCount === 0) {
    return {
      title: `Delete ${sourceLabel}?`,
      description: `This permanently removes this saved ${sourceLabel}.`,
      confirmLabel: target.scope === 'selection' ? 'Delete selection' : 'Delete source',
    };
  }

  const outputSummary = target.outputCount === 1
    ? '1 attached output'
    : `${target.outputCount} attached outputs`;
  return {
    title: `Delete ${sourceLabel}?`,
    description: `This permanently removes this ${sourceLabel} and ${outputSummary}.`,
    confirmLabel: target.scope === 'selection' ? 'Delete selection' : 'Delete source',
  };
}

export function WorkspaceDeleteDialog({
  target,
  onCancel,
  onConfirm,
}: WorkspaceDeleteDialogProps): ReactElement | null {
  if (!target) {
    return null;
  }

  const copy = getDialogCopy(target);
  return (
    <Dialog open onOpenChange={(open) => { if (!open) onCancel(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{copy.title}</DialogTitle>
          <DialogDescription>{copy.description}</DialogDescription>
        </DialogHeader>
        <p className="line-clamp-3 border-2 border-border bg-card p-3 font-sans text-sm leading-6">
          {target.label}
        </p>
        <DialogFooter className="gap-2 sm:gap-2">
          <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
          <Button type="button" variant="destructive" onClick={onConfirm}>
            <Trash2 className="h-4 w-4" />
            {copy.confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
