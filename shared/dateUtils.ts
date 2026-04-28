/**
 * Calculate the first Monday after a given number of days from a start date.
 * @param startDate The starting date
 * @param daysAfter Number of days to add before finding the next Monday
 * @returns The date of the first Monday after the calculated date
 */
export function getFirstMondayAfterDays(startDate: Date, daysAfter: number): Date {
  const targetDate = new Date(startDate);
  targetDate.setDate(targetDate.getDate() + daysAfter);

  // Find the next Monday
  const dayOfWeek = targetDate.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  const daysUntilMonday = (8 - dayOfWeek) % 7; // If it's Monday (1), daysUntilMonday = 0
  if (daysUntilMonday === 0 && dayOfWeek === 1) {
    // If it's already Monday, return it
    return targetDate;
  }
  targetDate.setDate(targetDate.getDate() + daysUntilMonday);

  return targetDate;
}

/**
 * Calculate escalation date as 45 days from sent date.
 * @param sentDate The date the proposal was sent
 * @returns The escalation date
 */
export function calculateEscalationDate(sentDate: Date): Date {
  const escalationDate = new Date(sentDate);
  escalationDate.setDate(escalationDate.getDate() + 45);
  return escalationDate;
}