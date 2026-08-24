import { describe, expect, it } from 'vitest';
import { WorkspacePreferencesSchema } from '../src/workspace/workspace-schema';

function createPreferences() {
  return {
    activeDocumentId: null,
    readerPreferences: {
      fontFamily: 'serif',
      closeReadingFontFamily: 'sans',
      fontLinked: false,
      fontSize: 18,
      lineSpacing: 1.75,
      lineWidth: 760,
    },
    analysisLanguage: 'en',
  };
}

describe('workspace preferences validation', () => {
  it('accepts the complete reading appearance contract', () => {
    expect(WorkspacePreferencesSchema.safeParse(createPreferences()).success).toBe(true);
  });

  it('requires font linking and line width', () => {
    const preferences = createPreferences();
    const incompleteReaderPreferences = {
      fontFamily: preferences.readerPreferences.fontFamily,
      closeReadingFontFamily: preferences.readerPreferences.closeReadingFontFamily,
      fontSize: preferences.readerPreferences.fontSize,
      lineSpacing: preferences.readerPreferences.lineSpacing,
    };

    expect(WorkspacePreferencesSchema.safeParse({
      ...preferences,
      readerPreferences: incompleteReaderPreferences,
    }).success).toBe(false);
  });
});
