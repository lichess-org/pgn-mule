import request from 'request';
import { lichessNoDelayKey } from '../config';
import fetchRaw from './raw';

export default async function fetchLichess(
  name: string,
  url: string
): Promise<string> {
  const match = url.match(/^lichess:(\w{8}(?:,\w{8})*)$/);
  if (!match) return fetchRaw(name, url);
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
          reject(`[${name}]: empty response`);
        } else if (res.statusCode !== 404) {
          reject(`[${name}]: ERROR ${res.statusCode} err:${err}`);
        }
      }
    );
  });
}
