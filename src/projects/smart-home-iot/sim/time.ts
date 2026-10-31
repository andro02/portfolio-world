// Days in the visitor's own time zone, so the simulated morning is their
// morning.

export const SECOND = 1000;
export const MINUTE = 60 * SECOND;
export const HOUR = 60 * MINUTE;
export const DAY = 24 * HOUR;

// midnight (local time) of the day that contains this moment
export function startOfDay(ms: number): number {
  const date = new Date(ms);
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

// midnight of the next day (not always 24 h later: daylight saving time)
export function startOfNextDay(dayStart: number): number {
  const date = new Date(dayStart);
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1).getTime();
}

// "2026-10-31", the seed of that day's scenario
export function dayKey(dayStart: number): string {
  const date = new Date(dayStart);
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

export function formatClock(ms: number, withSeconds = true): string {
  const date = new Date(ms);
  const parts = [date.getHours(), date.getMinutes(), ...(withSeconds ? [date.getSeconds()] : [])];
  return parts.map((part) => String(part).padStart(2, '0')).join(':');
}

// hours since midnight, with a fraction (e.g. 18.5 at 18:30)
export function hourOfDay(ms: number): number {
  const date = new Date(ms);
  return date.getHours() + date.getMinutes() / 60 + date.getSeconds() / 3600;
}

// 0 on January 1st, about 1 at the end of the year
export function yearFraction(ms: number): number {
  const date = new Date(ms);
  const start = new Date(date.getFullYear(), 0, 1).getTime();
  return (ms - start) / (365.25 * DAY);
}
