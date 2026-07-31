// ESLint flat configuration (Gap Closure Command 6).
//
// ONE ESLint architecture. There is no `.eslintrc` in this repository and none
// should be added — ESLint 9 resolves flat config only, and having both is the
// duplication this command forbids.
//
// Scope of linting here is CORRECTNESS, SECURITY, ACCESSIBILITY, and TEST
// RELIABILITY. Formatting is deliberately not enforced: the repository has a
// consistent hand-maintained style (inline styles, aligned object literals) that
// no formatter in this project produced, and turning that into a blocking rule
// would create churn without catching a single defect.

import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import testingLibrary from "eslint-plugin-testing-library";
import playwright from "eslint-plugin-playwright";

export default tseslint.config(
  {
    // Never linted: build output, coverage, browser reports, dependencies, and
    // the official brand assets.
    ignores: [
      "dist/**",
      "coverage/**",
      "playwright-report/**",
      "test-results/**",
      "node_modules/**",
      ".netlify/**",
      "public/**",
      "src/brand elements/**",
      // Figma-generated import surfaces. Machine-authored, never hand-edited,
      // and linting them produces hundreds of findings nobody will action.
      "src/imports/**",
      // shadcn/ui vendored components — upstream code, kept as delivered.
      "src/app/components/ui/**",
    ],
  },

  // ── Application source ──────────────────────────────────────────────────────
  {
    files: ["src/**/*.{ts,tsx}"],
    extends: [
      js.configs.recommended,
      ...tseslint.configs.recommendedTypeChecked,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parserOptions: {
        project: ["./tsconfig.app.json", "./tsconfig.test.json"],
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      // ── Framework correctness ───────────────────────────────────────────────
      // Hook order and dependency correctness. The Gap 2 work hit a real Rules
      // of Hooks violation (a hook placed after an early return); this rule is
      // the reason that class of bug cannot come back.
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],

      // ── Promise correctness ─────────────────────────────────────────────────
      // Every service in this repo is async. A dropped promise silently swallows
      // a failure and leaves the UI claiming success.
      "@typescript-eslint/no-floating-promises": "error",
      "@typescript-eslint/no-misused-promises": [
        "error",
        // An async handler passed to onClick is idiomatic React and safe.
        { checksVoidReturn: { attributes: false } },
      ],
      "@typescript-eslint/await-thenable": "error",
      "@typescript-eslint/require-await": "warn",
      "@typescript-eslint/return-await": ["error", "in-try-catch"],

      // ── Type safety ─────────────────────────────────────────────────────────
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-unnecessary-type-assertion": "error",
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
          destructuredArrayIgnorePattern: "^_",
        },
      ],
      // The codebase uses `?? ` and `?.` heavily and correctly; these two rules
      // are noisy against that style without finding defects.
      "@typescript-eslint/no-unnecessary-condition": "off",
      "@typescript-eslint/restrict-template-expressions": [
        "error",
        { allowNumber: true, allowBoolean: true, allowNullish: true },
      ],

      // ── Correctness ─────────────────────────────────────────────────────────
      "no-unreachable": "error",
      "no-constant-condition": ["error", { checkLoops: false }],
      "no-fallthrough": "error",
      // Deliberately OFF. The base rule counts `import type { T } from "./m"`
      // and `import { v } from "./m"` as duplicates, but splitting type imports
      // from value imports is idiomatic TypeScript and is what `isolatedModules`
      // and `verbatimModuleSyntax` are built around. typescript-eslint
      // recommends against the base rule for exactly this reason. Enabling it
      // would flag 155 correct imports and find zero defects.
      "no-duplicate-imports": "off",
      "no-unsafe-optional-chaining": "error",
      "no-self-compare": "error",
      "no-template-curly-in-string": "warn",
      "array-callback-return": "error",
      "eqeqeq": ["error", "always", { null: "ignore" }],

      // ── Security ────────────────────────────────────────────────────────────
      // These are hard product constraints for LAGDA, not style preferences.
      // `dangerouslySetInnerHTML` and dynamic code execution are forbidden
      // outright by the feature commands; the linter is where that is enforced.
      "no-eval": "error",
      "no-implied-eval": "error",
      "no-new-func": "error",
      "no-script-url": "error",
      "react-hooks/react-compiler": "off",

      // ── Honest UI ───────────────────────────────────────────────────────────
      // Browser dialogs are not part of the design system and cannot be styled,
      // focus-trapped, or made accessible. C37's audit replaced the only
      // `window.confirm` uses with a real dialog; this keeps them out.
      "no-alert": "error",

      // Private data must never reach the console. `logger.ts` is the approved
      // path and redacts. `console.error`/`warn` remain available for genuine
      // failures.
      "no-console": ["error", { allow: ["warn", "error"] }],
    },
  },

  // ── Guardrail: no raw innerHTML anywhere in application source ──────────────
  {
    files: ["src/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector: "JSXAttribute[name.name='dangerouslySetInnerHTML']",
          message:
            "dangerouslySetInnerHTML is forbidden in LAGDA. Render plain text. " +
            "Recipient names, comment bodies, and pasted values are user-controlled.",
        },
        {
          selector:
            "MemberExpression[object.name='localStorage'], MemberExpression[object.name='sessionStorage']",
          message:
            "Direct localStorage/sessionStorage access is forbidden. Private provider " +
            "data (recipient rows, comments, Policy inputs) must never be persisted. " +
            "If a safe UI preference is genuinely needed, add an approved abstraction first.",
        },
      ],
    },
  },

  // ── Node-side configuration files ──────────────────────────────────────────
  {
    files: ["*.config.{ts,js,mjs}", "vite.config.ts", "vitest.config.ts", "playwright.config.ts"],
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    languageOptions: { globals: globals.node },
    rules: {
      "no-console": "off",
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
    },
  },

  // ── Vitest unit and component tests ────────────────────────────────────────
  {
    files: ["src/**/*.test.{ts,tsx}", "src/test/**/*.{ts,tsx}"],
    extends: [testingLibrary.configs["flat/react"]],
    languageOptions: { globals: { ...globals.browser, ...globals.node } },
    rules: {
      // Test correctness. `await-async-queries` and `no-await-sync-queries` catch
      // the two most common sources of flaky Testing Library assertions.
      "testing-library/await-async-queries": "error",
      "testing-library/no-await-sync-queries": "error",
      "testing-library/no-wait-for-multiple-assertions": "error",
      "testing-library/prefer-screen-queries": "error",
      "testing-library/prefer-user-event": "error",
      "testing-library/no-node-access": "warn",
      "testing-library/no-container": "warn",

      // Tests legitimately reach into fixtures and mock internals.
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unsafe-assignment": "off",
      "@typescript-eslint/no-unsafe-member-access": "off",
      "@typescript-eslint/no-unsafe-argument": "off",
      "@typescript-eslint/no-unsafe-call": "off",
      "@typescript-eslint/no-unsafe-return": "off",
      "no-console": "off",
      "no-restricted-syntax": "off",
    },
  },

  // ── Playwright browser and accessibility specs ─────────────────────────────
  {
    files: ["tests/**/*.{ts,tsx}"],
    extends: [playwright.configs["flat/recommended"]],
    languageOptions: {
      globals: globals.node,
      parserOptions: {
        project: ["./tsconfig.test.json"],
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      // The single most valuable Playwright rule: a forgotten `await` on an
      // assertion makes the test pass unconditionally.
      "playwright/missing-playwright-await": "error",
      "playwright/no-wait-for-timeout": "error",
      "playwright/no-force-option": "warn",
      "playwright/expect-expect": "error",
      "playwright/no-conditional-in-test": "off",
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unsafe-assignment": "off",
      "@typescript-eslint/no-unsafe-member-access": "off",
      "no-console": "off",
      "no-restricted-syntax": "off",
    },
  },
);
