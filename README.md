Merge, filter, tweak and expose PGN sources.


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

```
