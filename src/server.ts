import Router from '@koa/router';
import Koa from 'koa';
import { publicIP, publicPort } from './config';
import { pollURL } from './poll';
import { Redis } from './redis';
import {
  chess24Rounds,
  filterGames,
  notEmpty,
  regexEscape,
  splitGames,
  toShredder,
} from './utils';
import { Zulip } from './zulip';

(async () => {
  const redis = new Redis();
  const z = await Zulip.new(redis);

  const startSources = async () => {
    (await redis.getSources()).forEach(s => {
      console.log(`Starting ${s.name}`);
      pollURL(s.name, redis, z);
    });
  };

  const replace = async (pgn: string) => {
    const replacements = await redis.getReplacements();
    return replacements.reduce(
      (current, r) =>
        current.replace(
          new RegExp(r.regex ? r.oldContent : regexEscape(r.oldContent), 'g'),
          r.newContent,
        ),
      pgn,
    );
  };

  console.log('Looking for sources to start');
  await startSources();
  const app = new Koa();
  const router = new Router();

  router.get('/', (ctx, _) => {
    ctx.body = 'Hello World';
  });
  router.get('/favicon.ico', (ctx, _) => {
    ctx.throw(404);
  });
  router.get('/:names+', async (ctx, _) => {
    const names = ctx.params.names.split('/') as string[];
    const sources = (
      await Promise.all(names.map(n => redis.getSource(n as string)))
    ).filter(notEmpty);
    await Promise.all(
      sources.map(s => {
        const commit =
          s.dateLastPolled.getTime() < new Date().getTime() - 60_000;
        s.dateLastPolled = new Date();
        return commit ? redis.setSource(s) : Promise.resolve();
      }),
    );
    const pgns = (
      await Promise.all(sources.map(s => redis.getPgnWithDelay(s)))
    ).filter(notEmpty);
    let games = splitGames(pgns.join('\n\n'));
    games = filterGames(games, ctx.query.round, ctx.query.slice);
    if (notEmpty(ctx.query.roundbase)) {
      if (typeof ctx.query.roundbase === 'string') {
        games = chess24Rounds(games, ctx.query.roundbase);
      } else {
        z.say('roundbase query parameter must be a string');
      }
    }
    let pgn = await replace(games.join('\n\n'));

    if (ctx.query.shredder === '1') {
      pgn = toShredder(pgn);
    }

    ctx.body = pgn;
    ctx.status = 200;
    console.info(`GET: ${ctx.path} -> 200, length: ${pgn.length}`);
  });

  app.use(router.routes()).use(router.allowedMethods());
  app.listen(publicPort, publicIP);

  await z.messageLoop();
})();
