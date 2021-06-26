import zulip from 'zulip-js';
import { createHandyClient } from 'handy-redis';
import request from 'request';
import { isURL } from 'validator';
import { config as configDotEnv } from 'dotenv';
import {
  Source,
  notEmpty,
  envOr,
  envOrDie,
  Replacements,
  Replacement,
  isCommand,
  dbg,
  toShredder,
  chess24Rounds,
} from './utils';
import Koa from 'koa';
import Router from '@koa/router';
import { promisify } from 'util';
import { differenceInSeconds } from 'date-fns';

const sleep = promisify(setTimeout);

configDotEnv();

//------------------------------------------------------------------------------
// Environment variables/config
const cookie = envOrDie('PGN_MULE_COOKIE');
const publicScheme = envOrDie('PUBLIC_SCHEME');
const publicIP = envOrDie('PUBLIC_IP');
const publicPort = parseInt(envOrDie('PUBLIC_PORT'));
const slowPollRate = parseFloat(envOrDie('SLOW_POLL_RATE_SECONDS'));
const minutesInactivitySlowDown = parseFloat(envOrDie('MINUTES_INACTIVITY_SLOWDOWN'));
const minutesInactivityDie = parseFloat(envOrDie('MINUTES_INACTIVITY_DIE'));
const userAgent = envOr(
  'PGN_MULE_UA',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/69.0.3497.100 Safari/537.36'
);
const zulipStream = envOrDie('ZULIP_STREAM');
const zulipTopic = envOrDie('ZULIP_TOPIC');

const redisClient = createHandyClient();

//------------------------------------------------------------------------------
// A struct to keep timeouts
const timeouts: Record<string, ReturnType<typeof setTimeout> | undefined> = {};

(async () => {
  const z = await zulip({
    username: process.env.ZULIP_USERNAME,
    apiKey: process.env.ZULIP_API_KEY,
    realm: process.env.ZULIP_REALM,
  });

  const getSources = async () => {
    const keys = await redisClient.keys('pgnmule:*');
    console.log(`Got ${keys.length} sources: ${JSON.stringify(keys)}`);
    return (await Promise.all(keys.map(k => redisClient.get(k)))).filter(notEmpty).map(sourceFromJSON);
  };
  const clearAllSources = async (messageId: number) => {
    console.log(`Clearing all sources`);
    const sources = await getSources();
    sources.forEach(async s => {
      console.log(`Clearing source: ${s.name}`);
      await removeSource(s.name);
    });
    await react('check_mark', messageId);
    await say(`Cleared ${sources.length} sources`);
  };

  const startSources = async () => {
    (await getSources()).forEach(s => {
      console.log(`Starting ${s.name}`);
      pollURL(s.name);
    });
  };

  const pollURL = async (name: string) => {
    const timeoutId = timeouts[name];
    if (notEmpty(timeoutId)) clearTimeout(timeoutId);
    timeouts[name] = undefined;
    const source = await getSource(name);
    if (source === undefined) return;
    request(
      {
        uri: source.url,
        headers: {
          Cookie: cookie,
          'User-Agent': userAgent,
        },
      },
      async (err, res, body) => {
        const source = await getSource(name);
        if (source === undefined) return;
        if (body && !err && res.statusCode === 200) {
          source.pgn = body;
          const allGames = body.split('[Event').filter((g: string) => !!g);
          console.log(`[${name}]: Got ${allGames.length} games (${body.length} bytes)`);
        } else if (!body) {
          console.log(`[${name}]: Empty response`);
        } else if (res.statusCode !== 404) {
          console.log(`[${name}]: ERROR ${res.statusCode} err:${err}`);
        }
        const secondsSinceUpdated = differenceInSeconds(new Date(), source.dateLastUpdated);
        source.dateLastUpdated = new Date();
        await setSource(source);
        const minutes = differenceInSeconds(new Date(), source.dateLastPolled) / 60.0;
        if (minutes >= minutesInactivityDie) {
          console.log(`${name} removed due to inactivity`);
          say(`${name} removed due to inactivity`);
          await removeSource(name);
        } else {
          let delay = source.delay * 1000;
          if (minutes >= minutesInactivitySlowDown) {
            delay = Math.max(source.delay * 4 * 1000, slowPollRate * 1000);
            console.log(`New Delay: ${delay}`);
            console.log(
              `Checking whether we just slowed down or not: ${secondsSinceUpdated} < ${slowPollRate} = ${
                secondsSinceUpdated < slowPollRate
              }`
            );
            console.log(
              `secondsSinceUpdate - source.delay = ${Math.abs(
                secondsSinceUpdated - source.delay / 1000.0
              )} | secondsSinceUpdate - slowPollRate = ${Math.abs(secondsSinceUpdated - slowPollRate)}
            Are we closer to the slow poll rate? ${
              Math.abs(secondsSinceUpdated - source.delay / 1000.0) < Math.abs(secondsSinceUpdated - slowPollRate)
            }
          `
            );
            if (Math.abs(secondsSinceUpdated - source.delay / 1000.0) < Math.abs(secondsSinceUpdated - slowPollRate)) {
              sayOnce(`${name} Slowing refresh to ${delay / 1000} seconds`);
            }
          }
          timeouts[name] = setTimeout(() => pollURL(name), delay);
        }
      }
    );
  };

  const react = async (name: string, messageId: number) =>
    await z.reactions.add({
      message_id: messageId,
      emoji_name: name,
    });

  const removeSource = async (name: string) => {
    await redisClient.del(`pgnmule:${name}`);
  };
  const remove = async (name: string, messageId: number) => {
    await removeSource(name);
    await react('check_mark', messageId);
  };

  const setSource = async (s: Source) => {
    await redisClient.set(`pgnmule:${s.name}`, JSON.stringify(s));
  };

  const sourceFromJSON = (s: string): Source => {
    const d = JSON.parse(s);
    return {
      ...d,
      dateLastPolled: new Date(d.dateLastPolled),
      dateLastUpdated: new Date(d.dateLastUpdated),
    };
  };

  const getSource = async (name: string) => {
    const value = await redisClient.get(`pgnmule:${name}`);
    if (!value) return undefined;
    return sourceFromJSON(value);
  };

  const formatSource = (s: Source) =>
    `${s.name}: ${s.url} / ${s.delay}s -> ${publicScheme}://${publicIP}:${publicPort}/${s.name}`;

  const formatManySources = (sources: Source[]) =>
    `all of them -> ${publicScheme}://${publicIP}:${publicPort}/${sources.map(s => s.name).join('/')}`;

  const list = async () => {
    const message = (await getSources()).map(formatSource).join('\n') || 'No current urls';
    say(message);
  };

  const addOrSet = async (parts: string[], reactToMessageId?: number) => {
    let delay = 10;
    if (parts.length > 3) {
      delay = parseInt(parts[3]);
    }
    let name = parts[1];
    let url = parts[2];
    if (url.startsWith('<')) url = url.slice(1);
    if (url.endsWith('>')) url = url.slice(0, url.length - 1);

    if (!isURL(url)) {
      say(`${url} is not a valid URL`);
      console.log(`${url} is not a valid url`);
      return;
    }
    let source = {
      name,
      url,
      delay,
      pgn: '',
      dateLastPolled: new Date(),
      dateLastUpdated: new Date(),
    };
    await setSource(source);
    pollURL(name);
    if (reactToMessageId) {
      await react('check_mark', reactToMessageId);
    }
    await sleep(0.5);
    await say(formatSource(source));
    return source;
  };

  const addMany = async (parts: string[], messageId: number) => {
    parts.shift(); // Remove initial command
    let vars = parts.shift(); // Remove vars
    if (vars === undefined) return;
    const sources = await Promise.all(
      vars.split(',').map(async x => {
        const newParts = parts.map(p => p.replace(/\{\}/, x));
        return await addOrSet(['add', ...newParts]);
      })
    );
    await react('check_mark', messageId);
    await say(formatManySources(sources.filter(notEmpty)));
  };

  const setReplacements = async (replacements: Replacements) => {
    await redisClient.set('pgnmuleprivate:replacements', JSON.stringify(replacements));
  };
  const getReplacements = async () => {
    const replacementsString = await redisClient.get('pgnmuleprivate:replacements');
    if (!notEmpty(replacementsString)) {
      return [] as Replacements;
    }
    return JSON.parse(replacementsString) as Replacements;
  };
  const replace = async (pgn: string) => {
    const replacements = await getReplacements();
    return replacements.reduce((current, r) => current.replace(new RegExp(r.oldContent, 'g'), r.newContent), pgn);
  };
  const addReplacement = async (messageId: number, replacementString: string) => {
    const replacement = JSON.parse(replacementString) as Replacement;
    await setReplacements([...(await getReplacements()), replacement]);
    await react('check_mark', messageId);
  };
  const listReplacements = async () => {
    await say(
      `Replacements: \n ${(await getReplacements()).map((r, i) => `*${i}* -> ${JSON.stringify(r)}`).join('\n')}`
    );
  };
  const removeReplacement = async (messageId: number, indexString: string) => {
    const index = parseInt(indexString);
    await setReplacements((await getReplacements()).filter((_, i) => i !== index));
    await react('check_mark', messageId);
  };

  const zulipHandler = async (msg: any) => {
    try {
      let text = msg.content.trim();
      if (text.startsWith('Reminder: ')) {
        text = text.slice(10);
      }
      console.log(`Received command: ${text}`);
      let parts = text.split(/\s+/);
      if (parts.length < 1) return;
      let command = parts[0].toLowerCase();
      if (isCommand(command, ['add', 'set']) && (parts.length === 3 || parts.length === 4)) {
        console.log(`Processing add command ${parts}`);
        await addOrSet(parts);
      } else if (isCommand(command, ['addmany', 'add-many']) && (parts.length === 4 || parts.length === 5)) {
        console.log(`Processing addMany command ${parts}`);
        await addMany(parts, msg.id);
      } else if (isCommand(command, ['remove', 'rm', 'del', 'stop']) && parts.length == 2) {
        console.log(`Processing remove command ${parts}`);
        await remove(parts[1], msg.id);
      } else if (isCommand(command, ['list']) && parts.length === 1) {
        console.log(`Processing list command ${parts}`);
        list();
      } else if (isCommand(command, ['clear-all-sources']) && parts.length === 1) {
        console.log(`Processing clear-all-sources command ${parts}`);
        await clearAllSources(msg.id);
      } else if (isCommand(command, ['addreplacement', 'add-replacement']) && parts.length > 1) {
        console.log(`Processing add-replacement command ${parts}`);
        await addReplacement(msg.id, text.substr(command.length + 1));
      } else if (isCommand(command, ['listreplacements', 'list-replacements']) && parts.length === 1) {
        console.log(`Processing list-replacement command ${parts}`);
        listReplacements();
      } else if (
        isCommand(command, [
          'removereplacement',
          'remove-replacement',
          'delreplacement',
          'del-replacement',
          'rmreplacement',
          'rm-replacement',
        ]) &&
        parts.length === 2
      ) {
        console.log(`Processing remove-replacement command ${parts}`);
        removeReplacement(msg.id, parts[1]);
      }
    } catch (e) {
      console.error(`Uncaught error: ${e}`);
    }
  };

  const say = async (text: string) =>
    await z.messages.send({
      to: zulipStream,
      type: 'stream',
      subject: zulipTopic,
      content: text,
    });

  let lastSay = '';
  const sayOnce = async (text: string) => {
    if (text != lastSay) await say(text);
    lastSay = text;
  };

  const zulipMessageLoop = async (client: any, queue: number, handler: any) => {
    let lastEventId = -1;
    while (true) {
      const res = await client.events.retrieve({
        queue_id: queue,
        last_event_id: lastEventId,
      });
      res.events.forEach(async (event: any) => {
        lastEventId = event.id;
        if (event.type == 'heartbeat') {
          // console.log('Zulip heartbeat');
        } else if (event.message) {
          if (event.subject == zulipTopic) await handler(event.message);
        } else console.log(event);
      });
    }
  };

  console.log('Looking for sources to start');
  await startSources();
  const app = new Koa();
  const router = new Router();

  router.get('/', (ctx, _) => {
    ctx.body = 'Hello World';
  });
  router.get('/:names+', async (ctx, _) => {
    const names = ctx.params.names.split('/') as string[];
    const sources = dbg(await Promise.all(names.map(n => getSource(n as string))));
    await Promise.all(
      sources.filter(notEmpty).map(s => {
        s.dateLastPolled = new Date();
        return setSource(s);
      })
    );
    let pgns = sources.filter(notEmpty).map(s => s.pgn);
    if (notEmpty(ctx.query.roundbase)) {
      pgns = chess24Rounds(pgns, ctx.query.roundbase);
    }
    let pgn = await replace(pgns.join('\n\n'));

    if (ctx.query.shredder === '1') {
      pgn = toShredder(pgn);
    }

    ctx.body = pgn;
    ctx.status = 200;
    console.info(`GET: ${ctx.path} -> 200, length: ${pgn.length}`);
  });

  app.use(router.routes()).use(router.allowedMethods());
  app.listen(publicPort, publicIP);

  await z.users.me.subscriptions.add({
    subscriptions: JSON.stringify([{ name: zulipStream }]),
  });

  const q = await z.queues.register({ event_types: ['message'] });

  await zulipMessageLoop(z, q.queue_id, zulipHandler);
})();
