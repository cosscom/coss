/** Wednesday of the current week: the seed's busiest day, so a one-day view is never an empty grid. */
export function busyWeekday(): Date {
  const d = new Date();
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7) + 2);
  d.setHours(0, 0, 0, 0);
  return d;
}
