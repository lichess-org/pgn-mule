Merge, filter, tweak and expose PGN sources.

## Usage

```
# start redis
docker run -p 6379:6379 redis:latest
```

```
# edit .env
pnpm install
pnpm start
```

In zulip

```
add <name> <source-url> <update-freq-seconds> <delay-seconds>
list
remove <name>
addMany 1,2,3,4,5,6,7 <name>{} <url>-{}.pgn <update-freq-seconds> <delay-seconds>
addReplacement from->to
listReplacements
delReplacement 0
```

## Alternative sources

### Lichess game

Use `lichess:gameId1,gameId2` (and so on) as `<source-url>` to poll Lichess games. This can only handle polling 30 games per second (fewer if faster, more if slower) at maximum, probably fewer for reasonable stability.

### LCC

Use `lcc:<tournament id>/<round number>` as `<source-url>`.

### Chess.com

Use `chesscom:<event id>/<round id>` as `<source-url>`.

## QueryString Options:

Note that the first option must start with `?`, and the later ones with `&`.

Examples:

- `url.com/foo?round=1`
- `url.com/foo?round=1&slice=1-20&shredder=1`
- `url.com/foo?slice=1-20&round=1`

In the examples below we'll only show `&`. Replace with `?` if it's the first option.

### shredder

For a given url, add in: `&shredder=1` which will convert X-Fen to Shredder-Fen

## Custom Round Tags

Add in: `&roundbase=1.{}` and the games will have their 1.{}
replaced with 1.1, 1.2, 1.3 ...

## Docker

Build and run locally, with Redis, from a filled-in `.env` (copy `.env.example`; the Zulip credentials must be real for the bot to work):

```sh
docker compose -f compose.local.yml up --build
```

The server then listens on http://localhost:8080.

## Deploy

CI builds `ghcr.io/lichess-org/pgn-mule` on every push, tagged with the branch name and `sha-<short sha>`, plus `latest` on the default branch.

Production runs `compose.yml` as a Portainer stack behind traefik at https://zulip-pgn-mule.lichess.app, with Redis data in a named volume. Non-secret settings are in `compose.yml`; set these stack variables:

- Required: `PGN_MULE_UA`, `ZULIP_USERNAME`, `ZULIP_API_KEY`.
- Optional: `PGN_MULE_TAG` (default `latest`; pin a `sha-...` tag to roll back), `PGN_MULE_COOKIE`, `LICHESS_NODELAY_KEY`.

To deploy, either run the Docker workflow manually ("Run workflow" on the default branch), which builds the image and then calls the Portainer webhook stored in the `DEPLOY_WEBHOOK_URL` repository secret, or redeploy the stack in Portainer with "Re-pull image".
