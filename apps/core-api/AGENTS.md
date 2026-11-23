# Agent Instructions: core-api

NestJS 11 + TypeScript (native ESM) + Prisma 7 (PostgreSQL) + Redis.
Read the root `AGENTS.md` first.

## Source of truth: read these before writing code

| Question                                 | Read this file                            |
| ---------------------------------------- | ----------------------------------------- |
| Table / column / relation / enum names   | `prisma/schema.prisma`                    |
| How auth works and what `req.user` holds | `src/auth/auth.guard.ts`                  |
| How a feature module is wired            | `src/<feature>/<feature.module.ts>`       |
| How Prisma is injected                   | `src/prisma/prisma.service.ts`            |
| How services are unit-tested             | `src/<feature>/<feature.service.spec.ts>` |

## Layout

Everything lives in `apps/core-api/src/<feature>/`, one folder per feature:

```
src/<feature>/
  <feature>.module.ts
  <feature>.controller.ts
  <feature>.service.ts
  <feature>.service.spec.ts      # required for new service logic
  dto/<name>.dto.ts
```

Existing features: `auth`, `email`, `games`, `logging`, `prisma`, `redis`,
`settings`, `users`. Add to an existing feature when the work belongs there.
A brand-new feature module must also be added to `imports` in
`src/app.module.ts`.

Never edit `generated/` (Prisma client output) or `dist/` (build output).

## Rules that differ from common defaults (frequent mistakes)

### 1. Prisma fields are snake_case. Use them exactly as in the schema.

There is no `@map` / camelCase layer. Prisma queries and results use the
schema names verbatim.

```ts
// CORRECT
where: { white_player_id: userUuid }, orderBy: { created_at: 'desc' }
select: { current_rating: true, white_player: { select: { username: true } } }

// WRONG: these fields do not exist
where: { whitePlayerId: userUuid }, orderBy: { createdAt: 'desc' }
```

API response objects / DTOs returned to clients use camelCase (e.g.
`createdAt: game.created_at`). Only map at the boundary.

Prisma types come from the generated client:
`import { Prisma, User } from '../../generated/prisma/client.js';`
Do not import from `@prisma/client`.

Schema changes: edit `prisma/schema.prisma`, run
`npm run prisma:generate -w core-api`, and state in your summary that a
migration is needed. Do not run `prisma:migrate` (it needs a live database;
the maintainer creates the migration). Never hand-write migration SQL.

### 2. Relative imports must end in `.js`

The package is `"type": "module"` with `moduleResolution: nodenext`.

```ts
import { PrismaService } from '../prisma/prisma.service.js'; // CORRECT
import { PrismaService } from '../prisma/prisma.service'; // WRONG
```

Package imports (`@nestjs/common`, etc.) have no extension.

### 3. Auth: `AuthGuard` sets `req.user.sub`

There is no Passport, no `JwtAuthGuard`, no `auth/guards/` folder.

```ts
import type { Request } from 'express';
import { AuthGuard } from '../auth/auth.guard.js';

@UseGuards(AuthGuard)
@Get('example')
handler(@Req() req: Request & { user: { sub: string } }) {
  const userUuid = req.user.sub;   // user's uuid. NOT req.user.uuid / req.user.id
}
```

Always type `@Req()`; an untyped `req` hides mistakes from the compiler.

### 4. Dependency injection

- Provide `PrismaService` in the feature module's `providers`
  (see `src/games/games.module.ts`); inject it as
  `constructor(private readonly prisma: PrismaService) {}`.
- Redis: import `RedisModule` and inject `RedisService`.
- Config: inject `ConfigService` (global). Do not read `process.env` in
  services.

### 5. Validation

A global `ValidationPipe({ transform, whitelist, forbidNonWhitelisted })` is
configured in `src/main.ts`. Request DTOs are classes with `class-validator`
decorators; query numbers need `@Type(() => Number)` from `class-transformer`.
See `src/games/dto/match-history.dto.ts`.

### 6. Tests

Jest + ts-jest in ESM mode. In spec files:

```ts
import { jest } from '@jest/globals';
import { Test, TestingModule } from '@nestjs/testing';
```

Mock `PrismaService` with `{ provide: PrismaService, useValue: mockPrisma }`.
Unit tests must not hit a real database or Redis.

### 7. Style

Prettier: single quotes, trailing commas. ESLint with type-checked rules.
Run `npm run lint -w core-api` to auto-fix formatting.

## Verify

```bash
npm run verify:api   # from the repository root
```

This runs `prisma generate`, `tsc --noEmit`, ESLint (no auto-fix), and Jest.
It must pass before you finish. It needs no running Postgres or Redis: every
`src/**/*.spec.ts` uses mocks.

## Tests that need live services: do not run or modify

| Test | Needs | Handling |
| ---- | ----- | -------- |
| `test/app.e2e-spec.ts` (run by `npm run test:e2e`, config `test/jest-e2e.json`) | Postgres + Redis (boots the full `AppModule`) | Not part of `verify`. The maintainer runs it. |

- Do not run `npm run test:e2e`, `prisma:migrate`, `prisma:deploy`, or
  `prisma:studio`; they connect to a real database.
- Do not edit or delete files in `test/`.
- Unit tests in `src/` must never connect to a real database or Redis. Mock
  `PrismaService` / `RedisService` with `useValue` as the existing specs do.
  If something can only be tested against a live service, say so in your
  summary instead of writing that test.
