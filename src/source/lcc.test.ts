import { describe, expect, test } from '@jest/globals';
import { Pairing, Game, Tournament, gameToPgn } from './lcc.js';
import fs from 'fs';

describe('lcc module', () => {
  test('andre game produce correct PGN', () => {
    const game = {
      live: false,
      serialNr: '5594',
      firstMove: 1693062053771,
      chess960: 518,
      result: 'BLACKWIN',
      comment: null,
      clock: null,
      moves: [
        'e4 5436+23',
        'e5 5450+11',
        'Nc3 5444+22',
        'Nf6 5472+8',
        'd4 5463+11',
        'exd4 5491+10',
        'Qxd4 5488+5',
        'Nc6 5519+3',
        'Qd3 5516+3',
        'Bc5 5222+326',
        'Bf4 5497+48',
        'O-O 5068+183',
        'Qd2 5182+346',
        'Bb4 4904+194',
        'f3 5193+18',
        'd5 4884+50',
        'O-O-O 5155+69',
        'd4 4490+424',
        'Qf2 5101+83',
        'Nh5 3963+564',
        'Nd5 5115+9',
        'Nxf4 3948+47',
        'Nxf4 5126+16',
        'Qg5 3935+54',
        'g3 5143+20',
        'Bd6 3425+523',
        'Nge2 4669+504',
        'f5 2762+693',
        'h4 4493+206',
        'Qh6 2743+50',
        'exf5 4494+29',
        'Bxf5 2723+50',
        'Kb1 4508+15',
        'Bc5 1861+892',
        'Nd3 3536+1003',
        'Bxd3 1886+5',
        'cxd3 3555+10',
        'Rae8 1812+104',
        'Nf4 3412+173',
        'Bd6 1684+393',
        'Nh3 3380',
        'Re3 1082+634',
        'f4 3157+78',
        'Qg6 935+177',
        'Ng5 3021+165',
        'Nb4 958+7',
        'h5 2793+257',
        'Qxg5 890+100',
        'Qxe3 2795+28',
        'Qd5 915+5',
        'Qe4 2757+68',
        'Qxa2+ 939+6',
        'Kc1 2783+3',
        'Qa1+ 950+20',
        'Kd2 2809+4',
        'Qxb2+ 978+3',
        'Ke1 2830+9',
        'Na2 473+535',
        'Be2 2449+410',
        'Nc3 342+163',
        'Qe6+ 2467+11',
        'Kh8 251+222',
        'h6 2481',
        'Qxe2+ 117+80',
        'Qxe2 2504+6',
        'Nxe2 146+2',
        'hxg7+ 2530+4',
        'Kxg7 173+3',
        'Kxe2 2551+9',
        'Re8+ 146+58',
        'Kf3 2541+145',
        'Re3+ 168+365',
        'Kg4 2566',
        'Kg6 116',
        'Rh3 2508',
        'h6 108',
        'f5+ 2396',
        'Kg7 112',
        'Rdh1 4205',
        'Rxd3 1910+4',
        'Rxh6 4193+9',
        'Rxg3+ 1928+12',
        'Kh5 4217+5',
        'd3 1692+306',
        'Rg6+ 4168+40',
        'Rxg6 1701+23',
        'fxg6 4194+6',
        'd2 1720+150',
        'Kg5 4218',
        'Be7+ 1633+22',
        'Kf5 4241+2',
        'Bh4 1647+3',
      ],
    };
    const pairing = {
      white: {
        fname: 'Gunnar',
        mname: null,
        lname: 'Andersen',
        title: null,
        federation: null,
        gender: null,
        fideid: 30920795,
      },
      black: {
        fname: 'Andre',
        mname: 'Miguel Vale Ventura',
        lname: 'Sousa',
        title: null,
        federation: null,
        gender: null,
        fideid: 1917617,
      },
      result: '0-1',
      live: false,
    };
    const tournament = {
      id: 'Maia Open',
      name: 'Maia Chess Open 2023 (25/08 - 02/09)',
      location: 'TECMAIA, Rua Eng. Frederico Ulrich 2650, 4470-605 MAIA',
      country: 'PT',
      website: null,
      rules: 'STANDARD',
      chess960: 'STANDARD',
      timecontrol:
        '90 min/40 mov. + 30 min/rest. + 30 sec. incr. p/ mov. desde mov. 1',
      rounds: [
        { count: 16, live: 0 },
        { count: 16, live: 0 },
        { count: 17, live: 0 },
        { count: 0, live: 0 },
        { count: 0, live: 0 },
        { count: 0, live: 0 },
        { count: 0, live: 0 },
        { count: 0, live: 0 },
        { count: 0, live: 0 },
      ],
      eboards: [
        '15348',
        '15349',
        '15350',
        '15347',
        '3000145426',
        '3000145448',
        '5598',
        '5594',
        '5582',
        '9444',
        '5586',
        '5593',
        '4359',
        '48204',
        '48098',
        '48096',
        '40471',
      ],
    };
    expect(gameToPgn(pairing, 10, tournament as Tournament, 2, game))
      .toEqual(`[Event "Maia Chess Open 2023 (25/08 - 02/09)"]
[White "Gunnar Andersen"]
[Black "Andre Miguel Vale Ventura Sousa"]
[WhiteFideId "30920795"]
[BlackFideId "1917617"]
[Result "0-1"]
[TimeControl "90 min/40 mov. + 30 min/rest. + 30 sec. incr. p/ mov. desde mov. 1"]
[Round "2"]
[Board "11"]

1. e4 { [%clk 1:30:36] } e5 { [%clk 1:30:50] } 2. Nc3 { [%clk 1:30:44] } Nf6 { [%clk 1:31:12] } 3. d4 { [%clk 1:31:3] } exd4 { [%clk 1:31:31] } 4. Qxd4 { [%clk 1:31:28] } Nc6 { [%clk 1:31:59] } 5. Qd3 { [%clk 1:31:56] } Bc5 { [%clk 1:27:2] } 6. Bf4 { [%clk 1:31:37] } O-O { [%clk 1:24:28] } 7. Qd2 { [%clk 1:26:22] } Bb4 { [%clk 1:21:44] } 8. f3 { [%clk 1:26:33] } d5 { [%clk 1:21:24] } 9. O-O-O { [%clk 1:25:55] } d4 { [%clk 1:14:50] } 10. Qf2 { [%clk 1:25:1] } Nh5 { [%clk 1:6:3] } 11. Nd5 { [%clk 1:25:15] } Nxf4 { [%clk 1:5:48] } 12. Nxf4 { [%clk 1:25:26] } Qg5 { [%clk 1:5:35] } 13. g3 { [%clk 1:25:43] } Bd6 { [%clk 0:57:5] } 14. Nge2 { [%clk 1:17:49] } f5 { [%clk 0:46:2] } 15. h4 { [%clk 1:14:53] } Qh6 { [%clk 0:45:43] } 16. exf5 { [%clk 1:14:54] } Bxf5 { [%clk 0:45:23] } 17. Kb1 { [%clk 1:15:8] } Bc5 { [%clk 0:31:1] } 18. Nd3 { [%clk 0:58:56] } Bxd3 { [%clk 0:31:26] } 19. cxd3 { [%clk 0:59:15] } Rae8 { [%clk 0:30:12] } 20. Nf4 { [%clk 0:56:52] } Bd6 { [%clk 0:28:4] } 21. Nh3 { [%clk 0:56:20] } Re3 { [%clk 0:18:2] } 22. f4 { [%clk 0:52:37] } Qg6 { [%clk 0:15:35] } 23. Ng5 { [%clk 0:50:21] } Nb4 { [%clk 0:15:58] } 24. h5 { [%clk 0:46:33] } Qxg5 { [%clk 0:14:50] } 25. Qxe3 { [%clk 0:46:35] } Qd5 { [%clk 0:15:15] } 26. Qe4 { [%clk 0:45:57] } Qxa2+ { [%clk 0:15:39] } 27. Kc1 { [%clk 0:46:23] } Qa1+ { [%clk 0:15:50] } 28. Kd2 { [%clk 0:46:49] } Qxb2+ { [%clk 0:16:18] } 29. Ke1 { [%clk 0:47:10] } Na2 { [%clk 0:7:53] } 30. Be2 { [%clk 0:40:49] } Nc3 { [%clk 0:5:42] } 31. Qe6+ { [%clk 0:41:7] } Kh8 { [%clk 0:4:11] } 32. h6 { [%clk 0:41:21] } Qxe2+ { [%clk 0:1:57] } 33. Qxe2 { [%clk 0:41:44] } Nxe2 { [%clk 0:2:26] } 34. hxg7+ { [%clk 0:42:10] } Kxg7 { [%clk 0:2:53] } 35. Kxe2 { [%clk 0:42:31] } Re8+ { [%clk 0:2:26] } 36. Kf3 { [%clk 0:42:21] } Re3+ { [%clk 0:2:48] } 37. Kg4 { [%clk 0:42:46] } Kg6 { [%clk 0:1:56] } 38. Rh3 { [%clk 0:41:48] } h6 { [%clk 0:1:48] } 39. f5+ { [%clk 0:39:56] } Kg7 { [%clk 0:1:52] } 40. Rdh1 { [%clk 1:10:5] } Rxd3 { [%clk 0:31:50] } 41. Rxh6 { [%clk 1:9:53] } Rxg3+ { [%clk 0:32:8] } 42. Kh5 { [%clk 1:10:17] } d3 { [%clk 0:28:12] } 43. Rg6+ { [%clk 1:9:28] } Rxg6 { [%clk 0:28:21] } 44. fxg6 { [%clk 1:9:54] } d2 { [%clk 0:28:40] } 45. Kg5 { [%clk 1:10:18] } Be7+ { [%clk 0:27:13] } 46. Kf5 { [%clk 1:10:41] } Bh4 { [%clk 0:27:27] } 0-1
`);
  });

  test('960 produce correct headers', () => {
    const data = JSON.parse(fs.readFileSync('./data/lcc-960.json', 'utf-8'));
    expect(
      gameToPgn(
        data.pairing,
        data.boardIndex,
        data.tournament as Tournament,
        data.round,
        data.game,
      ),
    ).toEqual(`[Event "5. Internationales Schach960-Festival 2024"]
[White "Svitlana Pentsak"]
[Black "Dmitrij Kollars"]
[FEN "nrknbbqr/pppppppp/8/8/8/8/PPPPPPPP/NRKNBBQR w KQkq - 0 1"]
[WhiteFideId "12345678"]
[BlackFideId "87654321"]
[Result "0-1"]
[Round "2"]
[Board "2"]

1. e4 { [%clk 0:25:34] } e5 { [%clk 0:25:38] } 2. Bc4 { [%clk 0:25:35] } Nb6 { [%clk 0:25:52] } 3. Bb3 { [%clk 0:25:53] } Ne6 { [%clk 0:25:27] } 4. Ne3 { [%clk 0:25:3] } Nd4 { [%clk 0:22:56] } 5. Qf1 { [%clk 0:24:46] } O-O-O { [%clk 0:23:13] } 6. O-O-O { [%clk 0:23:10] } h5 { [%clk 0:23:13] } 7. c3 { [%clk 0:22:18] } Nxb3+ { [%clk 0:22:49] } 8. Nxb3 { [%clk 0:22:43] } Qh7 { [%clk 0:22:3] } 9. f3 { [%clk 0:22:6] } d5 { [%clk 0:22:17] } 10. exd5 { [%clk 0:20:37] } Nxd5 { [%clk 0:22:40] } 11. Nxd5 { [%clk 0:20:43] } Rxd5 { [%clk 0:23:7] } 12. d4 { [%clk 0:20:11] } exd4 { [%clk 0:21:44] } 13. Qc4 { [%clk 0:18:39] } Qh6+ { [%clk 0:20:42] } 14. Kb1 { [%clk 0:14:17] } Qc6 { [%clk 0:19:55] } 15. Qxc6 { [%clk 0:13:39] } Bxc6 { [%clk 0:20:22] } 16. Rxd4 { [%clk 0:13:37] } Be7 { [%clk 0:19:22] } 17. Bg3 { [%clk 0:12:48] } h4 { [%clk 0:19:30] } 18. Rxd5 { [%clk 0:11:26] } Bxd5 { [%clk 0:19:57] } 19. Be5 { [%clk 0:11:32] } h3 { [%clk 0:19:43] } 20. gxh3 { [%clk 0:9:44] } Bxf3 { [%clk 0:14:54] } 21. Rg1 { [%clk 0:9:46] } Be4+ { [%clk 0:11:55] } 22. Kc1 { [%clk 0:9:44] } Rxh3 { [%clk 0:10:44] } 23. Rxg7 { [%clk 0:9:25] } Bg6 { [%clk 0:11:10] } 24. Rg8+ { [%clk 0:9:21] } Kd7 { [%clk 0:11:37] } 25. Bg3 { [%clk 0:7:4] } Bh4 { [%clk 0:10:13] } 26. Rb8 { [%clk 0:4:24] } Bxg3 { [%clk 0:10:0] } 27. hxg3 { [%clk 0:4:52] } b6 { [%clk 0:10:27] } 28. Rb7 { [%clk 0:4:42] } a5 { [%clk 0:10:21] } 29. c4 { [%clk 0:3:48] } Kc8 { [%clk 0:10:24] } 30. Ra7 { [%clk 0:4:7] } Kb8 { [%clk 0:10:49] } 0-1
`);
  });
});
