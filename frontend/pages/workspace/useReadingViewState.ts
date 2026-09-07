import { useCallback, useContext, useLayoutEffect, useState, type SetStateAction } from 'react';
import { ReadingSessionContext, ReadingViewContext } from './reading-view-context';

export function useReadingViewState<T>(key: string, fallback: T, parse: (value: unknown) => T) {
  const context = useContext(ReadingViewContext);
  const store = context?.store;
  const documentId = useContext(ReadingSessionContext);
  const [value, setValue] = useState<T>(() => {
    const saved = store?.read(documentId)[key];
    return saved === undefined ? fallback : parse(saved);
  });
  useLayoutEffect(() => {
    store?.write(documentId, key, value);
  }, [documentId, key, store, value]);
  const updateValue = useCallback((next: SetStateAction<T>) => setValue(next), []);
  return [value, updateValue] as const;
}
