# Agent Instructions (repository root)

These rules apply to every coding agent working in this repository.
Each app also has its own `AGENTS.md` with stack-specific rules. **Read the
`AGENTS.md` of every app you touch before writing code.**

## Ground rules

1. **Do not invent.** Never guess a file path, import path, class name, field
   name, env var, or npm script. If it is not in a file you have read, open the
   file that defines it first. If you still cannot find it, stop and say so in
   your summary instead of guessing.
2. **Match existing code over general conventions.** This repo deviates from
   common framework defaults (see app `AGENTS.md` files). When in doubt, copy
   the pattern from the nearest existing sibling file.
3. **Edit existing files before creating new ones.** If a module, service, or
   controller for the feature already exists, extend it.
4. **Never create files or directories at the repository root.** All source
   code lives under `apps/<app>/`. The only root-level files are tooling and
   docs that already exist.
5. **Keep the change scoped to the task.** No drive-by refactors, renames, or
   formatting of unrelated files.
6. **Never commit secrets or edit `.env` files.**

## Repository layout

```
apps/
  core-api/      NestJS 11 REST API (TypeScript, ESM, Prisma + PostgreSQL, Redis)
  game-server/   Go WebSocket game server (Redis)
  web-client/    Next.js 16 + React 19 frontend
.github/workflows/  CI (one workflow per app + repo guard)
```

npm workspaces are rooted here (`package.json`); run npm commands from the
repository root with `-w <app>`.

| Code you are writing            | Where it goes                                           |
| ------------------------------- | ------------------------------------------------------- |
| API endpoint / service / DTO    | `apps/core-api/src/<feature>/`                          |
| Database schema change          | `apps/core-api/prisma/schema.prisma`                    |
| Realtime game / WebSocket logic | `apps/game-server/internal/<package>/`                  |
| UI page / component             | `apps/web-client/app/` or `apps/web-client/components/` |

## Definition of done

Run the verification command for every app you changed and make sure it passes
**before** you finish:

```bash
npm run verify:api     # apps/core-api   (prisma generate + typecheck + lint + tests)
npm run verify:game    # apps/game-server (go build + go vet + go test)
npm run verify:web     # apps/web-client (tests)
npm run verify         # all of the above
```

If verification fails, fix the code. Do not delete or weaken tests, add
`// @ts-ignore`, cast to `any`, or disable lint rules to make it pass.

New behaviour needs tests next to the code (`*.spec.ts` in core-api,
`*_test.go` in game-server, `__tests__/` in web-client).
