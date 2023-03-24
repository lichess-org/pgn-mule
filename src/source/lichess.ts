import chardet from 'chardet';
import request from 'request';
import { lichessNoDelayKey } from '../config';
import { TextDecoder } from 'util';
import FetchRaw from './raw';

export default async function FetchLichess(
  name: string,
  url: string
): Promise<string> {
  const match = url.match(/^lichess:(\w{8}(?:,\w{8})*)$/);
  if (!match) return FetchRaw(name, url);
  const [_, ids] = match;
  return new Promise((resolve, reject) => {
    request(
      {
        uri: `https://lichess.org/api/games/export/_ids?key=${lichessNoDelayKey}&clocks=true`,
        method: 'POST',
        body: ids,
      },
      (err, res, body: Buffer) => {
        if (body.length && !err && res.statusCode === 200) {
          resolve(body.toString());
        } else if (!body.length) {
          reject(`[${name}]: empty response`);
        } else if (res.statusCode !== 404) {
          reject(`[${name}]: ERROR ${res.statusCode} err:${err}`);
        }
      }
    );
  });
}
