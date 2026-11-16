# Repository Guidelines

## Project Structure & Module Organization

This is a Vite, React, and TypeScript website. `src/` contains the app entry point, pages and components, hooks, context, data, utilities, and client services. Root `api/` holds Vercel serverless endpoints; `lib/` holds shared helpers. `supabase/` contains database migrations and functions, while `researchmate-backend/` is a separate backend package. Put static assets in `public/`, tests in `tests/`, maintenance scripts in `scripts/`, and longer design notes in `docs/`. The production bundle is generated in `dist/`.

## Build, Test, and Development Commands

- `npm ci` installs the versions pinned in `package-lock.json`.
- `npm run dev` starts the Vite development server on port 3000.
- `npm run build` creates the production bundle in `dist/`.
- `npm run preview` serves that bundle locally for a final check.
- `npm test` runs the Vitest suite once. Use `npx vitest run tests/questionBankService.test.ts` for a focused test.
- `npx tsc --noEmit` checks TypeScript without writing output. There is no `type-check` npm script despite the older README example.

## Coding Style & Naming Conventions

Follow nearby code: two-space indentation, semicolons, and TypeScript for application logic. Use PascalCase for React components and their `.tsx` files, camelCase for functions and service files, and descriptive names such as `pdfQuestionImporter.ts`. Keep imports and formatting consistent with the file being edited; this repository does not currently define a shared ESLint or Prettier command. Prefer existing service boundaries over adding logic to large components.

## Testing Guidelines

Vitest tests live in `tests/` and usually mirror the module name as `*.test.ts` or `*.test.tsx`; UI tests use React Testing Library where needed. Add tests for behavior changes, especially ingestion, exam generation, and storage logic. Run focused tests during development and `npm test` before a pull request. No coverage threshold is configured.

## Commits & Pull Requests

Recent commits use Conventional Commit style, often with a scope: `fix(importer): repair answer parsing`, `feat(lesson): add generator`, or `docs: update guide`. Keep commits focused. In pull requests, describe the user-facing change, link the relevant issue when one exists, list the checks run, and include screenshots for visual changes.

## Configuration & Security

Copy `.env.example` to `.env.local` for local configuration. Never commit credentials, local environment files, generated bundles, or proprietary PDF fixtures. Check whether a new environment variable belongs on the client: `VITE_*` values are exposed to browser code.

## Review and Importer Guardrails

- Review proposed changes against the existing code. Identify plausible bugs, edge cases, and regressions, and confirm existing behavior is not silently weakened.
- Test behavior through the real implementation. For bug fixes, show that a regression test fails on the old behavior and passes after the fix. Run `npm run build` and relevant Vitest checks before finishing.
- Never invent or default answer keys; a wrong key is worse than a missing question. Keep parser fixes generic and never open frozen held-out test PDFs.
- Never push to `main` or expose `.env` keys without explicit user approval.
