// eslint.config.mjs
import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";
import tseslint from "@typescript-eslint/eslint-plugin";
import unused from "eslint-plugin-unused-imports";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Use old-style "extends" within flat config
const compat = new FlatCompat({ baseDirectory: __dirname });

export default [
  // 0) Global ignores (replaces .eslintignore)
  {
    ignores: [
      "**/node_modules/**",
      "**/.next/**",
      "**/dist/**",
      "**/build/**",
      "**/coverage/**",
      "**/playwright-report/**",
    ],
  },

  // 1) Next.js recommended + TypeScript defaults
  ...compat.extends("next/core-web-vitals", "next/typescript"),

  // 2) Guardrails (warn for now, to keep PR config-only)
  {
    plugins: {
      "@typescript-eslint": tseslint,
      "unused-imports": unused,
    },
    rules: {
      // Prefer type-only imports
      "@typescript-eslint/consistent-type-imports": [
        "warn",
        { prefer: "type-imports", fixStyle: "inline-type-imports" },
      ],

      // Remove unused imports (auto-fixable)
      "unused-imports/no-unused-imports": "warn",

      // Unused vars -> warn; allow underscore prefix to intentionally ignore
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

  // 3) Test overrides (keep them quiet but useful)
  {
    files: ["**/tests/**/*.{ts,tsx}", "**/__tests__/**/*.{ts,tsx}"],
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
    },
  },
];
