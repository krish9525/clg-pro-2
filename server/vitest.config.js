import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    setupFiles: ["./tests/setup/globalSetup.js"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      exclude: [
        "node_modules/**",
        "tests/**",
        "uploads/**",
        "*.config.js",
      ],
      thresholds: {
        lines: 60,
        functions: 60,
        branches: 50,
      },
    },
    testTimeout: 15000,         // MongoDB memory server needs time
    hookTimeout: 30000,
  },
});
