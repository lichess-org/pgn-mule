Merge, filter, tweak and expose PGN sources.


## Usage

```
yarn install --dev
echo 'export PGN_MULE_COOKIE="..."' > .env
echo 'export PUBLIC_PORT="3000"' > .env
echo 'export PUBLIC_IP="127.0.0.1"' > .env
echo 'export PUBLIC_SCHEME="http"' > .env
echo 'export SLACK_BOT_TOKEN="..."' > .env
yarn start
```

In slack
```
add <name> <source-url> <delay-seconds>
list
remove <name>
```
