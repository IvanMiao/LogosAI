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

export function getArtifactProgressLabel(artifact: Artifact): string {
  if (artifact.stage === 'detect') return 'Identifying language and structure…';
  if (artifact.stage === 'correct') return 'Resolving source text…';
  if (artifact.stage === 'interpret') {
    if (artifact.type === 'translation') return 'Translating selection…';
    if (artifact.type === 'vocabulary') return 'Building vocabulary…';
    if (artifact.type === 'explanation') return 'Explaining selection…';
    return 'Interpreting the full text…';
  }
  return 'Starting analysis…';
}
