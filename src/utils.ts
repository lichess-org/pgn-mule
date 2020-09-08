export interface Source {
  url: string;
  name: string;
  delay: number;
  pgn: string;
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

export let isCommand = (c: string, patterns: string[]) => {
  return patterns.some((p) => c === p);
};

export interface Replacement {
  oldContent: string;
  newContent: string;
}

export type Replacements = Replacement[];

export let dbg = <T>(v: T) => {
  console.log(v);
  return v;
};

// only for chess960 starting fens
export function toShredder(fen: string) {
  return fen
    .replace(/(\/\w\w\w\w\wR\wR w) KQkq/g, "$1 HFhf")
    .replace(/(\/\w\w\w\wR\w\wR w) KQkq/g, "$1 HEhe")
    .replace(/(\/\w\w\w\wR\wR\w w) KQkq/g, "$1 GEge")
    .replace(/(\/\w\w\wR\w\w\wR w) KQkq/g, "$1 HDhd")
    .replace(/(\/\w\w\wR\w\wR\w w) KQkq/g, "$1 GDgd")
    .replace(/(\/\w\w\wR\wR\w\w w) KQkq/g, "$1 FDfd")
    .replace(/(\/\w\wR\w\w\w\wR w) KQkq/g, "$1 HChc")
    .replace(/(\/\w\wR\w\w\wR\w w) KQkq/g, "$1 GCgc")
    .replace(/(\/\w\wR\w\wR\w\w w) KQkq/g, "$1 FCfc")
    .replace(/(\/\w\wR\wR\w\w\w w) KQkq/g, "$1 ECec")
    .replace(/(\/\wR\w\w\w\w\wR w) KQkq/g, "$1 HBhb")
    .replace(/(\/\wR\w\w\w\wR\w w) KQkq/g, "$1 GBgb")
    .replace(/(\/\wR\w\w\wR\w\w w) KQkq/g, "$1 FBfb")
    .replace(/(\/\wR\w\wR\w\w\w w) KQkq/g, "$1 EBeb")
    .replace(/(\/\wR\wR\w\w\w\w w) KQkq/g, "$1 DBdb")
    .replace(/(\/R\w\w\w\w\w\wR w) KQkq/g, "$1 HAha")
    .replace(/(\/R\w\w\w\w\wR\w w) KQkq/g, "$1 GAga")
    .replace(/(\/R\w\w\w\wR\w\w w) KQkq/g, "$1 FAfa")
    .replace(/(\/R\w\w\wR\w\w\w w) KQkq/g, "$1 EAea")
    .replace(/(\/R\w\wR\w\w\w\w w) KQkq/g, "$1 DAda")
    .replace(/(\/R\wR\w\w\w\w\w w) KQkq/g, "$1 CAca");
}
