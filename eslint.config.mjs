// eslint.config.mjs
import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

// NEW: plugins we’ll use in Step 1
import tseslint from "@typescript-eslint/eslint-plugin";
import unused from "eslint-plugin-unused-imports";
import boundaries from "eslint-plugin-boundaries";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  // Keep your existing Next + TS rules via compat
  ...compat.extends("next/core-web-vitals", "next/typescript"),

  // Our Step 1 layer: plugins + rules
  {
    plugins: {
      "@typescript-eslint": tseslint,
      "unused-imports": unused,
      boundaries,
    },
    settings: {
      // We’ll enforce this later; for now just define the feature layout.
      "boundaries/elements": [{ type: "feature", pattern: "src/features/*" }],
    },
    rules: {
      // Auto-remove dead imports/vars
      "unused-imports/no-unused-imports": "error",
      "unused-imports/no-unused-vars": [
        "error",
        { args: "after-used", argsIgnorePattern: "^_", varsIgnorePattern: "^_" }
      ],

      // Encourage type-only imports for better tree-shaking
      "@typescript-eslint/consistent-type-imports": [
        "warn",
        { fixStyle: "separate-type-imports" }
      ],

      // NOTE: boundaries enforcement will be enabled in a later step
      // "boundaries/element-types": "error",
    },
  },
];

export default eslintConfig;
