import { makePgn, PgnNodeData, Game as ChessGame, Node } from 'chessops/pgn.js';
import {
  Source,
  fetchJson,
  extendMainline,
  emptyHeaders,
  positionToFen,
} from '../utils.js';
import dayjs from 'dayjs';
import duration from 'dayjs/plugin/duration.js';
dayjs.extend(duration);

// NOTE: these types don't contain all the fields, just the ones we care about.

// https://1.pool.livechesscloud.com/get/<tournament_id>/tournament.json
export interface Tournament {
  name: string;
  timecontrol?: string;
  // TODO: what rules are there?
  rules: 'STANDARD' | string;
  // TODO: what does this field contain for chess960 games?
  chess960: 'STANDARD' | 'ANY';
  rounds: Array<{
    count: number;
    live: 0 | 1;
  }>;
}

interface Player {
  fname: string | null;
  mname: string | null;
  lname: string | null;
  title: string | null;
  // the FIDE ID, if filled by the organiser. check on ratings.fide.com
  fideid?: number;
}

export interface Pairing {
  white: Player;
  black: Player;
  result: string;
  live: boolean;
}

// https://1.pool.livechesscloud.com/get/<tournament_id>/round-<round_number>/index.json
export interface Round {
  // TODO: what does this contain when date is there?
  date: null;
  pairings: Array<Pairing>;
}

// https://1.pool.livechesscloud.com/get/<tournament_id>/round-<round_no>/game-<game_no>.json
export interface Game {
  // Looks like https://en.wikipedia.org/wiki/Fischer_random_chess_numbering_scheme
  // although it's also provided for standard games, only needed for chess960.
  chess960: number;
  moves: Array<string>;
}
async function getRound(tournamentId: string, round: number): Promise<Round> {
  return await fetchJson(
    `https://1.pool.livechesscloud.com/get/${tournamentId}/round-${round}/index.json`,
  );
}

async function getGame(
  tournamentId: string,
  round: number,
  game: number,
): Promise<Game> {
  return await fetchJson(
    `https://1.pool.livechesscloud.com/get/${tournamentId}/round-${round}/game-${game}.json`,
  );
}

function getPlayerName(player: Player): string {
  let name = '';
  if (player.fname) name += player.fname;
  if (player.mname) name += ` ${player.mname}`;
  if (player.lname) name += ` ${player.lname}`;
  return name;
}

export function gameToPgn(
  pairing: Pairing,
  boardIndex: number,
  tournament: Tournament,
  round: number,
  game: Game,
): string {
  const headers = emptyHeaders(
    `lcc: Tournament ${tournament.name}, round ${round} pairing ${JSON.stringify(pairing)}`,
  );
  headers.set('Event', tournament.name);
  headers.set('White', getPlayerName(pairing.white));
  headers.set('Black', getPlayerName(pairing.black));
  if (tournament.chess960 == 'ANY') {
    // seems to be the way to check if it's a chess960 game
    headers.set('FEN', positionToFen(game.chess960)!);
  }
  if (pairing.white.title) {
    headers.set('WhiteTitle', pairing.white.title);
  }
  if (pairing.black.title) {
    headers.set('BlackTitle', pairing.black.title);
  }
  headers.set('Result', pairing.result);
  // This field isn't necessarily in PGN format and can hold any random gibberish string as well
  // In case this does not contain the correct data, we can replace it using addReplacement command
  if (tournament.timecontrol) {
    headers.set('TimeControl', tournament.timecontrol);
  }
  headers.set('Round', round.toString());
  headers.set('Board', (boardIndex + 1).toString());
  const mainline = game.moves.map(move => {
    const [san, timeStringInSecs] = move.split(' ');
    let comments: string[] = [];
    if (timeStringInSecs !== undefined && !timeStringInSecs.startsWith('+')) {
      const time = dayjs.duration(parseInt(timeStringInSecs), 'seconds');
      const hours = time.hours();
      const minutes = time.minutes();
      const seconds = time.seconds();
      comments.push(`[%clk ${hours}:${minutes}:${seconds}]`);
    }
    return { comments, san };
  });
  const chessGame: ChessGame<PgnNodeData> = {
    headers: headers.inner,
    moves: new Node(),
  };
  extendMainline(chessGame, mainline);
  return makePgn(chessGame);
}

export default async function fetchLcc(source: Source): Promise<string> {
  const match = source.url.match(/^lcc:([0-9a-z\-]+)\/([0-9]+)$/);
  if (!match) throw `Invalid lcc URL: ${source.url}`;
  const tournamentId = match[1];
  const round = parseInt(match[2]);

  const tournament: Tournament = await fetchJson(
    `https://1.pool.livechesscloud.com/get/${tournamentId}/tournament.json`,
  );
  const roundInfo = await getRound(tournamentId, round);
  const games: Game[] = [];
  // TODO: fetch games  asynchronously
  for (let i = 1; i <= tournament.rounds[round - 1].count; i++) {
    games.push(await getGame(tournamentId, round, i));
  }
  let pgn = '';
  for (const [boardIndex, game] of games.entries()) {
    const pairing = roundInfo.pairings[boardIndex];
    if (!pairing.white || !pairing.black) continue;
    pgn += gameToPgn(pairing, boardIndex, tournament, round, game) + '\n\n';
  }
  return pgn;
}
