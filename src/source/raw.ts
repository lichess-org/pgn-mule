import chardet from 'chardet';
import request from 'request';
import { userAgent, cookie } from '../config';
import { TextDecoder } from 'util';

export default async function fetchRaw(
  name: string,
  url: string
): Promise<string> {
  return new Promise((resolve, reject) => {
    request(
      {
        uri: url,
        headers: {
          Cookie: cookie,
          'User-Agent': userAgent,
        },
        encoding: null,
      },
      (err, res, body: Buffer) => {
        if (body.length && !err && res.statusCode === 200) {
          const encoding = chardet.detect(body) ?? 'utf-8';
          try {
            resolve(new TextDecoder(encoding).decode(body));
          } catch (e) {
            console.log(
              `[${name}]: failed to decode response. detected encoding:${encoding} err:${e}`
            );
            resolve(body.toString());
          }
        } else if (!body.length) {
          reject(`[${name}]: empty response`);
        } else if (res.statusCode !== 404) {
          reject(`[${name}]: ERROR ${res.statusCode} err:${err}`);
        }
      }
    );
  });
}
