import { describe, expect, test } from '@jest/globals';
import { analyseGamePgn, GameInfo } from './chessCom';
import fs from 'fs';

describe('chesscom module', () => {
  test('carlsen game produce correct PGN', () => {
    const gameInfo: GameInfo = JSON.parse(
      fs.readFileSync('./data/carlsen-cc.json', 'utf-8'),
    );
    expect(analyseGamePgn('WC', 'x+y', 'round-slug', gameInfo).pgn)
      .toBe(`[Event "WC"]
[White "Carlsen, Magnus"]
[Black "Petrov, Nikita"]
[WhiteElo "2818"]
[WhiteFideId "1503014"]
[BlackElo "2509"]
[BlackFideId "4101286"]
[TimeControl "x+y"]
[Round "round-slug"]
[Result "1/2-1/2"]
[Board "1"]

1. e4 {[%clk 0:15:17]} e5 {[%clk 0:15:18]} 2. Nf3 {[%clk 0:15:25]} Nc6 {[%clk 0:15:26]} 3. Bb5 {[%clk 0:15:33]} a6 {[%clk 0:15:20]} 4. Ba4 {[%clk 0:15:41]} Bc5 {[%clk 0:15:21]} 5. Nc3 {[%clk 0:13:50]} d6 {[%clk 0:14:28]} 6. d4 {[%clk 0:13:46]} exd4 {[%clk 0:14:36]} 7. Nxd4 {[%clk 0:13:39]} b5 {[%clk 0:13:57]} 8. Bb3 {[%clk 0:12:7]} Bxd4 {[%clk 0:11:19]} 9. Qxd4 {[%clk 0:11:53]} Bb7 {[%clk 0:10:32]} 10. O-O {[%clk 0:9:8]} h6 {[%clk 0:5:28]} 11. Qd2 {[%clk 0:8:51]} d5 {[%clk 0:3:10]} 12. exd5 {[%clk 0:2:19]} Qxd5 {[%clk 0:7:30]} 13. Qf4 {[%clk 0:6:23]} Qc4 {[%clk 0:2:4]} 14. a3 {[%clk 0:6:35]} b4 {[%clk 0:1:17]} 15. axb4 {[%clk 0:4:16]} Qxb4 {[%clk 0:1:20]} 16. Kh1 {[%clk 0:4:27]} h5 {[%clk 0:1:5]} 17. Rg1 {[%clk 0:4:32]} a5 {[%clk 0:0:55]} 18. Ra4 {[%clk 0:4:38]} g6 {[%clk 0:0:41]} 19. Rxa5 {[%clk 0:4:53]} Qd4 {[%clk 0:0:50]} 20. Ra7 {[%clk 0:4:58]} Qe5 {[%clk 0:0:57]} 21. h3 {[%clk 0:4:48]} Qd4 {[%clk 0:4:53]} 22. Qe5+ {[%clk 0:0:50]} 1/2-1/2`);
  });
});
