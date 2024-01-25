import request from 'request';
import { lichessNoDelayKey } from '../config.js';
import { Source } from '../utils.js';
import fetchRaw from './raw.js';

export default async function fetchLichess(source: Source): Promise<string> {
  const match = source.url.match(/^lichess:(\w{8}(?:,\w{8})*)$/);
  if (!match) return fetchRaw(source);
  const [_, ids] = match;
  return new Promise((resolve, reject) => {
    request(
      {
        uri: `https://lichess.org/api/games/export/_ids?key=${lichessNoDelayKey}&clocks=true`,
        method: 'POST',
        body: ids,
      },
      (err, res, body: string) => {
        if (body && !err && res.statusCode === 200) {
          resolve(body);
        } else if (!body) {
          reject('empty response');
        } else if (res.statusCode !== 404) {
          reject(`ERROR ${res.statusCode} err:${err}`);
        }
      },
    );
  });
}
