// eslint.config.mjs
import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

import tseslint from "@typescript-eslint/eslint-plugin";
import unused from "eslint-plugin-unused-imports";
import boundaries from "eslint-plugin-boundaries";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
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
      "unused-imports/no-unused-imports": "error",
      "unused-imports/no-unused-vars": [
        "error",
        { args: "after-used", argsIgnorePattern: "^_", varsIgnorePattern: "^_" }
      ],
      "@typescript-eslint/consistent-type-imports": [
        "warn",
        { fixStyle: "separate-type-imports" }
      ],
    
      "no-restricted-imports": "off",
      "@typescript-eslint/no-restricted-imports": ["error", {
        "patterns": [
          {
            "group": ["**/internal/**", "@/**/internal/**"],
            "message": "Do not import from internal/**. Re-export via the feature's public index.ts."
          }
        ]
      }],

      // "boundaries/element-types": "error", // (optional later)
    },
  },
];

export default eslintConfig;
