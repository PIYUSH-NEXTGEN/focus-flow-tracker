import { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { TagSelector } from "./TagSelector";
import { useDeleteSession, useSessions, useUpdateSession } from "@/hooks/useFocusData";
import { formatHMS, parseHMS } from "@/lib/focus";
import { toast } from "sonner";

interface Props {
  sessionId: string | null;
  onClose: () => void;
}

function toLocalInput(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fromLocalInput(v: string): string {
  // v is "YYYY-MM-DDTHH:MM" in local time
  const d = new Date(v);
  return d.toISOString();
}

export function SessionEditDialog({ sessionId, onClose }: Props) {
  const { data: sessions = [] } = useSessions();
  const update = useUpdateSession();
  const del = useDeleteSession();

  const session = useMemo(
    () => sessions.find((s) => s.id === sessionId) ?? null,
    [sessions, sessionId]
  );

  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [duration, setDuration] = useState("00:00:00");
  const [tagIds, setTagIds] = useState<string[]>([]);

  useEffect(() => {
    if (!session) return;
    setStart(toLocalInput(session.start_time));
    setEnd(toLocalInput(session.end_time));
    setDuration(formatHMS(session.duration_seconds));
    setTagIds(session.tags.map((t) => t.id));
  }, [session?.id]);

  // When start/end changes, recompute duration
  useEffect(() => {
    if (!start || !end) return;
    const diff = (new Date(end).getTime() - new Date(start).getTime()) / 1000;
    if (diff >= 0) setDuration(formatHMS(diff));
  }, [start, end]);

  const handleSave = async () => {
    if (!session) return;
    const startISO = fromLocalInput(start);
    const endISO = fromLocalInput(end);
    let durSec = parseHMS(duration);
    const diff = Math.floor((new Date(endISO).getTime() - new Date(startISO).getTime()) / 1000);
    // If user manually edited duration that doesn't match, prefer manual but clamp non-negative.
    if (durSec <= 0) durSec = Math.max(0, diff);
    try {
      await update.mutateAsync({
        id: session.id,
        start_time: startISO,
        end_time: endISO,
        duration_seconds: durSec,
        tag_ids: tagIds,
      });
      toast.success("Session updated");
      onClose();
    } catch (err: any) {
      toast.error(err.message ?? "Failed to update");
    }
  };

  const handleDelete = async () => {
    if (!session) return;
    if (!confirm("Delete this session permanently?")) return;
    try {
      await del.mutateAsync(session.id);
      toast.success("Session deleted");
      onClose();
    } catch (err: any) {
      toast.error(err.message ?? "Failed to delete");
    }
  };

  return (
    <Dialog open={!!sessionId} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit session</DialogTitle>
          <DialogDescription>
            Adjust times, duration, or tags. Useful for forgotten stops.
          </DialogDescription>
        </DialogHeader>

        {session && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="start">Start</Label>
                <Input
                  id="start"
                  type="datetime-local"
                  value={start}
                  onChange={(e) => setStart(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="end">End</Label>
                <Input
                  id="end"
                  type="datetime-local"
                  value={end}
                  onChange={(e) => setEnd(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="dur">Duration (HH:MM:SS)</Label>
              <Input
                id="dur"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                onBlur={() => setDuration(formatHMS(parseHMS(duration)))}
                className="font-mono-num"
              />
            </div>
            <div className="space-y-2">
              <Label>Tags</Label>
              <TagSelector selectedIds={tagIds} onChange={setTagIds} size="sm" />
            </div>
          </div>
        )}

        <DialogFooter className="gap-2 sm:justify-between">
          <Button variant="ghost" onClick={handleDelete}>
            Delete
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={update.isPending}>
              Save
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
