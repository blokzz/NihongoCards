export function levelForXp(xp: number): number {
  return Math.floor(0.1 * Math.sqrt(Math.max(0, xp)));
}

export const XP_PER_REVIEW = { correct: 10, again: 2 } as const;
