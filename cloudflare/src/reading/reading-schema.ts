import { z } from 'zod';

const IsoDateSchema = z.string().datetime({ offset: true });
const IdSchema = z.string().trim().min(1).max(240);

const ReadingDocumentSchema = z
  .object({
    id: IdSchema,
    title: z.string().trim().min(1).max(160),
    text: z.string().min(1).max(2_000_000),
    sourceType: z.enum(['paste', 'file', 'history']),
    createdAt: IsoDateSchema,
    updatedAt: IsoDateSchema,
    lastOpenedAt: IsoDateSchema.optional(),
  })
  .strict();

const ReadingAnchorSchema = z
  .object({
    id: IdSchema,
    documentId: IdSchema,
    scope: z.enum(['document', 'paragraph', 'selection']),
    quote: z.string().min(1).max(2_000_000),
    normalizedQuote: z.string().max(2_000_000),
    quoteHash: z.string().min(1).max(128),
    startOffset: z.number().int().nonnegative(),
    endOffset: z.number().int().positive(),
    createdAt: IsoDateSchema,
  })
  .strict()
  .refine((anchor) => anchor.endOffset > anchor.startOffset, {
    message: 'Anchor end offset must follow its start offset.',
  });

const ReadingArtifactSchema = z
  .object({
    id: IdSchema,
    documentId: IdSchema,
    anchorId: IdSchema,
    type: z.enum([
      'note',
      'explanation',
      'translation',
      'vocabulary',
      'close_read',
    ]),
    title: z.string().trim().min(1).max(160),
    content: z.string().max(2_000_000),
    status: z.enum(['draft', 'running', 'stopped', 'failed', 'complete']),
    createdAt: IsoDateSchema,
    updatedAt: IsoDateSchema,
    requestId: z.string().max(240).optional(),
    traceId: z.string().max(240).optional(),
    errorMessage: z.string().max(2_000).optional(),
  })
  .strict();

export const ReadingSessionSnapshotSchema = z
  .object({
    document: ReadingDocumentSchema,
    activeAnchorId: IdSchema.nullable(),
    anchors: z.array(ReadingAnchorSchema).max(500),
    artifacts: z.array(ReadingArtifactSchema).max(2_000),
  })
  .strict()
  .superRefine((snapshot, context) => {
    const anchorIds = new Set(snapshot.anchors.map((anchor) => anchor.id));

    snapshot.anchors.forEach((anchor, index) => {
      if (anchor.documentId !== snapshot.document.id) {
        context.addIssue({
          code: 'custom',
          path: ['anchors', index, 'documentId'],
          message: 'Anchor belongs to a different reading session.',
        });
      }
    });

    snapshot.artifacts.forEach((artifact, index) => {
      if (
        artifact.documentId !== snapshot.document.id
        || !anchorIds.has(artifact.anchorId)
      ) {
        context.addIssue({
          code: 'custom',
          path: ['artifacts', index],
          message: 'Entry must belong to an anchor in this reading session.',
        });
      }
    });

    if (snapshot.activeAnchorId && !anchorIds.has(snapshot.activeAnchorId)) {
      context.addIssue({
        code: 'custom',
        path: ['activeAnchorId'],
        message: 'Active anchor does not exist in this reading session.',
      });
    }
  });
