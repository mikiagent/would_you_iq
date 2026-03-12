export const K = 16;

export function eloUpdate(winnerElo: number, loserElo: number): { winner: number; loser: number } {
  const expected = 1 / (1 + Math.pow(10, (loserElo - winnerElo) / 400));
  return {
    winner: Math.round(winnerElo + K * (1 - expected)),
    loser: Math.round(loserElo - K * (1 - expected)),
  };
}
