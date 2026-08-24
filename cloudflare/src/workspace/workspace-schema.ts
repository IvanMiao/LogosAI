import { z } from 'zod';

export const WorkspacePreferencesSchema = z
  .object({
    activeDocumentId: z.string().trim().min(1).max(240).nullable(),
    readerPreferences: z
      .object({
        fontFamily: z.enum(['serif', 'sans', 'mono']),
        closeReadingFontFamily: z.enum(['serif', 'sans', 'mono']),
        fontLinked: z.boolean(),
        fontSize: z.number().min(14).max(30),
        lineSpacing: z.number().min(1.3).max(2.4),
        lineWidth: z.number().min(540).max(900),
      })
      .strict(),
    analysisLanguage: z.enum(['zh', 'en', 'fr', 'de', 'es', 'it', 'ja']),
  })
  .strict();
