import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // scripts/setup-assets.mjs ko'chiradigan tayyor fayllar (MediaPipe WASM, shriftlar)
    "public/mediapipe/**",
    "public/fonts/**",
  ]),
]);

export default eslintConfig;
