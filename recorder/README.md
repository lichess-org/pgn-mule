# HTTP endpoint recorder

## Usage

```
npm run record data/ictp2022 https://1.pool.livechesscloud.com/get/73fff8af-cc10-4c42-a5b0-83d7f2827f3f/round-5/index.json 1
```

will hit that URL every second and store the content to data/ictp2022 only when it changes.
