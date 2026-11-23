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
npm run verify:game   # from the repository root (go build, go vet, go test)
```
