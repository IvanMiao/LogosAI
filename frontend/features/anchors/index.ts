export {
  createAnchorFromRange,
  createAnchorFromSelection,
  hashAnchorQuote,
  normalizeAnchorQuote,
  resolveAnchor,
} from './anchor-core';
export {
  readStoredAnchors,
  writeStoredAnchors,
} from './anchor-storage';
export type {
  AnchorScope,
  AnchorStorageState,
  ResolvedAnchor,
  TextAnchor,
} from './anchor.types';
