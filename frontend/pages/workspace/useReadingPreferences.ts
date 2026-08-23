import { useCallback, useState } from 'react';
import type { AnalysisLanguage, ReaderPreferences } from '@/features/reading';
import {
  readStoredAnalysisLanguage,
  readStoredReaderPreferences,
  writeStoredAnalysisLanguage,
  writeStoredReaderPreferences,
} from '@/features/reading/reading-storage';

interface ReadingPreferences {
  readerPreferences: ReaderPreferences;
  analysisLanguage: AnalysisLanguage;
  updateReaderPreference: <Key extends keyof ReaderPreferences>(
    key: Key,
    value: ReaderPreferences[Key],
  ) => void;
  updateAnalysisLanguage: (language: AnalysisLanguage) => void;
  hydrateReadingPreferences: (
    preferences: ReaderPreferences,
    language: AnalysisLanguage,
  ) => void;
}

export function useReadingPreferences(userId: string): ReadingPreferences {
  const [readerPreferences, setReaderPreferences] = useState<ReaderPreferences>(
    () => readStoredReaderPreferences(userId),
  );
  const [analysisLanguage, setAnalysisLanguage] = useState<AnalysisLanguage>(
    () => readStoredAnalysisLanguage(userId),
  );

  const updateReaderPreference = useCallback(<Key extends keyof ReaderPreferences>(
    key: Key,
    value: ReaderPreferences[Key],
  ) => {
    setReaderPreferences((current) => {
      let nextPreferences = { ...current, [key]: value } as ReaderPreferences;
      if (key === 'fontFamily' && current.fontLinked) {
        nextPreferences = {
          ...nextPreferences,
          closeReadingFontFamily: value as ReaderPreferences['fontFamily'],
        };
      }
      if (key === 'fontLinked' && value === true) {
        nextPreferences = {
          ...nextPreferences,
          closeReadingFontFamily: current.fontFamily,
        };
      }
      writeStoredReaderPreferences(nextPreferences, userId);
      return nextPreferences;
    });
  }, [userId]);

  const updateAnalysisLanguage = useCallback((language: AnalysisLanguage) => {
    setAnalysisLanguage(language);
    writeStoredAnalysisLanguage(language, userId);
  }, [userId]);

  const hydrateReadingPreferences = useCallback((
    preferences: ReaderPreferences,
    language: AnalysisLanguage,
  ) => {
    setReaderPreferences(preferences);
    setAnalysisLanguage(language);
    writeStoredReaderPreferences(preferences, userId);
    writeStoredAnalysisLanguage(language, userId);
  }, [userId]);

  return {
    readerPreferences,
    analysisLanguage,
    updateReaderPreference,
    updateAnalysisLanguage,
    hydrateReadingPreferences,
  };
}
