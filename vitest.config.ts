import { defineConfig } from "vitest/config";
import path from "path";

// NOTE: `environmentMatchGlobs` (the option shown in the task brief) was
// removed in Vitest 4 in favor of `test.projects`. This config reproduces
// the same behavior: edge-runtime everywhere by default, jsdom for
// `*.test.tsx` files.
export default defineConfig({
  test: {
    setupFiles: ["./vitest.setup.ts"],
    projects: [
      {
        extends: true,
        test: {
          name: "server",
          environment: "edge-runtime",
          // .claude holds local agent worktrees: whole copies of this repo.
          exclude: ["**/*.test.tsx", "**/node_modules/**", ".claude/**"],
        },
      },
      {
        extends: true,
        test: {
          name: "client",
          environment: "jsdom",
          include: ["**/*.test.tsx"],
          exclude: ["**/node_modules/**", ".claude/**"],
        },
      },
    ],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
});
