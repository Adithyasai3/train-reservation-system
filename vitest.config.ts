import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts"],
    // every test file runs in its own worker with a fresh in-memory database
    env: { DB_PATH: ":memory:", JWT_SECRET: "test-secret" },
    coverage: {
      provider: "v8",
      include: ["app.ts", "db.ts"],
      reporter: ["text", "html"],
    },
  },
});
