import { Chess } from 'chess.js';
import { Source, fetchJson } from '../utils';

// NOTE: these types don't contain all the fields, just the ones we care about.

// https://1.pool.livechesscloud.com/get/<tournament_id>/tournament.json
interface Tournament {
  name: string;
  timecontrol: string;
  // TODO: what rules are there?
  rules: 'STANDARD' | string;
  // TODO: what does this field contain for chess960 games?
  chess960: 'STANDARD' | string;
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
  // TODO: what does this contain when fideid is not null?
  fideid: null;
}

interface Pairing {
  white: Player;
  black: Player;
  result: string;
  live: boolean;
}

// https://1.pool.livechesscloud.com/get/<tournament_id>/round-<round_number>/index.json
interface Round {
  // TODO: what does this contain when date is there?
  date: null;
  pairings: Array<Pairing>;
}

// https://1.pool.livechesscloud.com/get/<tournament_id>/round-<round_no>/game-<game_no>.json
interface Game {
  // Looks like https://en.wikipedia.org/wiki/Fischer_random_chess_numbering_scheme
  // although it's also provided for standard games, only needed for chess960.
  chess960: number;
  moves: Array<string>;
}
async function getRound(tournamentId: string, round: number): Promise<Round> {
  return await fetchJson(
    `https://1.pool.livechesscloud.com/get/${tournamentId}/round-${round}/index.json`
  );
}

async function getGame(
  tournamentId: string,
  round: number,
  game: number
): Promise<Game> {
  return await fetchJson(
    `https://1.pool.livechesscloud.com/get/${tournamentId}/round-${round}/game-${game}.json`
  );
}

function getPlayerName(player: Player): string {
  let name = '';
  if (player.fname) name += player.fname;
  if (player.mname) name += ` ${player.mname}`;
  if (player.lname) name += ` ${player.lname}`;
  return name;
}

export default async function fetchLcc(source: Source): Promise<string> {
  const match = source.url.match(/^lcc:([0-9a-z\-]+)\/([0-9]+)$/);
  if (!match) throw `Invalid lcc URL: ${source.url}`;
  const tournamentId = match[1];
  const round = parseInt(match[2]);

  const tournament: Tournament = await fetchJson(
    `https://1.pool.livechesscloud.com/get/${tournamentId}/tournament.json`
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
    const chess = new Chess();
    chess.header('Event', tournament.name);
    chess.header('White', getPlayerName(pairing.white));
    chess.header('Black', getPlayerName(pairing.black));
    if (pairing.white.title) {
      chess.header('WhiteTitle', pairing.white.title);
    }
    if (pairing.black.title) {
      chess.header('BlackTitle', pairing.black.title);
    }
    chess.header('Result', pairing.result);
    // This field isn't necessarily in PGN format and can hold any random gibberish string as well
    // In case this does not contain the correct data, we can replace it using addReplacement command
    chess.header('TimeControl', tournament.timecontrol);
    chess.header('Round', round.toString());
    chess.header('Board', (boardIndex + 1).toString());
    for (const move of game.moves) {
      const [sat, timeStringInSecs] = move.split(' ');
      chess.move(sat);
      if (timeStringInSecs !== undefined && !timeStringInSecs.startsWith('+')) {
        const time = parseInt(timeStringInSecs);
        const hours = Math.floor(time / 3600);
        const minutes = Math.floor((time / 60) % 60);
        const seconds = time % 60;
        chess.set_comment(`[%clk ${hours}:${minutes}:${seconds}]`);
      }
    }
    pgn += chess.pgn() + '\n\n';
  }
  return pgn;
}
