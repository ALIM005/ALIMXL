import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,

  globalIgnores([
    // Next.js generated files.
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",

    // Generated third-party PDF.js assets.
    // These are copied from node_modules by copy-pdf-assets.mjs.
    "public/pdf-import/**",

    // Temporary third-party assets created during copying.
    ".pdf-assets-stage-*/**",
  ]),
]);

export default eslintConfig;