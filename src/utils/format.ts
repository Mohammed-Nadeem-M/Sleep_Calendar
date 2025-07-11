export function formatDuration(hours: number): string {
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  return `${h}h ${m}m`;
}

export function durationColour(hours: number): string {
  if (!hours || hours <= 0) return 'grey';
  if (hours >= 6) return 'green';
  if (hours >= 4) return 'orange';
  return 'red';
}

export function qualityColour(q: number): string {
  if (!q || q <= 0) return 'grey';
  if (q >= 7) return 'green';
  if (q >= 4) return 'orange';
  return 'red';
}

/* ---------------------- helpers for tag IMPACT ---------------------- */
export function impactColour(n: number): string {
  if (n > 0) return 'green';
  if (n < 0) return 'red';
  return 'grey';
}

export function formatDurationDelta(hours: number): string {
  const sign = hours > 0 ? '+' : hours < 0 ? '-' : '';
  return `${sign}${formatDuration(Math.abs(hours))}`;
}
