import { useEffect, useMemo, useState } from "react";
import { Play, Pause, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CircularProgress } from "./CircularProgress";
import { TagSelector } from "./TagSelector";
import { useFocusTimer, type ActiveSession } from "@/hooks/useFocusTimer";
import { useCreateSession } from "@/hooks/useFocusData";
import { formatHMS, parseHMS, type Mode } from "@/lib/focus";
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
      return mode === "timer" ? formatHMS(targetSeconds) : "00:00:00";
    }
    if (timer.active.mode === "timer" && timer.active.targetSeconds !== null) {
      return formatHMS(Math.max(0, timer.active.targetSeconds - timer.elapsedSeconds));
    }
    return formatHMS(timer.elapsedSeconds);
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
    const endMs = Date.now();
    // Recompute paused total accurately for end timestamp
    const totalPaused = s.pauseEvents.reduce(
      (acc, ev) => acc + Math.max(0, (ev.resumed_at ?? endMs) - ev.paused_at),
      0
    );
    let durationSec = Math.max(1, Math.floor((endMs - s.startMs - totalPaused) / 1000));
    // For timer that hit target, cap at target.
    if (s.mode === "timer" && s.targetSeconds) {
      durationSec = Math.min(durationSec, s.targetSeconds);
    }
    try {
      const id = await createSession.mutateAsync({
        mode: s.mode,
        start_time: new Date(s.startMs).toISOString(),
        end_time: new Date(s.startMs + durationSec * 1000 + totalPaused).toISOString(),
        duration_seconds: durationSec,
        target_seconds: s.targetSeconds,
        pause_events: s.pauseEvents,
        tag_ids: s.selectedTagIds,
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
                "px-5 py-1.5 rounded-full text-sm font-medium transition capitalize",
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
      <div className="flex justify-center">
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
      <div className="mt-8">
        <TagSelector
          selectedIds={selectedTagIds}
          onChange={(ids) => {
            setSelectedTagIds(ids);
            if (timer.active) timer.setSelectedTagIds(ids);
          }}
        />
      </div>

      {/* Controls */}
      <div className="mt-10 flex justify-center items-center gap-3">
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
