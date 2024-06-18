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

## Deploy

```sh
pnpm build; rsync -aLv build node_modules root@radio.lichess.ovh:/home/zulip-pgn-mule/; ssh root@radio.lichess.ovh "chown -R zulip-pgn-mule /home/zulip-pgn-mule/ && systemctl restart zulip-pgn-mule"
```
