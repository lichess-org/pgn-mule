type Pgn = string;
type Seconds = number;
interface PgnEntry {
  pgn: Pgn;
  date: Date;
}

export default class PgnHistory {
  entries: PgnEntry[]; // chronological order: oldest first.

  constructor(es: PgnEntry[], readonly delay: Seconds) {
    this.entries = es;
  }

  add = (pgn: Pgn): void => {
    const date = new Date();
    const latest = this.getLatest();
    if (latest?.pgn != pgn) {
      this.entries.push({ pgn, date });
      this.purgeOldEntries(date);
    }
  };

  getWithDelay = (): Pgn | undefined => {
    const limit = new Date().getTime() - this.delay * 1000;
    let found: Pgn | undefined;
    for (const entry of this.entries) {
      if (entry.date.getTime() <= limit) found = entry.pgn;
      else break;
    }
    if (!found) {
      const latest = this.getLatest();
      if (latest) found = this.stripMoves(latest.pgn);
    }
    return found;
  };

  private purgeOldEntries = (now: Date) => {
    const limit = now.getTime() - this.delay * 1000;
    const keepIndex =
      this.entries.findIndex((e) => e.date.getTime() >= limit) - 1; // keep one older entry
    if (keepIndex > 0) this.entries = this.entries.slice(keepIndex);
  };

  private getLatest = () => this.entries[this.entries.length - 1];

  private stripMoves = (pgn: Pgn) =>
    pgn
      .split('\n')
      .filter((line) => line.trim() == '' || line[0] == '[')
      .join('\n');

  static fromJson = (entries: any[], delay: Seconds) =>
    new PgnHistory(
      entries.map((e: any) => ({
        pgn: e.pgn,
        date: new Date(e.date),
      })),
      delay
    );
}
