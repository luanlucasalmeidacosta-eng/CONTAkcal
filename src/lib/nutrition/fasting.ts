export function computeFastEnd(startedAt: Date, durationHours: number): Date {
  return new Date(startedAt.getTime() + durationHours * 60 * 60 * 1000);
}

export interface FastProgress {
  elapsedMs: number;
  remainingMs: number;
  pct: number;
  isDone: boolean;
}

export function computeFastProgress(startedAt: Date, durationHours: number, now: Date): FastProgress {
  const totalMs = durationHours * 60 * 60 * 1000;
  const elapsedMs = Math.max(0, now.getTime() - startedAt.getTime());
  const remainingMs = Math.max(0, totalMs - elapsedMs);
  const pct = totalMs > 0 ? Math.min(elapsedMs / totalMs, 1) : 0;

  return { elapsedMs, remainingMs, pct, isDone: remainingMs === 0 };
}

export function formatCountdown(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
}
