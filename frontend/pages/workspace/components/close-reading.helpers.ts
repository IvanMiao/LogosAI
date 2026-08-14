import type { Artifact } from '@/features/artifacts';

export function getCloseReadingArtifacts(artifacts: Artifact[]): Artifact[] {
  return artifacts.filter((artifact) => artifact.type === 'close_read');
}

export function getDisplayedCloseReading({
  activeArtifact,
  closeReadings,
  selectedArtifactId,
}: {
  activeArtifact: Artifact | null;
  closeReadings: Artifact[];
  selectedArtifactId: string | null;
}): Artifact | null {
  const selectedCloseReading = closeReadings.find((artifact) => (
    artifact.id === selectedArtifactId
  ));
  if (selectedCloseReading) {
    return selectedCloseReading;
  }

  return activeArtifact?.type === 'close_read' ? activeArtifact : null;
}
