export function computeNextFinanceCollectionsSchedule(base: Date) {
  const next = new Date(base);
  next.setUTCSeconds(0, 0);
  const minutes = next.getUTCMinutes();
  if (minutes === 0 || minutes === 30) return next;
  if (minutes < 30) {
    next.setUTCMinutes(30, 0, 0);
    return next;
  }
  next.setUTCHours(next.getUTCHours() + 1, 0, 0, 0);
  return next;
}
