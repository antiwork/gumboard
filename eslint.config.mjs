// eslint.config.mjs
import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";
import tseslint from "@typescript-eslint/eslint-plugin";
import unused from "eslint-plugin-unused-imports";
import boundaries from "eslint-plugin-boundaries";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const compat = new FlatCompat({ baseDirectory: __dirname });

const eslintConfig = [
  {
    ignores: [
      "**/node_modules/**",
      "**/.next/**",
      "**/dist/**",
      "**/build/**",
      "**/.turbo/**",
      "**/coverage/**",
      "**/playwright-report/**",
    ],
  },
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    plugins: {
      "@typescript-eslint": tseslint,
      "unused-imports": unused,
      boundaries,
    },
    settings: {
      "boundaries/elements": [{ type: "feature", pattern: "src/features/*" }],
    },
    rules: {
      // Use eslint-plugin-unused-imports to handle both imports & vars
      "@typescript-eslint/no-unused-vars": "off",
      "unused-imports/no-unused-imports": "error",
      "unused-imports/no-unused-vars": [
        "error",
        { args: "after-used", argsIgnorePattern: "^_", varsIgnorePattern: "^_" }
      ],

      // Type-only imports for better treeshaking
      "@typescript-eslint/consistent-type-imports": [
        "warn",
        { fixStyle: "separate-type-imports" }
      ],

      // boundaries left off for now
      // "boundaries/element-types": "error",
    },
  },
];

export default eslintConfig;
