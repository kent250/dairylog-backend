import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";
import { defineConfig } from "eslint/config";

export default defineConfig([
  // 1. Base configuration for ALL files
  {
    ignores: ["node_modules/", "dist/", "build/"],
  },

  // 2. Configuration for all TypeScript files (*.ts, *.mts, *.cts, *.tsx)
  // This imports the recommended TypeScript rules and sets up the parser.
  ...tseslint.configs.recommended,

  // 3. Configuration for standard JavaScript files (*.js, *.mjs, *.cjs)
  {
    files: ["**/*.{js,mjs,cjs}"],
    ...js.configs.recommended, // Uses the recommended core ESLint rules
    languageOptions: {
      globals: globals.node,
      sourceType: "module",
    },
    // Custom rules can go here
    rules: {
      // Example: Ensure console.log is flagged in JS files
      "no-console": "warn",
    },
  },

  // 4. Custom overrides for TypeScript files (applied on top of recommended)
  {
    files: ["**/*.{ts,mts,cts}"],
    languageOptions: {
      globals: globals.node,
    },
    // Custom rules can go here
    rules: {
      // Example: Adjust the rule for explicit functions return types
      "@typescript-eslint/explicit-function-return-type": "off",
      // Example: Require use of `type` imports to avoid issues
      "@typescript-eslint/consistent-type-imports": "error",
    },
  },
]);
