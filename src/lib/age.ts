export type AgeBand = 'little' | 'middle' | 'teen';

/** Whole years between a birth month (YYYY-MM-01) and today. Matches public.age_years(). */
export function ageYears(birthMonth: string | Date, today: Date = new Date()): number {
  const b = typeof birthMonth === 'string' ? new Date(birthMonth + 'T00:00:00Z') : birthMonth;
  let age = today.getUTCFullYear() - b.getUTCFullYear();
  if (today.getUTCMonth() < b.getUTCMonth()) age -= 1;
  return age;
}

export function ageBand(birthMonth: string | Date, today: Date = new Date()): AgeBand {
  const age = ageYears(birthMonth, today);
  if (age <= 8) return 'little';
  if (age <= 12) return 'middle';
  return 'teen';
}

export const bandRules: Record<AgeBand, { label: string; freeTextComments: boolean; parentApprovesFriends: boolean }> = {
  little: { label: 'Ages 5 to 8', freeTextComments: false, parentApprovesFriends: true },
  middle: { label: 'Ages 9 to 12', freeTextComments: true, parentApprovesFriends: true },
  teen: { label: 'Ages 13 to 16', freeTextComments: true, parentApprovesFriends: false },
};
