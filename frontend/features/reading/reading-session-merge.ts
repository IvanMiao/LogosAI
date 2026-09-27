import type { ReadingSessionSnapshot } from './reading-session-types';

type Session = ReadingSessionSnapshot;
type Artifact = Session['artifacts'][number];
export type ReadingConflictChoice = 'local' | 'remote';
export interface ReadingBaseline { version: 2; parts: Record<string, string> }
export interface ReadingConflictItem { key?: string; label: string; local: string; remote: string }
export interface ReadingConflict {
  sessionId: string;
  title: string;
  items: ReadingConflictItem[];
  remoteDeleted: boolean;
  localDeleted: boolean;
}

// Sort object keys as well as entities: transport property order is not an edit.
export function stableFingerprint(value: unknown): string {
  return JSON.stringify(value, (_key, item: unknown) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) return item;
    return Object.fromEntries(Object.entries(item).sort(([left], [right]) => left.localeCompare(right)));
  });
}

// Persisted baselines are only compared for equality; hash parts so they never duplicate content.
function contentHash(value: string): string {
  let high = 0xdeadbeef;
  let low = 0x41c6ce57;
  for (let index = 0; index < value.length; index += 1) {
    const char = value.charCodeAt(index);
    high = Math.imul(high ^ char, 2654435761);
    low = Math.imul(low ^ char, 1597334677);
  }
  high = Math.imul(high ^ (high >>> 16), 2246822507) ^ Math.imul(low ^ (low >>> 13), 3266489909);
  low = Math.imul(low ^ (low >>> 16), 2246822507) ^ Math.imul(high ^ (high >>> 13), 3266489909);
  return (low >>> 0).toString(16).padStart(8, '0') + (high >>> 0).toString(16).padStart(8, '0');
}

function artifactContent(artifact: Artifact) {
  const content: Partial<Artifact> = { ...artifact };
  delete content.updatedAt;
  delete content.createdAt;
  return content;
}

export function readingContentFingerprint(session: Session): string {
  return stableFingerprint(readingBaseline(session));
}

export function readingBaseline(session: Session): ReadingBaseline {
  const parts: Record<string, string> = {
    title: contentHash(stableFingerprint(session.document.title)),
    source: contentHash(stableFingerprint([session.document.text, session.document.sourceType])),
  };
  for (const anchor of session.anchors) parts[`anchor:${anchor.id}`] = contentHash(stableFingerprint(anchor));
  for (const artifact of session.artifacts) parts[`artifact:${artifact.id}`] = contentHash(stableFingerprint(artifactContent(artifact)));
  return { version: 2, parts };
}

export function preserveReadingPosition(merged: Session, local: Session): Session {
  const lastOpenedAt = [merged.document.lastOpenedAt, local.document.lastOpenedAt]
    .filter((value): value is string => Boolean(value)).sort().slice(-1)[0];
  const activeAnchorId = merged.anchors.some((anchor) => anchor.id === local.activeAnchorId)
    ? local.activeAnchorId : null;
  return { ...merged, document: { ...merged.document, lastOpenedAt }, activeAnchorId };
}

interface MergeContext {
  base?: ReadingBaseline;
  local: ReadingBaseline;
  remote: ReadingBaseline;
  items: ReadingConflictItem[];
  choice?: ReadingConflictChoice;
}

function mergeValue<T>(context: MergeContext, key: string, local: T, remote: T, label: string, describe: (value: T) => string): T {
  const localPrint = context.local.parts[key];
  const remotePrint = context.remote.parts[key];
  if (localPrint === remotePrint) return local;
  if (context.base) {
    if (localPrint === context.base.parts[key]) return remote;
    if (remotePrint === context.base.parts[key]) return local;
  }
  context.items.push({ key, label, local: describe(local), remote: describe(remote) });
  return context.choice === 'remote' ? remote : local;
}

function mergeEntities<T extends { id: string }>(
  context: MergeContext, prefix: string, local: T[], remote: T[], describe: (value: T | undefined) => string,
): T[] {
  const localMap = new Map(local.map((item) => [item.id, item]));
  const remoteMap = new Map(remote.map((item) => [item.id, item]));
  return [...new Set([...remoteMap.keys(), ...localMap.keys()])].flatMap((id) => {
    const value = mergeValue(context, `${prefix}:${id}`, localMap.get(id), remoteMap.get(id),
      prefix === 'artifact' ? 'Note or reading result' : 'Selected passage', describe);
    return value ? [value] : [];
  });
}

function describeArtifact(value: Artifact | undefined): string {
  return value ? `${value.title}\n\n${value.content}` : 'Deleted';
}

export function describeReading(session: Session): string {
  return [session.document.title, session.document.text, ...session.artifacts.map(describeArtifact)].join('\n\n');
}

function sourceChanged(context: MergeContext): boolean {
  if (context.local.parts.source !== context.remote.parts.source) return true;
  return Boolean(context.base && context.local.parts.source !== context.base.parts.source);
}

function mergeReadingBody(context: MergeContext, local: Session, remote: Session): Session {
  // A source change can invalidate every offset; never mix passages from different texts.
  if (sourceChanged(context)) return mergeWholeBody(context, local, remote);
  const anchors = mergeEntities(context, 'anchor', local.anchors, remote.anchors,
    (anchor) => anchor?.quote ?? 'Deleted');
  const artifacts = mergeEntities(context, 'artifact', local.artifacts, remote.artifacts, describeArtifact);
  if (artifacts.some((artifact) => !anchors.some((anchor) => anchor.id === artifact.anchorId))) {
    return mergeWholeBody(context, local, remote);
  }
  return { ...remote, anchors, artifacts };
}

function mergeWholeBody(context: MergeContext, local: Session, remote: Session): Session {
  const bodyFingerprint = (baseline: ReadingBaseline) => stableFingerprint(
    Object.fromEntries(Object.entries(baseline.parts).filter(([key]) => key !== 'title')),
  );
  const bodyContext: MergeContext = { ...context,
    base: context.base ? { version: 2, parts: { body: bodyFingerprint(context.base) } } : undefined,
    local: { version: 2, parts: { body: bodyFingerprint(context.local) } },
    remote: { version: 2, parts: { body: bodyFingerprint(context.remote) } },
  };
  // Replace any partial passage conflicts with a coherent whole-body choice.
  context.items.splice(0);
  return mergeValue(bodyContext, 'body', local, remote, 'Reading text and its notes', describeReading);
}

export function mergeReadingSession(local: Session, remote: Session, base?: ReadingBaseline, choice?: ReadingConflictChoice) {
  const context: MergeContext = { base, local: readingBaseline(local), remote: readingBaseline(remote), items: [], choice };
  const body = mergeReadingBody(context, local, remote);
  const title = mergeValue(context, 'title', local.document.title, remote.document.title, 'Reading title', String);
  const updatedAt = [local.document.updatedAt, remote.document.updatedAt].sort().slice(-1)[0]!;
  const session = preserveReadingPosition({ ...body, document: { ...body.document, title, updatedAt } }, local);
  return { session, items: context.items };
}

export function keepBothArtifactVersions(merged: Session, local: Session, remote: Session, items: ReadingConflictItem[]): Session {
  const keys = new Set(items.map((item) => item.key));
  const artifacts = merged.artifacts.flatMap((artifact) => {
    if (!keys.has(`artifact:${artifact.id}`)) return [artifact];
    const localVersion = local.artifacts.find((item) => item.id === artifact.id);
    const remoteVersion = remote.artifacts.find((item) => item.id === artifact.id);
    if (!localVersion || !remoteVersion) return [artifact];
    const copy = { ...localVersion, id: `artifact-${crypto.randomUUID()}`,
      title: `${localVersion.title.slice(0, 140)} (local version)`,
      status: localVersion.status === 'running' ? 'stopped' as const : localVersion.status };
    delete copy.requestId;
    return [remoteVersion, copy];
  });
  return { ...merged, artifacts };
}
