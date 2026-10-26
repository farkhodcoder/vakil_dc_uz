import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const src = fileURLToPath(new URL("./src", import.meta.url)).replace(/\\/g, "/");

export default defineConfig({
  resolve: {
    alias: [
      { find: /^@\//, replacement: `${src}/` },
      // "server-only" faqat Next bundlerida ma'noli; testlarda bo'sh modul
      { find: /^server-only$/, replacement: `${src}/test/server-only-stub.ts` },
    ],
  },
  test: {
    include: ["src/**/*.test.ts"],
  },
});
