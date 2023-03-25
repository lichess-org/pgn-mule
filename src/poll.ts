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

import FetchChessDotCom from './source/chessDotCom';
import FetchLichess from './source/lichess';
import FetchRaw from './source/raw';

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

export const pollURL = async (name: string, redis: Redis, zulip: Zulip) => {
  const timeoutId = timeouts[name];
  if (notEmpty(timeoutId)) clearTimeout(timeoutId);
  timeouts[name] = undefined;
  const source = await redis.getSource(name);
  if (source === undefined) return;
  try {
    let bodyText = '';
    if (source.url.startsWith('chessdotcom:')) {
      bodyText = await FetchChessDotCom(name, source.url);
    } else if (source.url.startsWith('lichess:')) {
      bodyText = await FetchLichess(name, source.url);
    } else {
      bodyText = await FetchRaw(name, source.url);
    }
    if (source === undefined) return;
    const secondsSinceUpdated = differenceInSeconds(
      new Date(),
      source.dateLastUpdated
    );
    source.dateLastUpdated = new Date();
    await redis.setSource(source);
    await redis.addPgn(source, bodyText);
    const allGames = bodyText.split('[Event').filter((g: string) => !!g);
    /*    console.log(
          `[${name}]: Got ${allGames.length} games (${body.length} bytes)`
        );*/
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
    }
  } catch (e) {
    console.log(e);
  }
};
