# Agent Instructions: game-server

Go 1.26 WebSocket game server. Module path:
`github.com/haroonstar2/chessclone/apps/game-server`. Read the root `AGENTS.md` first.

## Layout

```
cmd/server/main.go        entrypoint (wiring only, no game logic)
internal/game/            rooms, manager, move handling, completion events
internal/ws/              WebSocket hub, client, HTTP handler
internal/redis/           Redis client + completion publishing
internal/observability/   metrics
```

Put new code in the existing `internal/<package>` it belongs to. Do not create
new top-level directories or a `pkg/` folder without being asked.

## Rules

- Dependencies are fixed by `go.mod`: chess rules via
  `github.com/corentings/chess/v2`, WebSockets via `github.com/gorilla/websocket`,
  Redis via `github.com/redis/go-redis/v9`. Do not add new modules unless the
  task requires it, and never hand-edit `go.sum`.
- Logging uses the standard library `log/slog`.
- Shared state is guarded by `sync.Mutex` (see `GameRoom` in
  `internal/game/room.go`); keep locking consistent with existing code.
- Message shapes exchanged with the web client live in
  `internal/game/messages.go`. Changing them is a cross-app change: update
  `apps/web-client` too.
- Tests are table-driven `*_test.go` files next to the code.
- Run `gofmt` on every file you change.
- Never commit the compiled `server` binary.

## Verify

```bash
npm run verify:game   # from the repository root (go build, go vet, go test -short)
```

## Tests that need live services: do not run or modify

| Test | Needs | Handling |
| ---- | ----- | -------- |
| `TestCreateRedisClient` in `internal/redis/redis_test.go` | A running Redis | Skipped by `-short` (already in `verify:game`). The maintainer runs it with `npm run verify:game:full`. |

- Do not run `go test` without `-short`, and do not run `verify:game:full`.
- Do not edit, delete, or add `t.Skip` to the test above, and do not change
  `CreateRedisClient` to make it pass.
- New tests that need a real Redis must start with
  `if testing.Short() { t.Skip("needs Redis") }` and be added to this table.
  Prefer mocks (see `RedisClientMock` in `internal/ws/handler_test.go`, or the
  hook in `internal/redis/completion_test.go`).

### Loopback-socket tests (not Redis)

These start an `httptest.NewServer` and dial `127.0.0.1`. They need no
external service and normally pass:

- `internal/ws/client_test.go`: `TestClientWritePump`, `TestClientReadPump`,
  `TestClientReadPumpClose`, `TestClientWritePumpClose`,
  `TestClientReadPumpUnexpectedClose`
- `internal/ws/handler_test.go`: `TestHandler_ValidTicket`,
  `TestHandler_ValidTicket_InvalidUpgrade`, `TestSocketProtocolAndRefresh`

If they fail only with `connectex: An attempt was made to access a socket in
a way forbidden by its access permissions` (or `bind: permission denied`),
your environment blocks local sockets. That is not a code bug: do not edit
these tests or the code under them. Report it as a blocker (root `AGENTS.md`
rule 11) and continue. Any other failure in these tests is real and must be
fixed.
