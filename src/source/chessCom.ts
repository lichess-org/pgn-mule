import { makePgn, PgnNodeData, Game, Node } from 'chessops/pgn.js';
import { parseUci } from 'chessops';
import request from 'request';
import { userAgent } from '../config.js';
import { Source, fetchJson, extendMainline, emptyHeaders } from '../utils.js';

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
  name: string;
  timeControl: string;
}
interface Player {
  name: string;
  title: string;
  fideId: number;
}
interface GameRes {
  roundId: number;
  slug: string;
  blackElo?: number;
  whiteElo?: number;
  blackTitle?: string;
  whiteTitle?: string;
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
interface EventInfo {
  room: Room;
  rounds: Round[];
  games: GameRes[];
}
// https://nxt.chessbomb.com/events/api/game/<event_id>/<round_slug>/<round_slug>/<game_slug>
export interface GameInfo {
  game: GameRes;
  room: Room;
  moves: Move[];
}

interface BoardWithPgn {
  board: number;
  pgn: string;
}

export function analyseGamePgn(
  event: string,
  timeControl: string,
  roundSlug: string,
  gameInfo: GameInfo,
): BoardWithPgn {
  const headers = emptyHeaders(
    `cc: Event ${event}, round ${roundSlug} game-info ${gameInfo.game}`,
  );
  headers.set('Event', event);
  headers.set('White', gameInfo.game.white.name);
  headers.set('Black', gameInfo.game.black.name);
  headers.set('WhiteElo', gameInfo.game.whiteElo);
  if (gameInfo.game.whiteTitle) {
    headers.set('WhiteTitle', gameInfo.game.whiteTitle);
  }
  headers.set('WhiteFideId', gameInfo.game.white.fideId);
  headers.set('BlackElo', gameInfo.game.blackElo);
  if (gameInfo.game.blackTitle) {
    headers.set('BlackTitle', gameInfo.game.blackTitle);
  }
  headers.set('BlackFideId', gameInfo.game.black.fideId);
  headers.set('TimeControl', timeControl);
  headers.set('Round', roundSlug);
  headers.set('Result', gameInfo.game.result);
  headers.set('Board', gameInfo.game.board);
  const chessGame: Game<PgnNodeData> = {
    headers: headers.inner,
    moves: new Node(),
  };
  const mainline = gameInfo.moves.map(move => {
    // Chess.com mentions both long algebraic notation and algebraic notation.separated by a underscore '_'
    // We only need either one of it
    const [_, san] = move.cbn.split('_');
    console.assert(
      parseUci(san) === undefined,
      `in game ${headers} SAN syntax error: ${san}`,
    );
    const hours = Math.floor(move.clock / (3600 * 1000));
    const minutes = Math.floor((move.clock / (60 * 1000)) % 60);
    const seconds = Math.floor((move.clock / 1000) % 60);
    const comments = [`[%clk ${hours}:${minutes}:${seconds}]`];
    return { comments, san };
  });
  extendMainline(chessGame, mainline);
  return {
    board: gameInfo.game.board,
    pgn: makePgn(chessGame),
  };
}

async function getGamePgn(
  eventId: string,
  event: EventInfo,
  roundSlug: string,
  gameSlug: string,
): Promise<BoardWithPgn> {
  // XXX: We are trying to disguise ourselves as a browser here.
  const gameInfo: GameInfo = await fetchJson({
    uri: `https://nxt.chessbomb.com/events/api/game/${eventId}/${roundSlug}/${gameSlug}`,
    method: 'POST',
    headers: chessComHeaders,
    gzip: true,
  });
  return analyseGamePgn(
    event.room.name,
    event.room.timeControl,
    roundSlug,
    gameInfo,
  );
}

export default async function fetchChessCom(source: Source): Promise<string> {
  const match = source.url.match(
    /^chesscom:([0-9A-Za-z\-]+)\/([0-9A-Za-z\-]+)$/,
  );
  if (!match) throw `Invalid chesscom URL: ${source.url}`;
  // The URL is of form `chesscom:<event_id>/<round_slug>`
  const [_, eventId, roundSlug] = match;

  // XXX: We are trying to disguise ourselves as a browser here.
  // TODO: It would make sense to cache this since this data is very unlikely to change.

  const eventInfo: EventInfo = await fetchJson({
    uri: `https://nxt.chessbomb.com/events/api/room/${eventId}`,
    method: 'POST',
    headers: chessComHeaders,
    gzip: true,
  });
  const round = eventInfo.rounds.find((r: Round) => r.slug === roundSlug);
  if (round === undefined) {
    throw `Round ${roundSlug} not found in event ${eventId}`;
  }
  // Fetch all games asynchronously to speed things up.
  const pgns = await Promise.all(
    eventInfo.games
      .filter(g => g.roundId === round.id)
      .map(game => getGamePgn(eventId, eventInfo, roundSlug, game.slug)),
  );
  return pgns
    .sort((a, b) => a.board - b.board)
    .map(g => g.pgn)
    .join('\n\n');
}
