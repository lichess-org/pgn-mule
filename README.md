Merge, filter, tweak and expose PGN sources.

**To be replaced with https://github.com/lichess-org/python-zulip-api/tree/master/zulip_bots/zulip_bots/bots/pgn_mule**

## Usage

```
yarn install --dev
echo 'export PGN_MULE_COOKIE="..."' > .env
echo 'export PUBLIC_PORT="3000"' > .env
echo 'export PUBLIC_IP="127.0.0.1"' > .env
echo 'export PUBLIC_SCHEME="http"' > .env
echo 'export SLACK_BOT_TOKEN="..."' > .env
echo 'export DEFAULT_CHANNEL="..."' > .env
echo 'export SLOW_POLL_RATE_SECONDS="..."' > .env
echo 'export MINUTES_INACTIVITY_SLOWDOWN="..."' > .env
echo 'export MINUTES_INACTIVITY_DIE="..."' > .env
yarn start
```

In slack

```
add <name> <source-url> <delay-seconds>
list
remove <name>
addMany 1,2,3,4,5,6,7 <name>{} <url>-{}.pgn <delay-seconds>
addReplacement {"oldContent": "username", "newContent": "Name, Real 007"}
listReplacements
delReplacement 0
```

## QueryString Options:

For a given url, add in: `?shredder=1` which will convert X-Fen to Shredder-Fen

## Custom Round Tags

For a given url, add in: `?roundbase=1.{}` and the games will have their 1.{}
replace with 1.1, 1.2, 1.3 ...
