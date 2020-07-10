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

