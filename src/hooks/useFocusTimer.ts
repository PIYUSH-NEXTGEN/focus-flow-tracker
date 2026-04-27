import { useCallback, useEffect, useRef, useState } from "react";
import type { Mode, PauseEvent } from "@/lib/focus";
import { isPaused, totalPausedMs } from "@/lib/focus";

const STORAGE_KEY = "focus-meter:active-session:v1";

export interface ActiveSession {
  mode: Mode;
  startMs: number;          // ms epoch when started
  targetSeconds: number | null; // for timer mode
  pauseEvents: PauseEvent[];
  selectedTagIds: string[];
}

interface Persisted extends ActiveSession {}

function load(): Persisted | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as Persisted;
  } catch {
    return null;
  }
}

function save(s: Persisted | null) {
  if (!s) localStorage.removeItem(STORAGE_KEY);
  else localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
}

export interface UseFocusTimerResult {
  active: ActiveSession | null;
  elapsedSeconds: number;
  paused: boolean;
  start: (mode: Mode, targetSeconds: number | null, selectedTagIds: string[]) => void;
  pause: () => void;
  resume: () => void;
  end: () => ActiveSession | null;
  setSelectedTagIds: (ids: string[]) => void;
  // For timer auto-end
  reachedTarget: boolean;
}

export function useFocusTimer(): UseFocusTimerResult {
  const [active, setActive] = useState<ActiveSession | null>(() => load());
  const [, setTick] = useState(0);
  const rafRef = useRef<number | null>(null);

  // Persist on every change.
  useEffect(() => {
    save(active);
  }, [active]);

  // Animation loop while running (not paused).
  useEffect(() => {
    if (!active) return;
    let stopped = false;
    const loop = () => {
      if (stopped) return;
      setTick((t) => (t + 1) % 1_000_000);
      rafRef.current = window.setTimeout(loop, 250) as unknown as number;
    };
    loop();
    return () => {
      stopped = true;
      if (rafRef.current) clearTimeout(rafRef.current);
    };
  }, [active]);

  const now = Date.now();
  const paused = active ? isPaused(active.pauseEvents) : false;
  const elapsedMs = active
    ? now - active.startMs - totalPausedMs(active.pauseEvents, now)
    : 0;
  const elapsedSeconds = Math.max(0, Math.floor(elapsedMs / 1000));

  const reachedTarget =
    !!active &&
    active.mode === "timer" &&
    active.targetSeconds !== null &&
    elapsedSeconds >= active.targetSeconds;

  const start = useCallback(
    (mode: Mode, targetSeconds: number | null, selectedTagIds: string[]) => {
      const next: ActiveSession = {
        mode,
        startMs: Date.now(),
        targetSeconds: mode === "timer" ? targetSeconds : null,
        pauseEvents: [],
        selectedTagIds,
      };
      setActive(next);
    },
    []
  );

  const pause = useCallback(() => {
    setActive((prev) => {
      if (!prev || isPaused(prev.pauseEvents)) return prev;
      return {
        ...prev,
        pauseEvents: [...prev.pauseEvents, { paused_at: Date.now(), resumed_at: null }],
      };
    });
  }, []);

  const resume = useCallback(() => {
    setActive((prev) => {
      if (!prev || !isPaused(prev.pauseEvents)) return prev;
      const events = prev.pauseEvents.slice();
      events[events.length - 1] = {
        ...events[events.length - 1],
        resumed_at: Date.now(),
      };
      return { ...prev, pauseEvents: events };
    });
  }, []);

  const end = useCallback((): ActiveSession | null => {
    let snapshot: ActiveSession | null = null;
    setActive((prev) => {
      snapshot = prev;
      return null;
    });
    save(null);
    return snapshot;
  }, []);

  const setSelectedTagIds = useCallback((ids: string[]) => {
    setActive((prev) => (prev ? { ...prev, selectedTagIds: ids } : prev));
  }, []);

  return { active, elapsedSeconds, paused, start, pause, resume, end, setSelectedTagIds, reachedTarget };
}
