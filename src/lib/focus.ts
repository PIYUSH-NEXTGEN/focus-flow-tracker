// Shared types & helpers for Focus Meter

export type Mode = "timer" | "stopwatch";

export type TimeUnit = "minutes" | "hours";

export interface PauseEvent {
  paused_at: number; // ms epoch
  resumed_at: number | null;
}

export interface SessionRow {
  id: string;
  user_id: string;
  mode: Mode;
  start_time: string;
  end_time: string;
  duration_seconds: number;
  target_seconds: number | null;
  pause_events: PauseEvent[];
  created_at: string;
  updated_at: string;
}

export interface TagRow {
  id: string;
  user_id: string;
  name: string;
  created_at: string;
}

export interface SessionWithTags extends SessionRow {
  tags: TagRow[];
}

export interface SessionRecord {
  startTime: string;
  endTime: string;
  duration: number;
  tags: string[];
  mode: Mode;
  date: string;
}

export const GRAPH_COLORS = [
  "hsl(var(--graph-green))",
  "hsl(var(--graph-blue))",
  "hsl(var(--graph-purple))",
  "hsl(var(--graph-orange))",
  "hsl(var(--graph-red))",
  "hsl(var(--graph-cyan))",
  "hsl(var(--graph-yellow))",
] as const;

export function colorForTag(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) {
    h = (h * 31 + name.charCodeAt(i)) >>> 0;
  }
  return GRAPH_COLORS[h % GRAPH_COLORS.length];
}

export function formatHMS(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return [h, m, sec].map((n) => n.toString().padStart(2, "0")).join(":");
}

export function formatHumanDuration(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h === 0 && m === 0) return `${s}s`;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

export function parseHMS(input: string): number {
  // Accepts "HH:MM:SS", "MM:SS", "SS", numbers; returns seconds.
  const cleaned = input.trim();
  if (!cleaned) return 0;
  const parts = cleaned.split(":").map((p) => parseInt(p, 10) || 0);
  let h = 0, m = 0, s = 0;
  if (parts.length === 3) [h, m, s] = parts;
  else if (parts.length === 2) [m, s] = parts;
  else if (parts.length === 1) [s] = parts;
  return h * 3600 + m * 60 + s;
}

export function secondsToUnit(seconds: number, unit: TimeUnit): number {
  if (unit === "minutes") return seconds / 60;
  return seconds / 3600;
}

export function formatDuration(seconds: number, unit: TimeUnit): string {
  const value = secondsToUnit(seconds, unit);
  return Number(value.toFixed(2)) + (unit === "minutes" ? " min" : " hr");
}

export function formatTime(totalSeconds: number): string {
  const safeSeconds = Math.max(0, Math.floor(totalSeconds));
  const seconds = safeSeconds % 60;
  const minutes = Math.floor((safeSeconds / 60) % 60);
  const hours = Math.floor(safeSeconds / 3600);
  const pad = (n: number) => String(n).padStart(2, "0");

  if (hours > 0) {
    return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  }

  return `${pad(minutes)}:${pad(seconds)}`;
}

export function totalPausedMs(events: PauseEvent[], nowMs: number): number {
  let total = 0;
  for (const ev of events) {
    const end = ev.resumed_at ?? nowMs;
    total += Math.max(0, end - ev.paused_at);
  }
  return total;
}

export function isPaused(events: PauseEvent[]): boolean {
  if (events.length === 0) return false;
  return events[events.length - 1].resumed_at === null;
}

export function localDayKey(d: Date | string): string {
  let date: Date;
  if (typeof d === "string") {
    const iso = new Date(d);
    date = new Date(iso.getTime() - iso.getTimezoneOffset() * 60000);
  } else {
    date = d;
  }
  const y = date.getUTCFullYear();
  const m = (date.getUTCMonth() + 1).toString().padStart(2, "0");
  const day = date.getUTCDate().toString().padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function isToday(dateString: string, today = new Date()): boolean {
  const d = new Date(dateString);

  if (Number.isNaN(d.getTime())) {
    return false;
  }

  return (
    d.getFullYear() === today.getFullYear() &&
    d.getMonth() === today.getMonth() &&
    d.getDate() === today.getDate()
  );
}
