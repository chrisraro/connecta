/** Eased 0–1 progress of a move starting at `start` that lasts `length` frames. */
export function progress(frame: number, start: number, length: number): number {
  if (length < 9) throw new Error("a move must last at least 9 frames (300 ms)");
  const t = Math.min(1, Math.max(0, (frame - start) / length));
  return 1 - Math.pow(1 - t, 3);
}
