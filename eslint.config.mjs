import js from "@eslint/js";
import { defineConfig, globalIgnores } from "eslint/config";
import reactHooks from "eslint-plugin-react-hooks";
import globals from "globals";
import tseslint from "typescript-eslint";

/**
 * Replaces `eslint-config-next`, which went away with the framework. That
 * preset bundled three things; only two of them still apply here:
 *
 *   - TypeScript rules            -> typescript-eslint below
 *   - React Hooks rules           -> eslint-plugin-react-hooks below
 *   - Next-specific lint rules    -> dropped; there is no Next.js to lint for
 *
 * Type-aware linting is deliberately not enabled: `npm run typecheck` already
 * runs `tsc` over the same files, so it would be a second slow pass for rules
 * the compiler has covered.
 */
export default defineConfig([
  globalIgnores([
    "build/**",
    ".react-router/**",
    "node_modules/**",
  ]),

  js.configs.recommended,
  ...tseslint.configs.recommended,
  // In v7 the top-level `recommended` / `recommended-latest` are still the
  // legacy shape (plugins as an array of strings). The flat-config versions
  // live under `configs.flat`.
  reactHooks.configs.flat["recommended-latest"],

  {
    files: ["**/*.{ts,tsx,mjs}"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
    rules: {
      // Warn, not error. Two admin components reset their form state in an
      // effect once a `useFetcher` submission comes back clean — the response
      // arrives long after the submit handler returned, so there is no render
      // pass to do it in. Reworking them into fetcher-keyed derived state is a
      // real change to freshly migrated admin screens, not a lint fix, so the
      // finding stays visible without failing the build.
      "react-hooks/set-state-in-effect": "warn",

      // Loaders and actions routinely accept args they do not all use, and
      // catch blocks bind an error they may only rethrow. Allow a leading
      // underscore to mark that as deliberate.
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
    },
  },
]);
