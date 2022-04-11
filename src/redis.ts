import { createHandyClient } from 'handy-redis';
import { envOr, notEmpty, Replacements, Source } from './utils';

export class Redis {
  client = createHandyClient({
    port: parseInt(envOr('REDIS_PORT', '6379')),
    password: process.env.REDIS_PASSWORD || undefined,
    db: process.env.REDIS_DB,
  });

  setSource = async (s: Source) => {
    await this.client.set(`pgnmule:sources:${s.name}:info`, JSON.stringify(s));
  };

  getSource = async (name: string) => {
    const value = await this.client.get(`pgnmule:sources:${name}:info`);
    if (!value) return undefined;
    return sourceFromJSON(value);
  };

  getSources = async () => {
    const keys = await this.client.keys('pgnmule:sources:*:info');
    console.log(`Got ${keys.length} sources: ${JSON.stringify(keys)}`);
    return (await Promise.all(keys.map((k) => this.client.get(k))))
      .filter(notEmpty)
      .map(sourceFromJSON);
  };

  /// list of unix times for which a pgn is available
  private getPgnList = async (name: string): Promise<number[]> => {
    const pgns = await this.client.get(`pgnmule:sources:${name}:pgns`);
    if (!pgns) return [];
    return JSON.parse(pgns);
  };

  private setPgnList = async (name: string, pgns: number[]) => {
    await this.client.set(`pgnmule:sources:${name}:pgns`, JSON.stringify(pgns));
  };

  private setPgn = async (name: string, time: number, pgn: string) => {
    await this.client.set(`pgnmule:pgns:${name}:${time}`, pgn);
  };

  addPgn = async (source: Source, pgn: string) => {
    const pgns = await this.getPgnList(source.name);
    const latest =
      pgns.length > 0
        ? await this.getPgn(source.name, pgns[pgns.length - 1])
        : undefined;
    if (latest !== pgn) {
      const time = new Date().getTime();

      await this.setPgn(source.name, time, pgn);
      pgns.push(time);

      const limit = time - source.delaySeconds * 1000;
      const keepIndex = pgns.findIndex((d) => d >= limit) - 1; // keep one older entry
      if (keepIndex > 0) pgns.splice(0, keepIndex);

      await this.setPgnList(source.name, pgns);
    }
  };

  clearPgns = async (source: Source) => {
    const pgns = await this.getPgnList(source.name);
    if (pgns.length > 0) {
      this.client.del(...pgns.map((t) => `pgnmule:pgns:${source.name}:${t}`));
    }
    await this.setPgnList(source.name, []);
  };

  private getPgn = async (name: string, time: number) =>
    await this.client.get(`pgnmule:pgns:${name}:${time}`);

  getPgnWithDelay = async (source: Source) => {
    const limit = new Date().getTime() - source.delaySeconds * 1000;
    const pgns = await this.getPgnList(source.name);
    let found: number | undefined;
    for (const t of pgns) {
      if (t <= limit) found = t;
      else break;
    }
    if (found === undefined) {
      const latest = await this.getPgn(source.name, pgns[pgns.length - 1]);
      if (latest) return stripMoves(latest);
      return undefined;
    } else return await this.getPgn(source.name, found);
  };

  removeSource = async (name: string) => {
    const pgns = await this.getPgnList(name);
    const keys = [
      `pgnmule:sources:${name}:info`,
      `pgnmule:sources:${name}:pgns`,
      ...pgns.map((t) => `pgnmule:pgns:${name}:${t}`),
    ];
    await this.client.del(...keys);
  };

  setReplacements = async (replacements: Replacements) => {
    await this.client.set('pgnmule:replacements', JSON.stringify(replacements));
  };

  getReplacements = async () => {
    const replacementsString = await this.client.get('pgnmule:replacements');
    if (!notEmpty(replacementsString)) {
      return [] as Replacements;
    }
    return JSON.parse(replacementsString) as Replacements;
  };
}

const sourceFromJSON = (s: string): Source => {
  try {
    const d = JSON.parse(s);
    return {
      ...d,
      updateFreqSeconds: Math.max(d.updateFreqSeconds, 1),
      dateLastPolled: new Date(d.dateLastPolled),
      dateLastUpdated: new Date(d.dateLastUpdated),
    };
  } catch (e) {
    console.log(s);
    throw e;
  }
};

const stripMoves = (pgn: string) =>
  pgn
    .split('\n')
    .filter((line) => line.trim() == '' || line[0] == '[')
    .join('\n');
