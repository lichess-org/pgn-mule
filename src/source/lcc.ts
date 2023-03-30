import { Chess } from 'chess.js';
import request from 'request';
import { Source } from '../utils';

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
  return new Promise((resolve, reject) => {
    request(
      `https://1.pool.livechesscloud.com/get/${tournamentId}/round-${round}/index.json`,
      async (err, res, body) => {
        if (err) reject(err);
        else resolve(JSON.parse(body));
      }
    );
  });
}

async function getGame(
  tournamentId: string,
  round: number,
  game: number
): Promise<Game> {
  return new Promise((resolve, reject) => {
    request(
      `https://1.pool.livechesscloud.com/get/${tournamentId}/round-${round}/game-${game}.json`,
      async (err, res, body) => {
        if (err) reject(err);
        else resolve(JSON.parse(body));
      }
    );
  });
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
  console.log(tournamentId);
  return new Promise((resolve, reject) => {
    request(
      `https://1.pool.livechesscloud.com/get/${tournamentId}/tournament.json`,
      async (err, res, body) => {
        if (err) reject(err);
        else {
          const tournament: Tournament = JSON.parse(body);
          const roundInfo = await getRound(tournamentId, round);
          let games: { [key: number]: Game } = {};
          // TODO: fetch games  asynchronously
          for (
            let currGame = 1;
            currGame <= tournament.rounds[round - 1].count;
            currGame++
          ) {
            games[currGame] = await getGame(tournamentId, round, currGame);
          }
          let pgn = '';
          for (let [board, game] of Object.entries(games)) {
            let chess = new Chess();
            chess.header('Event', tournament.name);
            chess.header(
              'White',
              getPlayerName(roundInfo.pairings[parseInt(board) - 1].white)
            );
            if (
              typeof roundInfo.pairings[parseInt(board) - 1].white.title ===
              'string'
            ) {
              chess.header(
                'WhiteTitle',
                roundInfo.pairings[parseInt(board) - 1].white.title as string
              );
            }
            if (
              typeof roundInfo.pairings[parseInt(board) - 1].black.title ===
              'string'
            ) {
              chess.header(
                'BlackTitle',
                roundInfo.pairings[parseInt(board) - 1].black.title as string
              );
            }
            chess.header(
              'Black',
              getPlayerName(roundInfo.pairings[parseInt(board) - 1].black)
            );
            chess.header(
              'Result',
              roundInfo.pairings[parseInt(board) - 1].result
            );
            // It seems like they specify the initlal time in minutes, so we have to convert it to seconds.
            // chess.header('TimeControl', tournament.timecontrol);
            let timeControlString = tournament.timecontrol
              .split(':')
              .map((t) => {
                const [initialTime, increment] = t.split('+');
                return `${parseInt(initialTime) * 60}+${increment}`;
              })
              .join(':');
            chess.header('TimeControl', timeControlString);
            chess.header('Round', round.toString());
            chess.header('Board', board);
            for (let move of game.moves) {
              const [sat, timeStringInSecs] = move.split(' ');
              const time = parseInt(timeStringInSecs);
              const hours = Math.floor(time / 3600);
              const minutes = Math.floor((time / 60) % 60);
              const seconds = time % 60;
              chess.move(sat);
              chess.set_comment(`[%clk ${hours}:${minutes}:${seconds}]`);
            }
            pgn += chess.pgn();
            pgn += '\n\n';
          }
          resolve(pgn);
        }
      }
    );
  });
}
