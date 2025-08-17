// eslint.config.mjs
import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";
import tseslint from "@typescript-eslint/eslint-plugin";
import unused from "eslint-plugin-unused-imports";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// helper to use old-style "extends" configs in flat config
const compat = new FlatCompat({ baseDirectory: __dirname });

// ✅ give the config a name instead of anonymous default export
const eslintConfig = [
  // 1. Next.js recommended + TypeScript defaults
  ...compat.extends("next/core-web-vitals", "next/typescript"),

  // 2. Guardrails layer: type-only imports + unused cleanup
  {
    plugins: {
      "@typescript-eslint": tseslint,
      "unused-imports": unused,
    },
    rules: {
      // force type-only imports
      "@typescript-eslint/consistent-type-imports": [
        "error",
        { prefer: "type-imports", fixStyle: "inline-type-imports" },
      ],

      // wipe unused imports automatically on --fix
      "unused-imports/no-unused-imports": "error",

      // unused vars → error unless prefixed with "_"
      "unused-imports/no-unused-vars": [
        "error",
        {
          args: "after-used",
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          ignoreRestSiblings: true,
        },
      ],
    },
  },

  // 3. Ignore generated dirs (so ESLint runs faster, fewer false positives)
  {
    ignores: ["**/node_modules/**", ".next/**", "dist/**", "build/**"],
  },
];

export default eslintConfig;
