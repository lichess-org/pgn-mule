import { describe, expect, test } from '@jest/globals';
import { analyseGamePgn, GameInfo } from './chessCom.js';
import fs from 'fs';

describe('chesscom module', () => {
  test('carlsen game produce correct PGN', () => {
    const gameInfo: GameInfo = JSON.parse(
      fs.readFileSync('./data/cc-carlsen.json', 'utf-8'),
    );
    expect(analyseGamePgn('WC', 'x+y', 'round-slug', gameInfo).pgn)
      .toEqual(`[Event "WC"]
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

1. e4 { [%clk 0:15:17] } e5 { [%clk 0:15:18] } 2. Nf3 { [%clk 0:15:25] } Nc6 { [%clk 0:15:26] } 3. Bb5 { [%clk 0:15:33] } a6 { [%clk 0:15:20] } 4. Ba4 { [%clk 0:15:41] } Bc5 { [%clk 0:15:21] } 5. Nc3 { [%clk 0:13:50] } d6 { [%clk 0:14:28] } 6. d4 { [%clk 0:13:46] } exd4 { [%clk 0:14:36] } 7. Nxd4 { [%clk 0:13:49] } Nge7 { [%clk 0:14:23] } 8. Be3 { [%clk 0:13:39] } b5 { [%clk 0:13:57] } 9. Bb3 { [%clk 0:12:7] } Bxd4 { [%clk 0:11:10] } 10. Bxd4 { [%clk 0:12:15] } Nxd4 { [%clk 0:11:19] } 11. Qxd4 { [%clk 0:12:24] } O-O { [%clk 0:11:23] } 12. Qd2 { [%clk 0:11:53] } Bb7 { [%clk 0:10:32] } 13. O-O { [%clk 0:11:47] } c5 { [%clk 0:8:26] } 14. Bd5 { [%clk 0:11:54] } Nxd5 { [%clk 0:8:26] } 15. Nxd5 { [%clk 0:12:2] } Re8 { [%clk 0:8:25] } 16. f3 { [%clk 0:12:2] } Bxd5 { [%clk 0:8:1] } 17. Qxd5 { [%clk 0:12:9] } Qb6 { [%clk 0:6:44] } 18. Rad1 { [%clk 0:10:44] } Rad8 { [%clk 0:6:52] } 19. Rfe1 { [%clk 0:9:8] } h6 { [%clk 0:5:45] } 20. Kf1 { [%clk 0:8:57] } Re5 { [%clk 0:5:28] } 21. Qd2 { [%clk 0:8:51] } d5 { [%clk 0:3:10] } 22. exd5 { [%clk 0:7:41] } Rexd5 { [%clk 0:2:19] } 23. Qxd5 { [%clk 0:7:46] } Rxd5 { [%clk 0:2:28] } 24. Rxd5 { [%clk 0:7:55] } Qf6 { [%clk 0:1:55] } 25. c3 { [%clk 0:7:30] } Qf4 { [%clk 0:1:53] } 26. Kg1 { [%clk 0:6:23] } Qc4 { [%clk 0:1:55] } 27. Rd8+ { [%clk 0:6:30] } Kh7 { [%clk 0:2:4] } 28. a3 { [%clk 0:6:35] } b4 { [%clk 0:1:17] } 29. axb4 { [%clk 0:4:27] } cxb4 { [%clk 0:1:22] } 30. cxb4 { [%clk 0:4:16] } Qxb4 { [%clk 0:1:23] } 31. Rdd1 { [%clk 0:4:25] } Qxb2 { [%clk 0:1:28] } 32. Ra1 { [%clk 0:4:21] } Qc3 { [%clk 0:1:20] } 33. Kh1 { [%clk 0:4:27] } h5 { [%clk 0:1:5] } 34. Rg1 { [%clk 0:4:32] } a5 { [%clk 0:0:55] } 35. Ra4 { [%clk 0:4:38] } g6 { [%clk 0:0:32] } 36. Rga1 { [%clk 0:4:45] } Kg7 { [%clk 0:0:41] } 37. Rxa5 { [%clk 0:4:53] } Qd4 { [%clk 0:0:50] } 38. Ra7 { [%clk 0:4:58] } Qe5 { [%clk 0:0:57] } 39. h3 { [%clk 0:4:48] } Qd4 { [%clk 0:1:3] } 40. R7a4 { [%clk 0:4:53] } Qe5 { [%clk 0:1:9] } 41. Rd1 { [%clk 0:4:58] } Qe2 { [%clk 0:0:27] } 42. Rad4 { [%clk 0:4:54] } Qe5 { [%clk 0:0:32] } 43. Rd7 { [%clk 0:5:2] } Qe2 { [%clk 0:0:38] } 44. R1d5 { [%clk 0:4:40] } Qe6 { [%clk 0:0:40] } 45. Kh2 { [%clk 0:4:47] } Qe3 { [%clk 0:0:45] } 46. Rd1 { [%clk 0:4:29] } Qe5+ { [%clk 0:0:53] } 47. Kg1 { [%clk 0:4:35] } Qe2 { [%clk 0:0:59] } 48. Kh1 { [%clk 0:4:44] } Qe5 { [%clk 0:1:2] } 49. Rf1 { [%clk 0:4:33] } Qe2 { [%clk 0:1:8] } 50. Rdd1 { [%clk 0:4:41] } Qc2 { [%clk 0:1:4] } 51. Rde1 { [%clk 0:4:47] } Qd3 { [%clk 0:1:5] } 52. f4 { [%clk 0:4:53] } Qf5 { [%clk 0:1:13] } 53. Rf3 { [%clk 0:4:56] } Kg8 { [%clk 0:1:16] } 54. Re5 { [%clk 0:5:0] } Qf6 { [%clk 0:1:20] } 55. Rg5 { [%clk 0:5:2] } Kg7 { [%clk 0:1:13] } 56. Kh2 { [%clk 0:5:10] } Qd6 { [%clk 0:1:19] } 57. Re5 { [%clk 0:4:56] } Qf6 { [%clk 0:1:16] } 58. Rd5 { [%clk 0:4:52] } Qe6 { [%clk 0:1:19] } 59. Rd1 { [%clk 0:3:24] } Qf5 { [%clk 0:1:26] } 60. Re1 { [%clk 0:3:25] } Kg8 { [%clk 0:1:26] } 61. Re5 { [%clk 0:2:36] } Qf6 { [%clk 0:1:34] } 62. Rd5 { [%clk 0:2:45] } Qe6 { [%clk 0:1:29] } 63. Rfd3 { [%clk 0:2:53] } Qf6 { [%clk 0:1:19] } 64. f5 { [%clk 0:2:58] } g5 { [%clk 0:1:4] } 65. Rd8+ { [%clk 0:2:32] } Kg7 { [%clk 0:1:12] } 66. R3d5 { [%clk 0:2:40] } Qc3 { [%clk 0:0:52] } 67. R8d6 { [%clk 0:2:13] } Qe3 { [%clk 0:0:50] } 68. f6+ { [%clk 0:2:20] } Kg6 { [%clk 0:0:57] } 69. Rd1 { [%clk 0:2:29] } Qe5+ { [%clk 0:1:1] } 70. Kh1 { [%clk 0:2:37] } Qf4 { [%clk 0:0:57] } 71. R6d4 { [%clk 0:2:40] } Qe5 { [%clk 0:1:1] } 72. Rd8 { [%clk 0:2:28] } Kxf6 { [%clk 0:0:42] } 73. Rg8 { [%clk 0:2:26] } Qf4 { [%clk 0:0:32] } 74. Kg1 { [%clk 0:0:59] } Qe3+ { [%clk 0:0:41] } 75. Kh1 { [%clk 0:1:7] } Qf4 { [%clk 0:0:50] } 76. Kg1 { [%clk 0:0:44] } Qe3+ { [%clk 0:0:50] } 1/2-1/2
`);
  });

  test('chess960 game produce correct PGN', () => {
    const gameInfo: GameInfo = JSON.parse(
      fs.readFileSync('./data/cc-960.json', 'utf-8'),
    );
    expect(analyseGamePgn('960 event', 'z+a', 'round-slug2', gameInfo).pgn)
      .toEqual(`[Event "960 event"]
[White "Bastians, Felix"]
[Black "Evaggelos Kostopoulos"]
[FEN "rnkqnbbr/pppppppp/8/8/8/8/PPPPPPPP/RNKQNBBR w KQkq - 0 1"]
[WhiteFideId "24642207"]
[BlackElo "2100"]
[BlackFideId "4208641"]
[TimeControl "z+a"]
[Round "round-slug2"]
[Result "*"]
[Board "8"]

1. e4 { [%clk 0:23:27] } e5 { [%clk 0:24:53] } 2. Nf3 { [%clk 0:15:41] } Nc6 { [%clk 0:23:32] } 3. Bb5 { [%clk 0:15:18] } f5 { [%clk 0:19:10] } 4. Nc3 { [%clk 0:11:56] } fxe4 { [%clk 0:18:37] } 5. Nxe4 { [%clk 0:9:42] } d5 { [%clk 0:14:22] } 6. Bxc6 { [%clk 0:1:27] } bxc6 { [%clk 0:14:43] } 7. Qe2 { [%clk 0:1:15] } a5 { [%clk 0:14:27] } 8. Nc3 { [%clk 0:0:42] } e4 { [%clk 0:11:24] } 9. Ne5 { [%clk 0:1:10] } Qd6 { [%clk 0:6:48] } 10. f4 { [%clk 0:1:0] } exf3 { [%clk 0:5:29] } 11. Nxf3 { [%clk 0:1:14] } Nf6 { [%clk 0:4:55] } 12. Bd4 { [%clk 0:1:40] } c5 { [%clk 0:3:22] } 13. Be5 { [%clk 0:2:8] } Qc6 { [%clk 0:3:17] } 14. O-O { [%clk 0:1:43] } d4 { [%clk 0:1:16] } 15. Nb5 { [%clk 0:1:3] } Bd6 { [%clk 0:1:6] } 16. Rae1 { [%clk 0:1:23] } Bd5 { [%clk 0:1:18] } 17. c4 { [%clk 0:1:4] } dxc3 { [%clk 0:0:58] } 18. Nxc3 { [%clk 0:1:23] } O-O { [%clk 0:1:21] } 19. Nxd5 { [%clk 0:1:26] } Qxd5 { [%clk 0:1:27] } 20. Bxd6 { [%clk 0:0:59] } cxd6 { [%clk 0:1:21] } 21. Qe6+ { [%clk 0:1:28] } Qxe6 { [%clk 0:1:36] } 22. Rxe6 { [%clk 0:1:56] } Rad8 { [%clk 0:1:35] } 23. d4 { [%clk 0:1:10] } Rfe8 { [%clk 0:1:56] } 24. Rxe8+ { [%clk 0:1:24] } Rxe8 { [%clk 0:2:18] } 25. dxc5 { [%clk 0:1:51] } dxc5 { [%clk 0:2:47] } 26. Re1 { [%clk 0:2:4] } Rxe1+ { [%clk 0:2:40] } 27. Nxe1 { [%clk 0:2:33] } Kf7 { [%clk 0:3:10] } 28. Nd3 { [%clk 0:1:58] } Ne4 { [%clk 0:3:38] } 29. Ne5+ { [%clk 0:2:25] } Ke6 { [%clk 0:4:2] } 30. Nc4 { [%clk 0:2:53] } a4 { [%clk 0:4:12] } 31. Kf1 { [%clk 0:3:0] } Kd5 { [%clk 0:2:3] } 32. Nb6+ { [%clk 0:3:29] } Kd4 { [%clk 0:2:32] } 33. Nxa4 { [%clk 0:3:57] } Kd3 { [%clk 0:3:0] } 34. Ke1 { [%clk 0:4:3] } Kc2 { [%clk 0:3:30] } 35. Ke2 { [%clk 0:4:12] } c4 { [%clk 0:3:41] } 36. Ke3 { [%clk 0:3:23] } Nd2 { [%clk 0:2:4] } 37. Kd4 { [%clk 0:3:43] } h6 { [%clk 0:0:57] } 38. h4 { [%clk 0:3:32] } h5 { [%clk 0:1:21] } 39. Kd5 { [%clk 0:0:36] } Kb1 { [%clk 0:0:58] } 40. a3 { [%clk 0:0:40] } Kc2 { [%clk 0:1:21] } 41. Nb6 { [%clk 0:0:38] } Kb3 { [%clk 0:1:24] } 42. a4 { [%clk 0:0:46] } Nf1 { [%clk 0:0:35] } 43. Nxc4 { [%clk 0:1:12] } Kxa4 { [%clk 0:1:4] } 44. Kc5 { [%clk 0:0:52] } Kb3 { [%clk 0:1:28] } 45. Kd4 { [%clk 0:0:40] } Ng3 { [%clk 0:1:53] } 46. Nd6 { [%clk 0:0:40] } *
`);
  });
});
