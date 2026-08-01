import type { ReactElement } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface FocusedCloseReadingDialogProps {
  open: boolean;
  closeReadingPane: ReactElement | null;
  onOpenChange: (open: boolean) => void;
  onReturnFocus: () => void;
}

export function FocusedCloseReadingDialog({
  open,
  closeReadingPane,
  onOpenChange,
  onReturnFocus,
}: FocusedCloseReadingDialogProps): ReactElement {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="left-0 top-0 h-[100dvh] max-h-none max-w-none translate-x-0 translate-y-0 gap-0 overflow-hidden border-0 p-0 shadow-none duration-0 [&>button]:hidden"
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          onReturnFocus();
        }}
      >
        <DialogHeader className="sr-only">
          <DialogTitle>Close reading focus</DialogTitle>
          <DialogDescription>
            Immersive Close Reading of the active source.
          </DialogDescription>
        </DialogHeader>
        {closeReadingPane}
      </DialogContent>
    </Dialog>
  );
}
