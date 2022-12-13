import { differenceInSeconds } from 'date-fns';
import request from 'request';
import chardet from 'chardet';
import {
  cookie,
  minutesInactivityDie,
  minutesInactivitySlowDown,
  slowPollRate,
  userAgent,
  lichessNoDelayKey,
} from './config';
import { Redis } from './redis';
import { notEmpty, Source } from './utils';
import { Zulip } from './zulip';
import { TextDecoder } from 'util';

const timeouts: Record<string, ReturnType<typeof setTimeout> | undefined> = {};

const requestData = (source: Source) => {
  const match = source.url.match(/^lichess:(\w{8}(?:,\w{8})*)$/);
  if (!match) return { uri: source.url };
  const [_, ids] = match;
  return {
    uri: `https://lichess.org/api/games/export/_ids?key=${lichessNoDelayKey}&clocks=true`,
    method: 'POST',
    body: ids,
  };
};

const decodeBytes = (name: string, body: Buffer): string => {
  const encoding = chardet.detect(body) ?? 'utf-8';
  try {
    return new TextDecoder(encoding).decode(body);
  } catch (e) {
    console.log(
      `[${name}]: failed to decode response. detected encoding:${encoding} err:${e}`
    );
    return body.toString();
  }
};

export const pollURL = async (name: string, redis: Redis, zulip: Zulip) => {
  const timeoutId = timeouts[name];
  if (notEmpty(timeoutId)) clearTimeout(timeoutId);
  timeouts[name] = undefined;
  const source = await redis.getSource(name);
  if (source === undefined) return;
  request(
    {
      ...requestData(source),
      headers: {
        Cookie: cookie,
        'User-Agent': userAgent,
      },
      encoding: null,
    },
    async (err, res, body: Buffer) => {
      const source = await redis.getSource(name);
      if (source === undefined) return;
      const secondsSinceUpdated = differenceInSeconds(
        new Date(),
        source.dateLastUpdated
      );
      source.dateLastUpdated = new Date();
      await redis.setSource(source);
      if (body.length && !err && res.statusCode === 200) {
        const bodyText = decodeBytes(name, body);
        await redis.addPgn(source, bodyText);
        const allGames = bodyText.split('[Event').filter((g: string) => !!g);
        console.log(
          `[${name}]: Got ${allGames.length} games (${body.length} bytes)`
        );
      } else if (!body.length) {
        console.log(`[${name}]: Empty response`);
      } else if (res.statusCode !== 404) {
        console.log(`[${name}]: ERROR ${res.statusCode} err:${err}`);
      }
      const minutes =
        differenceInSeconds(new Date(), source.dateLastPolled) / 60.0;
      if (minutes >= minutesInactivityDie) {
        console.log(`${name} removed due to inactivity`);
        zulip.say(`${name} removed due to inactivity`);
        await redis.removeSource(name);
      } else {
        let updateFreqMillis = source.updateFreqSeconds * 1000;
        if (minutes >= minutesInactivitySlowDown) {
          updateFreqMillis = Math.max(
            source.updateFreqSeconds * 4 * 1000,
            slowPollRate * 1000
          );
          console.log(
            `New update freq: ${Math.round(updateFreqMillis / 1000)}s`
          );
          console.log(
            `Checking whether we just slowed down or not: ${secondsSinceUpdated} < ${slowPollRate} = ${
              secondsSinceUpdated < slowPollRate
            }`
          );
          console.log(
            `secondsSinceUpdate - source.updateFreqSeconds = ${Math.abs(
              secondsSinceUpdated - source.updateFreqSeconds / 1000.0
            )} | secondsSinceUpdate - slowPollRate = ${Math.abs(
              secondsSinceUpdated - slowPollRate
            )}
            Are we closer to the slow poll rate? ${
              Math.abs(
                secondsSinceUpdated - source.updateFreqSeconds / 1000.0
              ) < Math.abs(secondsSinceUpdated - slowPollRate)
            }
          `
          );
          if (
            Math.abs(secondsSinceUpdated - source.updateFreqSeconds / 1000.0) <
            Math.abs(secondsSinceUpdated - slowPollRate)
          ) {
            zulip.sayOnce(
              `${name} Slowing refresh to ${updateFreqMillis / 1000} seconds`
            );
          }
        }
        timeouts[name] = setTimeout(
          () => pollURL(name, redis, zulip),
          updateFreqMillis
        );
      }
    }
  );
};
