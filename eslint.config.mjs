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

// ✅ named config export
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
      // force type-only imports → warn for now
      "@typescript-eslint/consistent-type-imports": [
        "warn",
        { prefer: "type-imports", fixStyle: "inline-type-imports" },
      ],

      // unused imports → warn for now
      "unused-imports/no-unused-imports": "warn",

      // unused vars → warn unless prefixed with "_"
      "unused-imports/no-unused-vars": [
        "warn",
        {
          args: "after-used",
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          ignoreRestSiblings: true,
        },
      ],
    },
  },

  // 3. Ignore generated dirs (faster lint, fewer false positives)
  {
    ignores: ["**/node_modules/**", ".next/**", "dist/**", "build/**"],
  },
];

export default eslintConfig;
