/**
 * Deep-equality dirty check via JSON serialization. Good enough for the
 * builder's plain-object/array form state (no functions, no Dates) — avoids
 * pulling in a deep-equal dependency for one call site.
 */
export function hasUnsavedChanges<T>(original: T, current: T): boolean {
  return JSON.stringify(original) !== JSON.stringify(current);
}
