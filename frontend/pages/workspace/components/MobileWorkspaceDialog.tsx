import type { ReactElement } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/utils/className';

interface MobileWorkspaceDialogProps {
  open: boolean;
  title: string;
  description: string;
  content: ReactElement;
  fullScreen?: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MobileWorkspaceDialog({
  open,
  title,
  description,
  content,
  fullScreen = false,
  onOpenChange,
}: MobileWorkspaceDialogProps): ReactElement {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          'max-w-none p-0',
          fullScreen
            ? 'left-0 top-0 h-[100dvh] max-h-none translate-x-0 translate-y-0 gap-0 overflow-hidden [&>button]:hidden'
            : 'left-0 top-auto bottom-0 max-h-[88vh] translate-x-0 translate-y-0 overflow-y-auto',
        )}
      >
        <DialogHeader className="sr-only">
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        {content}
      </DialogContent>
    </Dialog>
  );
}
