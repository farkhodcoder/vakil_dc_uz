import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const src = fileURLToPath(new URL("./src", import.meta.url)).replace(/\\/g, "/");

export default defineConfig({
  resolve: {
    alias: [
      { find: /^@\//, replacement: `${src}/` },
    ],
  },
  test: {
    include: ["src/**/*.test.ts"],
  },
});
