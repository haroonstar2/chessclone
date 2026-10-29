import { calculateElo } from './elo.js';

it.each([
  [1200, 1200, 1, 1216, 1184],
  [1200, 1200, 0, 1184, 1216],
  [1200, 1200, 0.5, 1200, 1200],
  [1600, 1200, 0, 1571, 1229],
  [1600, 1200, 0.5, 1587, 1213],
])(
  'calculates Elo for %i vs %i with score %s',
  (white, black, score, expectedWhite, expectedBlack) => {
    expect(calculateElo(white, black, score)).toEqual({
      white: expectedWhite,
      black: expectedBlack,
    });
  },
);
