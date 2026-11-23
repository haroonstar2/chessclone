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
   docs that already exist. The one exception is the gitignored `.agent/`
   scratch folder for plans (see below).
5. **Keep the change scoped to the task.** No drive-by refactors, renames, or
   formatting of unrelated files.
6. **Never commit secrets or edit `.env` files.**
7. **No placeholders or elided code.** Never write `// ... rest unchanged`,
   `// existing code`, `TODO: implement`, empty function bodies, or stubs that
   return hard-coded values. Every edit must contain the complete, final code.
8. **Every new file must be wired in.** A new file that nothing imports is
   dead code, and the compiler won't flag it. New NestJS modules go in
   `imports` in `src/app.module.ts`. New controllers and providers go in
   their feature module. New React components must be rendered by a page or
   another component. New Go code must be called from existing code.
9. **Evidence, not claims.** Never write "tests pass", "verified", or
   "done" without pasting the command output that shows it. A claim with no
   output counts as not done.
10. **Commit after each checklist item.** Commit as soon as a planned file
    (and its test) is complete. Work that is uncommitted when the session ends
    counts as not done.
11. **Stop when blocked, and say so.** If you can't finish a planned file
    (missing information, failing check you can't fix, unclear requirement),
    write the blocker next to that item in `.agent/PLAN.md`, stop, and report
    it. Never hand in partial work that looks complete.
12. **Contracts are cross-app.** A change to a shared shape (WebSocket messages
    in `apps/game-server/internal/game/messages.go`, API response DTOs in
    `apps/core-api/src/**/dto/`) must update every app that uses it in the
    same task, or be listed as a blocker per rule 11.

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

## Plan before editing: file checklist

Before changing any code, write a plan that lists **every file you will create
or modify**, one per line, with a checkbox:

```markdown
## Plan: <task name>
- [ ] apps/core-api/src/games/games.service.ts      (modify: add getStats)
- [ ] apps/core-api/src/games/games.service.spec.ts (modify: tests for getStats)
- [ ] apps/core-api/src/games/dto/stats.dto.ts      (create)
```

- Keep the plan in `.agent/PLAN.md` (gitignored, never committed). If your
  harness can't write files outside the task, put the plan at the top of your
  first reply instead.
- Only tick a box after the file is saved **and** appears in `git status`.
- If you need a file that isn't in the plan, add it to the plan first.
- If you drop a planned file, strike it through and say why. Don't delete the
  line.

## Scope per session: one layer at a time

Do one layer per session for multi-file features, in this order:

1. **Contracts:** Prisma schema, DTOs, shared types and message shapes.
2. **Backend logic:** services, controllers, Go handlers, plus their tests.
3. **Frontend:** pages, components, plus their tests.

At the end of each layer, finish (see below) and stop. Leave the next layer
unchecked in `.agent/PLAN.md` so a fresh session can pick it up. Never start
the next layer in the same session unless the task explicitly asks for it.

## Before you finish or open a PR

Run these, in order, and include their output in your final message:

```bash
git status
git diff --stat <base>...HEAD   # plus `git diff --stat` for uncommitted work
npm run verify                  # or the verify:<app> script for each app you touched
```

Then confirm all of the following. If any check fails, you are not done:

1. **Every planned file appears** in the `git diff --stat` output. If a file
   is in the plan but not in the diff, your change was not saved.
2. **No unplanned files appear.** Every file in the diff is in the plan.
3. **Nothing is left behind.** `git status` shows no untracked or unstaged
   files belonging to the task.
4. **Verification passed** on the final state of the code, not an earlier one.

Your final summary must list changed files **from the `git diff --stat`
output, not from memory**.

## Definition of done

Run the verification command for every app you changed and make sure it passes
**before** you finish:

```bash
npm run verify:api     # apps/core-api   (prisma generate + typecheck + lint + tests)
npm run verify:game    # apps/game-server (go build + go vet + go test -short)
npm run verify:web     # apps/web-client (tests)
npm run verify         # all of the above
```

`verify` never needs a running Postgres or Redis. Tests that do are listed in
each app's `AGENTS.md` under "Tests that need live services"; do not run,
edit, skip, or try to fix them. The maintainer runs them.

If verification fails, fix the code. Do not delete or weaken tests, add
`// @ts-ignore`, cast to `any`, or disable lint rules to make it pass.

New behaviour needs tests next to the code (`*.spec.ts` in core-api,
`*_test.go` in game-server, `__tests__/` in web-client).
