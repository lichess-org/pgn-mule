type Pgn = string;
type Seconds = number;
interface PgnEntry {
  pgn: Pgn;
  date: Date;
}

export default class PgnHistory {
  entries: PgnEntry[]; // chronological order: oldest first.

  constructor(es: PgnEntry[], readonly maxAge: Seconds) {
    this.entries = es;
  }

  add = (pgn: Pgn): void => {
    const date = new Date();
    const latest = this.entries[this.entries.length - 1];
    if (latest?.pgn != pgn) this.entries.push({ pgn, date });
    this.purgeOldEntries();
  };

  getWithDelay = (seconds: Seconds): Pgn | undefined => {
    const limit = new Date().getTime() - seconds * 1000;
    let found: Pgn | undefined;
    for (const entry of this.entries) {
      if (entry.date.getTime() <= limit) found = entry.pgn;
      else break;
    }
    return found;
  };

  private purgeOldEntries = () => {
    const limit = new Date().getTime() - this.maxAge * 1000;
    this.entries = this.entries.filter(e => e.date.getTime() >= limit);
  };

  static fromJson = (entries: any[], maxAge: Seconds) =>
    new PgnHistory(
      entries.map((e: any) => ({
        pgn: e.pgn,
        date: new Date(e.date),
      })),
      maxAge
    );
}
