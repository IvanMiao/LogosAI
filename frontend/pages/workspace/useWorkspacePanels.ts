import { useState } from 'react';

interface UseWorkspacePanelsOptions {
  isDesktopViewport: boolean;
  isDesktopContextOpen: boolean;
  isMobileContextOpen: boolean;
  onDesktopContextOpenChange: (open: boolean) => void;
  onMobileContextOpenChange: (open: boolean) => void;
}

interface WorkspacePanelsController {
  isContextOpen: boolean;
  focusedCloseReadingId: string | null;
  selectedCloseReadingId: string | null;
  sourceRevealRequest: number;
  openPanel: () => void;
  togglePanel: () => void;
  closePanel: () => void;
  exitFocus: () => void;
  focusCloseReading: (artifactId: string) => void;
  selectCloseReading: (artifactId: string | null) => void;
  showSource: (isCloseReadingFocused: boolean) => void;
}

export function useWorkspacePanels({
  isDesktopViewport,
  isDesktopContextOpen,
  isMobileContextOpen,
  onDesktopContextOpenChange,
  onMobileContextOpenChange,
}: UseWorkspacePanelsOptions): WorkspacePanelsController {
  const [focusedCloseReadingId, setFocusedCloseReadingId] = useState<string | null>(null);
  const [selectedCloseReadingId, setSelectedCloseReadingId] = useState<string | null>(null);
  const [sourceRevealRequest, setSourceRevealRequest] = useState(0);
  const isContextOpen = isDesktopViewport
    ? isDesktopContextOpen
    : isMobileContextOpen;

  const setPanelOpen = (open: boolean) => {
    if (isDesktopViewport) {
      onDesktopContextOpenChange(open);
      return;
    }

    onMobileContextOpenChange(open);
  };

  const closePanel = () => {
    setFocusedCloseReadingId(null);
    setSelectedCloseReadingId(null);
    setPanelOpen(false);
  };

  const togglePanel = () => {
    if (isContextOpen) {
      setFocusedCloseReadingId(null);
      setSelectedCloseReadingId(null);
    }
    setPanelOpen(!isContextOpen);
  };

  const showSource = (isCloseReadingFocused: boolean) => {
    setSourceRevealRequest((currentRequest) => currentRequest + 1);
    if (isDesktopViewport && isCloseReadingFocused) {
      setFocusedCloseReadingId(null);
      return;
    }

    closePanel();
  };

  const selectCloseReading = (artifactId: string | null) => {
    setSelectedCloseReadingId(artifactId);
    setFocusedCloseReadingId((currentArtifactId) => (
      currentArtifactId === null ? null : artifactId
    ));
  };

  return {
    isContextOpen,
    focusedCloseReadingId,
    selectedCloseReadingId,
    sourceRevealRequest,
    openPanel: () => setPanelOpen(true),
    togglePanel,
    closePanel,
    exitFocus: () => setFocusedCloseReadingId(null),
    focusCloseReading: setFocusedCloseReadingId,
    selectCloseReading,
    showSource,
  };
}
