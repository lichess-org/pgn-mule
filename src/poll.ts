import { differenceInSeconds } from 'date-fns';
import {
  minutesInactivityDie,
  minutesInactivitySlowDown,
  slowPollRate,
} from './config';
import { Redis } from './redis';
import { notEmpty, Source } from './utils';
import { Zulip } from './zulip';

import fetchChessCom from './source/chessCom';
import fetchLichess from './source/lichess';
import fetchLcc from './source/lcc';
import fetchRaw from './source/raw';

const timeouts: Record<string, ReturnType<typeof setTimeout> | undefined> = {};

const fetchData = async (source: Source): Promise<string | null> => {
  try {
    if (source.url.startsWith('chesscom:')) {
      return await fetchChessCom(source);
    } else if (source.url.startsWith('lichess:')) {
      return await fetchLichess(source);
    } else if (source.url.startsWith('lcc:')) {
      return await fetchLcc(source);
    } else {
      return await fetchRaw(source);
    }
  } catch (e) {
    console.log(`[${source.name}]: ${e}`);
    return null;
  }
};

export const pollURL = async (name: string, redis: Redis, zulip: Zulip) => {
  const timeoutId = timeouts[name];
  if (notEmpty(timeoutId)) clearTimeout(timeoutId);
  timeouts[name] = undefined;

  let source = await redis.getSource(name);
  if (source === undefined) return;

  const data = await fetchData(source);

  source = await redis.getSource(name); // in case it was deleted in the meantime
  if (source === undefined) return;

  const secondsSinceUpdated = differenceInSeconds(
    new Date(),
    source.dateLastUpdated
  );
  source.dateLastUpdated = new Date();
  await redis.setSource(source);

  if (data) {
    await redis.addPgn(source, data);
    const allGames = data.split('[Event').filter((g: string) => !!g);
    console.log(
      `[${name}]: Got ${allGames.length} games (${data.length} bytes)`
    );
  }

  const minutes = differenceInSeconds(new Date(), source.dateLastPolled) / 60.0;
  if (minutes >= minutesInactivityDie) {
    console.log(`${name} removed due to inactivity`);
    zulip.say(`${name} removed due to inactivity`);
    await redis.removeSource(name);
    return;
  }

  let updateFreqMillis = source.updateFreqSeconds * 1000;
  if (minutes >= minutesInactivitySlowDown) {
    updateFreqMillis = Math.max(
      source.updateFreqSeconds * 4 * 1000,
      slowPollRate * 1000
    );
    console.log(`New update freq: ${Math.round(updateFreqMillis / 1000)}s`);
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
};
