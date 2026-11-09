# Milestone 1 Exploration Report: Tooling, ESLint & Test Runner Setup

## 1. Observation

### 1.1 ESLint Interactive Prompt & Missing Dependency Behavior
When running `npm run lint` on the clean repository:
```bash
$ npm run lint
> kampus-royale-mezuna-kalma@1.0.0 lint
> next lint

? How would you like to configure ESLint? https://nextjs.org/docs/app/api-reference/config/eslint
❯  Strict (recommended)
   Base
   Cancel ⚠ If you set up ESLint yourself, we recommend adding the Next.js ESLint plugin. See https://nextjs.org/docs/app/api-reference/config/eslint#migrating-existing-config
```
Investigation of Next.js 15.1.6 source code reveals the direct cause:
- **`node_modules/next/dist/lib/eslint/runLintCheck.js` (lines 270–324)**:
  Next.js checks for configuration files (`.eslintrc.json`, `eslint.config.mjs`, etc.) using `hasEslintConfiguration()`. When no configuration is detected (`config.exists === false`), line 324 executes:
  ```javascript
  const { config: selectedConfig } = strict
    ? await (0, _getESLintPromptValues.getESLintStrictValue)(baseDir)
    : await cliPrompt(baseDir);
  ```
  This immediately invokes `cliPrompt()` which starts the interactive `cli-select` terminal prompt.
- **Dependency Check in `runLintCheck.js` (lines 83–94, 121–126)**:
  ```javascript
  const requiredPackages = [
    { file: 'eslint', pkg: 'eslint', exportsRestrict: false },
    { file: 'eslint-config-next', pkg: 'eslint-config-next', exportsRestrict: false }
  ];
  ...
  if (deps.missing.some((dep) => dep.pkg === 'eslint')) {
    _log.error(`ESLint must be installed: npm install --save-dev eslint`);
    return null;
  }
  ```
  When `.eslintrc.json` is provided without installing `eslint`, `npm run lint` fails non-interactively with:
  ```
  ⨯ ESLint must be installed: npm install --save-dev eslint
  ```
- **Next.js 15 internal ESLint version pinning (`runLintCheck.js:335`)**:
  ```javascript
  if (dep.pkg === 'eslint') {
    dep.pkg = 'eslint@^9';
  }
  ```
  Next.js 15 explicitly targets `eslint@^9` paired with `eslint-config-next@15.1.6`.
- **Legacy code warning observed**:
  When `.eslintrc.json` extends `next/core-web-vitals` on the existing codebase:
  ```
  ./src/components/BattleArena.tsx
  137:6  Warning: React Hook useEffect has a missing dependency: 'spawnUnitInternal'. Either include it or remove the dependency array.  react-hooks/exhaustive-deps
  ```
  This produces 0 errors and exits with code `0`. Adding `"ignorePatterns": ["src/legacy/**"]` or moving legacy code to `src/legacy/` results in:
  ```
  ✔ No ESLint warnings or errors
  ```

---

### 1.2 Test Runner Comparison (`vitest` vs `tsx` with `node:test`)
The environment runtime is **Node v22.14.0** and **npm 10.9.2**.

#### Option A: `vitest` (Recommended)
- **Installation**: `npm install --save-dev vitest` (installed 28 packages in ~3-5s).
- **Configuration**: Uses `vitest.config.mts` with `resolve.alias: { '@': path.resolve(import.meta.dirname, './src') }`.
- **Execution Test**: Verified on a test importing `YKS_QUESTIONS` from `@/data/questions`:
  ```
  RUN  v5.1.0 /hackhaton
  ✓ tests/unit/sample.test.ts (1 test) 1ms
  Test Files  1 passed (1)
  Tests  1 passed (1)
  Duration  64ms
  ```
- **Capabilities**:
  * Rich assertions (`expect`, `toBeCloseTo`, `toMatchObject`).
  * Built-in fake timers (`vi.useFakeTimers()`) and spies (`vi.fn()`) critical for roguelite 60 FPS delta-time physics and weapon cooldown testing.
  * Explicitly mandated by `PROJECT.md` Feature 46 & Milestone 1.

#### Option B: `tsx` with `node:test`
- **Installation**: `npm install --save-dev tsx`.
- **Configuration**: Zero configuration; uses `tsx --test "tests/**/*.test.ts"`.
- **Execution Test**:
  ```
  ▶ Node test questions
    ✔ loads questions correctly (0.22ms)
  ✔ Node test questions (0.47ms)
  ℹ duration_ms 103.27
  ```
- **Limitations**: Assertions rely on `node:assert/strict`. Timer mocks and component integration are limited compared to Vitest.

---

### 1.3 `tsconfig.json` & Path Alias Verification
- Existing `tsconfig.json` line 21–23:
  ```json
  "paths": {
    "@/*": ["./src/*"]
  }
  ```
- Verified with TypeScript 5.7.2 compiler (`npx tsc --noEmit`):
  Tested dummy imports across three target subdirectories:
  * `@/game/engine/dummy` -> resolves to `src/game/engine/dummy.ts`
  * `@/legacy/dummy` -> resolves to `src/legacy/dummy.ts`
  * `@/types/dummy` -> resolves to `src/types/dummy.ts`
- Result: **0 TypeScript errors**. The wildcard `"@/*": ["./src/*"]` automatically and recursively covers all existing and newly created folders inside `src/`. No modifications to `tsconfig.json` paths are required.

---

## 2. Logic Chain

1. **Why `npm run lint` hangs / prompts**:
   `hasEslintConfiguration()` returns `exists: false` because neither `.eslintrc.json`, `.eslintrc.js`, nor `package.json#eslintConfig` exists in the repository. This routes control flow directly to `cliPrompt()`.
2. **Why both `.eslintrc.json` and `devDependencies` are mandatory**:
   Providing `.eslintrc.json` alone bypasses the prompt, but Next.js immediately verifies the presence of `eslint` and `eslint-config-next` in `node_modules` via `hasNecessaryDependencies()`. Without them in `devDependencies`, `npm run lint` fails with an exit error.
3. **Determining optimal package versions**:
   - `next`: `15.1.6`
   - `eslint-config-next`: `15.1.6` (exact match to Next.js version avoids plugin version mismatches).
   - `eslint`: `^9.0.0` (standard ESLint 9 is explicitly specified by Next 15's installer and supported via `@eslint/eslintrc` compatibility layer in Next.js).
4. **Why `vitest` is the recommended test runner**:
   - `PROJECT.md` line 104 explicitly lists: `Feature 46: Automated Test Runner Setup | Establishes Vitest test runner in package.json`.
   - Milestone 1 specification (line 139) states: `add vitest, create src/types/brotato.ts`.
   - Roguelite engine mechanics (Milestone 2 & Milestone 5) require precise mock clock ticks (`vi.advanceTimersByTime`), mock AudioContext (`vi.fn()`), and math assertions (`toBeCloseTo`). Vitest provides all of these natively.
   - `vitest.config.mts` using `import.meta.dirname` resolves `@/*` paths cleanly without requiring extra plugins.
5. **Why `tsconfig.json` requires no path changes**:
   The existing mapping `"@/*": ["./src/*"]` maps any import starting with `@/<subpath>` to `./src/<subpath>`. As long as new modules are placed in `src/game/`, `src/legacy/`, `src/types/`, etc., TypeScript resolves them without any additional path aliases.

---

## 3. Caveats

1. **ESLint 9 CLI vs Next.js Lint**:
   ESLint 9 defaults to Flat Config (`eslint.config.js`). Running raw `npx eslint` without flags would warn about `.eslintrc.json`. However, `npm run lint` runs `next lint`, which uses `loadESLint({ useFlatConfig: false })` internally. Therefore, `.eslintrc.json` works completely out-of-the-box with `next lint`.
2. **Legacy Code Warnings vs Errors**:
   `src/components/BattleArena.tsx` contains a React Hook dependency warning (`react-hooks/exhaustive-deps`). In `next/core-web-vitals`, this is a warning, not an error, so `npm run lint` and `npm run build` succeed with exit code `0`. To keep output 100% spotless, adding `"ignorePatterns": ["src/legacy/**"]` to `.eslintrc.json` is recommended as legacy components are moved to `src/legacy/`.
3. **Build Linting Activation**:
   `npm run build` currently skips linting because no configuration exists. Once `.eslintrc.json` is added, `npm run build` will lint all files during build. Verified that `npm run build` completes successfully with 0 errors when `.eslintrc.json` is present.
4. **Vitest Config File Extension**:
   Use `.mts` (`vitest.config.mts`) and `import.meta.dirname` rather than `vitest.config.ts` with `__dirname` to avoid Vite native config loader warnings.

---

## 4. Conclusion & Actionable Configuration Plan

For the Milestone 1 Worker (`teamwork_worker_m1`), implement the following exact changes:

### 4.1 Create `.eslintrc.json`
Create file `/Users/afurkanmac/Downloads/hackhaton/.eslintrc.json` with the following content:
```json
{
  "extends": "next/core-web-vitals",
  "ignorePatterns": [
    "node_modules/**",
    ".next/**",
    "out/**",
    "src/legacy/**"
  ]
}
```

### 4.2 Update `package.json`
In `/Users/afurkanmac/Downloads/hackhaton/package.json`:
1. Under `"scripts"`, add:
   ```json
   "test": "vitest run",
   "test:watch": "vitest"
   ```
2. Under `"devDependencies"`, add:
   ```json
   "eslint": "^9.0.0",
   "eslint-config-next": "15.1.6",
   "vitest": "^2.1.8"
   ```
*(Note: Worker can also execute `npm install --save-dev eslint@^9 eslint-config-next@15.1.6 vitest`)*.

### 4.3 Create `vitest.config.mts`
Create file `/Users/afurkanmac/Downloads/hackhaton/vitest.config.mts` with the following content:
```typescript
import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
});
```

### 4.4 `tsconfig.json`
Keep `tsconfig.json` path mappings as-is:
```json
"paths": {
  "@/*": ["./src/*"]
}
```
All directories (`src/game/*`, `src/legacy/*`, `src/types/*`) are fully supported.

---

## 5. Verification Method

The worker and orchestrator can independently verify this setup using the following commands:

```bash
# 1. Ensure node path is set
export PATH="$HOME/.local/node/bin:$PATH"

# 2. Install dependencies
npm install --save-dev eslint@^9 eslint-config-next@15.1.6 vitest

# 3. Verify non-interactive linting (MUST exit with code 0 without any prompt)
npm run lint

# 4. Verify TypeScript compilation and path resolution across all directories
npx tsc --noEmit

# 5. Verify automated test runner
npm test

# 6. Verify full production build with linting enabled
npm run build
```

### Invalidation Conditions
- `npm run lint` displays an interactive prompt `? How would you like to configure ESLint?` (indicates `.eslintrc.json` is missing or in wrong directory).
- `npm run lint` exits with `⨯ ESLint must be installed` (indicates `eslint` or `eslint-config-next` is missing from `node_modules`).
- `npm test` fails to resolve `@/*` imports (indicates `vitest.config.mts` alias is missing or incorrectly formatted).
- `npm run build` fails during `Linting and checking validity of types` step.
