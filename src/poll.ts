import { differenceInSeconds } from 'date-fns';
import request from 'request';
import {
  cookie,
  minutesInactivityDie,
  minutesInactivitySlowDown,
  slowPollRate,
  userAgent,
} from './config';
import { Redis } from './redis';
import { notEmpty } from './utils';
import { Zulip } from './zulip';

const timeouts: Record<string, ReturnType<typeof setTimeout> | undefined> = {};

export const pollURL = async (name: string, redis: Redis, zulip: Zulip) => {
  const timeoutId = timeouts[name];
  if (notEmpty(timeoutId)) clearTimeout(timeoutId);
  timeouts[name] = undefined;
  const source = await redis.getSource(name);
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
      const source = await redis.getSource(name);
      if (source === undefined) return;
      if (body && !err && res.statusCode === 200) {
        source.pgnHistory.add(body);
        const allGames = body.split('[Event').filter((g: string) => !!g);
        console.log(
          `[${name}]: Got ${allGames.length} games (${body.length} bytes)`
        );
      } else if (!body) {
        console.log(`[${name}]: Empty response`);
      } else if (res.statusCode !== 404) {
        console.log(`[${name}]: ERROR ${res.statusCode} err:${err}`);
      }
      const secondsSinceUpdated = differenceInSeconds(
        new Date(),
        source.dateLastUpdated
      );
      source.dateLastUpdated = new Date();
      await redis.setSource(source);
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
