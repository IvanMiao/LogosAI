export {
  createAnchorFromRange,
  createAnchorFromSelection,
  getActiveAnchorIdForDocument,
  hashAnchorQuote,
  normalizeAnchorQuote,
  removeAnchorsForDocument,
  resolveAnchor,
  setActiveAnchorForDocument,
} from './anchor-core';
export {
  readStoredAnchors,
  writeStoredAnchors,
} from './anchor-storage';
export { getSelectionOffsets } from './selection-offsets';
export type { SelectionOffsets } from './selection-offsets';
export type {
  AnchorScope,
  AnchorStorageState,
  ResolvedAnchor,
  TextAnchor,
} from './anchor.types';
