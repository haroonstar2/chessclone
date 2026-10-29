const K_FACTOR = 32;

export function calculateElo(
  whiteRating: number,
  blackRating: number,
  whiteScore: number,
) {
  const expectedWhite = 1 / (1 + 10 ** ((blackRating - whiteRating) / 400));
  const change = Math.round(K_FACTOR * (whiteScore - expectedWhite));

  // Apply opposite changes so rounding preserves the total rating.
  return {
    white: whiteRating + change,
    black: blackRating - change,
  };
}
