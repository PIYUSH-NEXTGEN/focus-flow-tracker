import { useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import { Play, Pause, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CircularProgress } from "./CircularProgress";
import { TagSelector } from "./TagSelector";
import { useFocusTimer, type ActiveSession } from "@/hooks/useFocusTimer";
import { useCreateSession } from "@/hooks/useFocusData";
import { formatHMS, parseHMS, type Mode, formatTime, type SessionRecord } from "@/lib/focus";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { SessionEditDialog } from "./SessionEditDialog";

export function FocusStation() {
  const timer = useFocusTimer();
  const createSession = useCreateSession();

  const [mode, setMode] = useState<Mode>("timer");
  const [hms, setHms] = useState("00:25:00");
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [editId, setEditId] = useState<string | null>(null);

  // When an active session exists, mirror its mode + tags into local state for display.
  useEffect(() => {
    if (timer.active) {
      setMode(timer.active.mode);
      setSelectedTagIds(timer.active.selectedTagIds);
    }
  }, [timer.active?.mode, timer.active?.selectedTagIds.join(",")]);

  const targetSeconds = useMemo(() => parseHMS(hms), [hms]);

  const display = useMemo(() => {
    if (!timer.active) {
      return mode === "timer" ? formatTime(targetSeconds) : formatTime(0);
    }
    if (timer.active.mode === "timer" && timer.active.targetSeconds !== null) {
      return formatTime(Math.max(0, timer.active.targetSeconds - timer.elapsedSeconds));
    }
    return formatTime(timer.elapsedSeconds);
  }, [timer.active, timer.elapsedSeconds, mode, targetSeconds]);

  const progress = useMemo(() => {
    if (!timer.active) return mode === "timer" ? 0 : null;
    if (timer.active.mode === "timer" && timer.active.targetSeconds) {
      return Math.min(1, timer.elapsedSeconds / timer.active.targetSeconds);
    }
    return null;
  }, [timer.active, timer.elapsedSeconds, mode]);

  const subtitle = timer.active
    ? timer.paused
      ? "paused"
      : timer.active.mode
    : "ready";

  // Auto-end when timer hits target
  useEffect(() => {
    if (timer.reachedTarget) {
      void handleEnd();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timer.reachedTarget]);

  const handleStart = () => {
    if (mode === "timer" && targetSeconds <= 0) {
      toast.error("Set a duration first");
      return;
    }
    timer.start(mode, mode === "timer" ? targetSeconds : null, selectedTagIds);
  };

  const handleEnd = async () => {
    const snapshot = timer.end();
    if (!snapshot) return;
    await persistSession(snapshot);
  };

  const persistSession = async (s: ActiveSession) => {
    const nowMs = Date.now();
    const startDate = new Date(s.startMs);
    const endDate = new Date(nowMs);
    const startTime = startDate.toISOString();
    const endTime = endDate.toISOString();
    // Recompute paused total accurately for end timestamp
    const totalPaused = s.pauseEvents.reduce(
      (acc, ev) => acc + Math.max(0, (ev.resumed_at ?? nowMs) - ev.paused_at),
      0
    );
    const rawDuration = (endDate.getTime() - startDate.getTime() - totalPaused) / 1000;
    let durationSec = Number(Math.max(0, rawDuration).toFixed(2));

    if (!Number.isFinite(durationSec)) {
      durationSec = 0;
    }

    if (s.mode === "timer" && s.targetSeconds) {
      durationSec = Number(Math.min(durationSec, s.targetSeconds).toFixed(2));
    }

    const sessionRecord: SessionRecord = {
      startTime,
      endTime,
      duration: durationSec,
      tags: s.selectedTagIds,
      mode: s.mode,
      date: startTime,
    };

    console.log("Created session:", sessionRecord);

    try {
      const id = await createSession.mutateAsync({
        mode: sessionRecord.mode,
        start_time: sessionRecord.startTime,
        end_time: sessionRecord.endTime,
        duration_seconds: sessionRecord.duration,
        target_seconds: s.targetSeconds,
        pause_events: s.pauseEvents,
        tag_ids: sessionRecord.tags,
      });
      toast.success("Session saved");
      setEditId(id);
    } catch (err: any) {
      toast.error(err.message ?? "Failed to save session");
    }
  };

  const sessionRunning = !!timer.active;

  return (
    <section className="w-full">
      {/* Mode selector */}
      <div className="flex justify-center mb-8">
        <div className="inline-flex rounded-full border border-border p-1">
          {(["timer", "stopwatch"] as Mode[]).map((m) => (
            <button
              key={m}
              type="button"
              disabled={sessionRunning}
              onClick={() => setMode(m)}
              className={cn(
                "fm-interactive px-5 py-1.5 rounded-full text-sm font-medium transition capitalize",
                mode === m ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground",
                sessionRunning && "opacity-60 cursor-not-allowed"
              )}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      {/* Circular display */}
      <div className="fm-page-enter flex justify-center" style={{ "--fm-delay": "0ms" } as CSSProperties}>
        <CircularProgress
          progress={progress}
          display={display}
          subtitle={subtitle}
          paused={timer.paused}
          size={Math.min(360, typeof window !== "undefined" ? window.innerWidth - 64 : 360)}
        />
      </div>

      {/* Timer setup input */}
      {!sessionRunning && mode === "timer" && (
        <div className="mt-8 flex flex-col items-center gap-2">
          <label className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Duration</label>
          <input
            value={hms}
            onChange={(e) => setHms(e.target.value)}
            onBlur={() => setHms(formatHMS(parseHMS(hms)))}
            placeholder="HH:MM:SS"
            className="font-mono-num text-center text-lg w-40 bg-transparent border-b border-border focus:border-foreground outline-none py-1"
          />
        </div>
      )}

      {/* Tags */}
      <div className="fm-page-enter mt-8" style={{ "--fm-delay": "120ms" } as CSSProperties}>
        <TagSelector
          selectedIds={selectedTagIds}
          onChange={(ids) => {
            setSelectedTagIds(ids);
            if (timer.active) timer.setSelectedTagIds(ids);
          }}
        />
      </div>

      {/* Controls */}
      <div className="fm-page-enter mt-10 flex justify-center items-center gap-3" style={{ "--fm-delay": "200ms" } as CSSProperties}>
        {!sessionRunning ? (
          <Button size="lg" onClick={handleStart} className="rounded-full h-14 px-8">
            <Play className="h-5 w-5 mr-2 fill-current" /> Start
          </Button>
        ) : (
          <>
            {timer.paused ? (
              <Button size="lg" onClick={timer.resume} className="rounded-full h-14 px-8">
                <Play className="h-5 w-5 mr-2 fill-current" /> Resume
              </Button>
            ) : (
              <Button
                size="lg"
                variant="outline"
                onClick={timer.pause}
                className="rounded-full h-14 px-8"
              >
                <Pause className="h-5 w-5 mr-2 fill-current" /> Pause
              </Button>
            )}
            <Button
              size="lg"
              variant="outline"
              onClick={handleEnd}
              className="rounded-full h-14 px-8"
            >
              <Square className="h-5 w-5 mr-2 fill-current" /> End
            </Button>
          </>
        )}
      </div>

      <SessionEditDialog
        sessionId={editId}
        onClose={() => setEditId(null)}
      />
    </section>
  );
}
