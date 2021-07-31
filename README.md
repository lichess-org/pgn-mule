Merge, filter, tweak and expose PGN sources.

## Usage

```
# edit .env
yarn install
yarn start
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

## QueryString Options:

For a given url, add in: `?shredder=1` which will convert X-Fen to Shredder-Fen

## Custom Round Tags

For a given url, add in: `?roundbase=1.{}` and the games will have their 1.{}
replace with 1.1, 1.2, 1.3 ...
