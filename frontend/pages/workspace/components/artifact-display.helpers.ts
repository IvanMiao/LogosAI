import type { AnchorScope } from '@/features/anchors';
import type { Artifact, ArtifactStatus } from '@/features/artifacts';

const ARTIFACT_PREVIEW_MAX_LENGTH = 140;

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

/**
 * Reader-facing wording for a task state. The stored enum stays unchanged; only
 * the phrasing users see is mapped here, so a state always suggests what to do next.
 */
export function getArtifactStatusLabel(status: ArtifactStatus): string {
  const labels: Record<ArtifactStatus, string> = {
    complete: 'Ready',
    draft: 'Saved',
    failed: 'Failed — retry',
    running: 'Working…',
    stopped: 'Stopped — retry',
  };

  return labels[status];
}

export function getArtifactPreview(artifact: Artifact): string {
  const content = artifact.content.replace(/\s+/g, ' ').trim();
  if (!content) {
    return artifact.status === 'running'
      ? 'Still generating.'
      : 'No content yet.';
  }

  return content.length > ARTIFACT_PREVIEW_MAX_LENGTH
    ? `${content.slice(0, ARTIFACT_PREVIEW_MAX_LENGTH).trimEnd()}…`
    : content;
}

/**
 * Reader-facing wording for an anchor scope. `PROJECT.md` keeps "anchor" out of
 * the interface; the same rule is applied to the raw scope values here.
 */
export function getAnchorScopeLabel(scope: AnchorScope): string {
  const labels: Record<AnchorScope, string> = {
    document: 'Whole text',
    paragraph: 'Paragraph',
    selection: 'Selected passage',
  };

  return labels[scope];
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
