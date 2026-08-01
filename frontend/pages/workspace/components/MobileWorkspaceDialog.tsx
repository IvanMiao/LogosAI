import type { ReactElement } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { Artifact } from '@/features/artifacts';
import { cn } from '@/utils/className';

interface MobileWorkspaceDialogProps {
  open: boolean;
  activeCloseReading: Artifact | null;
  contextPanel: ReactElement;
  closeReadingPane: ReactElement | null;
  onOpenChange: (open: boolean) => void;
}

export function MobileWorkspaceDialog({
  open,
  activeCloseReading,
  contextPanel,
  closeReadingPane,
  onOpenChange,
}: MobileWorkspaceDialogProps): ReactElement {
  const hasCloseReading = activeCloseReading !== null;
  const title = hasCloseReading ? 'Close reading' : 'Context panel';
  const description = hasCloseReading
    ? 'Close reading of the active source.'
    : 'Current selection, artifact, and note.';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          'max-w-none p-0',
          hasCloseReading
            ? 'left-0 top-0 h-[100dvh] max-h-none translate-x-0 translate-y-0 gap-0 overflow-hidden [&>button]:hidden'
            : 'left-0 top-auto bottom-0 max-h-[88vh] translate-x-0 translate-y-0 overflow-y-auto',
        )}
      >
        <DialogHeader className="sr-only">
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        {hasCloseReading ? closeReadingPane : contextPanel}
      </DialogContent>
    </Dialog>
  );
}
