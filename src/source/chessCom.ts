import { Chess } from 'chess.js';
import request from 'request';
import { userAgent } from '../config';
import { Source, fetchJson } from '../utils';

// Add missing type for chess.js
declare module 'chess.js' {
  export interface ChessInstance {
    set_comment(comment: string): void;
  }
}

const chessComHeaders = {
  'User-Agent': userAgent,
  Accept: 'application/json, text/plain, */*',
  'Accept-Language': 'en-US,en;q=0.5',
  'Accept-Encoding': 'gzip, deflate, br',
  Origin: 'https://www.chess.com',
  DNT: '1',
  Connection: 'keep-alive',
  Referer: 'https://www.chess.com/',
  'Sec-Fetch-Dest': 'empty',
  'Sec-Fetch-Mode': 'cors',
  'Sec-Fetch-Site': 'cross-site',
  'Content-Length': '0',
};
// NOTE: these types don't contain all the fields, just the ones we care about.
interface Round {
  id: number;
  slug: string;
}
interface Room {
  id: number;
  timeControl: string;
}
interface Player {
  name: string;
  title: string;
  fideId: number;
}
interface Game {
  roundId: number;
  slug: string;
  blackElo: number;
  whiteElo: number;
  blackTitle: string;
  whiteTitle: string;
  white: Player;
  black: Player;
  result: string;
  board: number;
}

interface Move {
  ply: number;
  cbn: string;
  clock: number;
}
// https://nxt.chessbomb.com/events/api/room/<event_id>
interface RoomInfo {
  room: Room;
  name: string;
  rounds: Round[];
  games: Game[];
}
// https://nxt.chessbomb.com/events/api/game/<event_id>/<round_slug>/<round_slug>/<game_slug>
interface GameInfo {
  game: Game;
  room: Room;
  moves: Move[];
}

async function getGamePgn(
  eventId: string,
  room: RoomInfo,
  roundSlug: string,
  gameSlug: string
): Promise<string> {
  // XXX: We are trying to disguise ourselves as a browser here.
  const gameInfo: GameInfo = await fetchJson({
    uri: `https://nxt.chessbomb.com/events/api/game/${eventId}/${roundSlug}/${gameSlug}`,
    method: 'POST',
    headers: chessComHeaders,
    gzip: true,
  });
  const game = new Chess();
  for (const move of gameInfo.moves) {
    // Chess.com mentions both long algebraic notation and algebraic notation.separated by a underscore '_'
    // We only need either one of it
    const [_, san] = move.cbn.split('_');
    game.move(san);
    const hours = Math.floor(move.clock / (3600 * 1000));
    const minutes = Math.floor((move.clock / (60 * 1000)) % 60);
    const seconds = Math.floor((move.clock / 1000) % 60);
    game.set_comment(`[%clk ${hours}:${minutes}:${seconds}]`);
  }
  game.header('Event', room.name);
  game.header('White', gameInfo.game.white.name);
  game.header('Black', gameInfo.game.black.name);
  game.header('WhiteElo', gameInfo.game.whiteElo.toString());
  game.header('WhiteTitle', gameInfo.game.whiteTitle);
  game.header('WhiteFideId', gameInfo.game.white.fideId.toString());
  game.header('BlackElo', gameInfo.game.blackElo.toString());
  game.header('BlackTitle', gameInfo.game.blackTitle);
  game.header('BlackFideId', gameInfo.game.black.fideId.toString());
  game.header('TimeControl', room.room.timeControl);
  game.header('Round', roundSlug);
  game.header('Result', gameInfo.game.result);
  game.header('Board', gameInfo.game.board.toString());
  return game.pgn();
}

export default async function fetchChessCom(source: Source): Promise<string> {
  const match = source.url.match(
    /^chesscom:([0-9A-Za-z\-]+)\/([0-9A-Za-z\-]+)$/
  );
  if (!match) throw `Invalid chesscom URL: ${source.url}`;
  // The URL is of form `chesscom:<event_id>/<round_slug>`
  const [_, eventId, roundSlug] = match;

  // XXX: We are trying to disguise ourselves as a browser here.
  // TODO: It would make sense to cache this since this data is very unlikely to change.

  const eventInfo: RoomInfo = await fetchJson({
    uri: `https://nxt.chessbomb.com/events/api/room/${eventId}`,
    method: 'POST',
    headers: chessComHeaders,
    gzip: true,
  });
  const round = eventInfo.rounds.find((r: Round) => r.slug === roundSlug);
  if (round === undefined) {
    throw `Round ${roundSlug} not found in event ${eventId}`;
  }
  let pgn = '';
  for (const game of eventInfo.games) {
    if (game.roundId === round.id) {
      const gamePgn = await getGamePgn(
        eventId,
        eventInfo,
        roundSlug,
        game.slug
      );
      pgn += gamePgn + '\n\n';
    }
  }
  return pgn;
}
