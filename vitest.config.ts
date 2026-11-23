import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts', 'server/**/*.test.ts'],
    reporters: 'default',
    // Integration-heavy suite: server tests boot a real PGlite + run migrations per
    // file (some drive the whole HTTP router inside one it()). Under parallel worker
    // contention the default 5s timeout flakes (observed 2026-11-23: sharing /
    // attribution / engagement timing out at ~5.0s). 20s keeps hung tests failing fast
    // while giving cold boots headroom.
    testTimeout: 20_000,
  },
});
