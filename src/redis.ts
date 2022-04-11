import { createHandyClient } from 'handy-redis';
import PgnHistory from './PgnHistory';
import { envOr, notEmpty, Replacements, Source } from './utils';

export class Redis {
  client = createHandyClient({
    port: parseInt(envOr('REDIS_PORT', '6379')),
    password: process.env.REDIS_PASSWORD || undefined,
    db: process.env.REDIS_DB,
  });

  setSource = async (s: Source) => {
    await this.client.set(`pgnmule:${s.name}`, sourceToJSON(s));
  };

  getSource = async (name: string) => {
    const value = await this.client.get(`pgnmule:${name}`);
    if (!value) return undefined;
    return sourceFromJSON(value);
  };

  getSources = async () => {
    const keys = await this.client.keys('pgnmule:*');
    console.log(`Got ${keys.length} sources: ${JSON.stringify(keys)}`);
    return (await Promise.all(keys.map((k) => this.client.get(k))))
      .filter(notEmpty)
      .map(sourceFromJSON);
  };

  removeSource = async (name: string) => {
    await this.client.del(`pgnmule:${name}`);
  };

  setReplacements = async (replacements: Replacements) => {
    await this.client.set(
      'pgnmuleprivate:replacements',
      JSON.stringify(replacements)
    );
  };

  getReplacements = async () => {
    const replacementsString = await this.client.get(
      'pgnmuleprivate:replacements'
    );
    if (!notEmpty(replacementsString)) {
      return [] as Replacements;
    }
    return JSON.parse(replacementsString) as Replacements;
  };
}

const sourceToJSON = (s: Source): string =>
  JSON.stringify({ ...s, pgnHistory: s.pgnHistory.entries });

const sourceFromJSON = (s: string): Source => {
  try {
    const d = JSON.parse(s);
    return {
      ...d,
      pgnHistory: PgnHistory.fromJson(d.pgnHistory, d.delaySeconds),
      updateFreqSeconds: Math.max(d.updateFreqSeconds, 1),
      dateLastPolled: new Date(d.dateLastPolled),
      dateLastUpdated: new Date(d.dateLastUpdated),
    };
  } catch (e) {
    console.log(s);
    throw e;
  }
};
