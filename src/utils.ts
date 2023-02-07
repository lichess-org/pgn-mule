import { Chess } from 'chess.js';
import { promisify } from 'util';

export interface Source {
  url: string;
  name: string;
  updateFreqSeconds: number;
  delaySeconds: number;
  dateLastPolled: Date;
  dateLastUpdated: Date;
}

export function notEmpty<TValue>(
  value: TValue | null | undefined
): value is TValue {
  return value !== null && value !== undefined;
}

export function envOr(name: string, defaultValue: string): string {
  const token = process.env[name];
  if (token === undefined) return defaultValue;
  return token;
}

export function envOrDie(name: string): string {
  const token = process.env[name];
  if (token === undefined) {
    console.error(`${name} must be defined as an environment variable`);
    process.exit();
  }
  return token;
}

export interface Replacement {
  oldContent: string;
  newContent: string;
  regex?: boolean;
}

export type Replacements = Replacement[];

export const dbg = <T>(v: T) => {
  console.log(v);
  return v;
};

// only for chess960 starting fens
export function toShredder(fen: string) {
  return fen
    .replace(/(\/\w\w\w\w\wR\wR w) KQkq/g, '$1 HFhf')
    .replace(/(\/\w\w\w\wR\w\wR w) KQkq/g, '$1 HEhe')
    .replace(/(\/\w\w\w\wR\wR\w w) KQkq/g, '$1 GEge')
    .replace(/(\/\w\w\wR\w\w\wR w) KQkq/g, '$1 HDhd')
    .replace(/(\/\w\w\wR\w\wR\w w) KQkq/g, '$1 GDgd')
    .replace(/(\/\w\w\wR\wR\w\w w) KQkq/g, '$1 FDfd')
    .replace(/(\/\w\wR\w\w\w\wR w) KQkq/g, '$1 HChc')
    .replace(/(\/\w\wR\w\w\wR\w w) KQkq/g, '$1 GCgc')
    .replace(/(\/\w\wR\w\wR\w\w w) KQkq/g, '$1 FCfc')
    .replace(/(\/\w\wR\wR\w\w\w w) KQkq/g, '$1 ECec')
    .replace(/(\/\wR\w\w\w\w\wR w) KQkq/g, '$1 HBhb')
    .replace(/(\/\wR\w\w\w\wR\w w) KQkq/g, '$1 GBgb')
    .replace(/(\/\wR\w\w\wR\w\w w) KQkq/g, '$1 FBfb')
    .replace(/(\/\wR\w\wR\w\w\w w) KQkq/g, '$1 EBeb')
    .replace(/(\/\wR\wR\w\w\w\w w) KQkq/g, '$1 DBdb')
    .replace(/(\/R\w\w\w\w\w\wR w) KQkq/g, '$1 HAha')
    .replace(/(\/R\w\w\w\w\wR\w w) KQkq/g, '$1 GAga')
    .replace(/(\/R\w\w\w\wR\w\w w) KQkq/g, '$1 FAfa')
    .replace(/(\/R\w\w\wR\w\w\w w) KQkq/g, '$1 EAea')
    .replace(/(\/R\w\wR\w\w\w\w w) KQkq/g, '$1 DAda')
    .replace(/(\/R\wR\w\w\w\w\w w) KQkq/g, '$1 CAca');
}

const splitRegex = /\n\n(?=\[)/;
export function splitGames(multiPgn: string): string[] {
  return multiPgn.replace(/\r/g, '').split(splitRegex);
}

// chess 24 round numbers.
export function chess24Rounds(pgns: string[], roundbase: string): string[] {
  const chess = new Chess();
  return pgns.map((pgn, i) => {
    if (chess.load_pgn(pgn)) {
      chess.header('Round', roundbase.replace('{}', (i + 1).toString()));
      return chess.pgn();
    } else return pgn;
  });
}

export function filterGames(
  pgns: string[],
  roundQuery?: string | string[],
  sliceQuery?: string | string[]
): string[] {
  const rounds = parseRoundsQuery(roundQuery);
  const groups: string[][] = Array.from(Array(rounds?.length || 1), () => []);
  for (const pgn of pgns) {
    if (pgn.includes('[White "bye"]') || pgn.includes('[Black "bye"]'))
      continue;

    if (rounds) {
      const match = pgn.match(/\[Round "(\d+)(?:\.(\d+))?"/);
      if (!match) continue;
      const round = parseInt(match[1]);
      const board = match[2] ? parseInt(match[2]) : undefined;
      for (const [i, [filterRound, filterBoard]] of rounds.entries()) {
        if (
          round === filterRound &&
          (filterBoard === undefined || board === filterBoard)
        ) {
          groups[i].push(pgn);
          break;
        }
      }
    } else {
      groups[0].push(pgn);
    }
  }

  if (sliceQuery) {
    if (!Array.isArray(sliceQuery)) sliceQuery = [sliceQuery];
    for (const i in groups) {
      const parts = sliceQuery[i].split('-').map((x: string) => parseInt(x));
      if (parts[1]) groups[i] = groups[i].slice(parts[0] - 1, parts[1]);
      else groups[i] = groups[i].slice(0, parts[0]);
    }
  }

  return Array.prototype.concat(...groups);
}

const parseRoundsQuery = (
  query?: string | string[]
): number[][] | undefined => {
  if (!query) return undefined;
  if (!Array.isArray(query)) query = [query];
  return query.map((r) => r.split('.').map((x) => parseInt(x)));
};

const markdownTableRow = (row: string[]) => `| ${row.join(' | ')} |`;

export const markdownTable = (rows: string[][]) =>
  [
    markdownTableRow(rows[0]),
    markdownTableRow(rows[0].map((_) => '---')),
    ...rows.slice(1).map(markdownTableRow),
  ].join('\n');

export const markdownPre = (s: string) => '`' + s + '`';

export const regexEscape = (s: string) =>
  s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export const sleep = promisify(setTimeout);
