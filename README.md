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

### round

Add in: `&round=4` to filter games with the `Round` PGN tag equal to `4` or starting with `4.`

### slice

Extract a slice of the games. Both sides are inclusive.

- `&slice=1-20` only keep the first 20 boards, and drop the other ones.
- `&slice=3` only keep the third board, and drop the other ones.
- `&slice=20-50` only keep the boards 20 to 50, and drop the other ones.
- `&slice=50-999` only keep the boards 50 to the last one.

The slicing happens **after** the `&round=` filtering.
Note that if you reduce the number of boards, after having already fetched them, then you must delete manually the extra chapters.
So be sure to have it `slice` set right from the beginning.

It's also possible to apply different slices for different rounds by having multiple round and slice parameters which pair up in order. For example, `?round=1&slice=9-16&round=2&slice=5-8` will take games 9-16 from (combined) rounds 1 and additionally games 5-8 from round 2.

## Custom Round Tags

Add in: `&roundbase=1.{}` and the games will have their 1.{}
replaced with 1.1, 1.2, 1.3 ...

## Deploy

```sh
pnpm build; rsync -av build node_modules root@radio.lichess.ovh:/home/zulip-pgn-mule/; ssh root@radio.lichess.ovh "systemctl restart zulip-pgn-mule"
```
