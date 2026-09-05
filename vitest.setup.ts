import "@testing-library/jest-dom/vitest";
import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

// This project's Vitest config does not set `test.globals: true`, so
// @testing-library/react's built-in auto-cleanup (which only self-registers
// when it detects a global `afterEach`) never fires. Without this, DOM nodes
// from one test leak into the next within the same *.test.tsx file.
afterEach(() => {
  cleanup();
});
