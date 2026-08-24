import type { Artifact } from '@/features/artifacts';

export function getArtifactLabel(artifact: Artifact): string {
  const labels: Record<Artifact['type'], string> = {
    close_read: 'Close Reading',
    explanation: 'Explanation',
    note: 'Note',
    translation: 'Translation',
    vocabulary: 'Vocabulary',
  };

  return labels[artifact.type];
}

export function formatArtifactTimestamp(artifact: Artifact): string {
  const createdAt = new Date(artifact.createdAt);
  if (Number.isNaN(createdAt.getTime())) {
    return 'Unknown time';
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(createdAt);
}
