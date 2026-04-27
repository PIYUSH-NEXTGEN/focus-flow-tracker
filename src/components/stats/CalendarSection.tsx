import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useSessions } from "@/hooks/useFocusData";
import { colorForTag, formatHumanDuration, localDayKey, type SessionWithTags } from "@/lib/focus";
import { Button } from "@/components/ui/button";
import { SessionEditDialog } from "../focus/SessionEditDialog";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell } from "recharts";
import { cn } from "@/lib/utils";

type Selection =
  | { kind: "day"; key: string; date: Date }
  | { kind: "week"; weekStart: Date; weekEnd: Date }
  | null;

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}
function addMonths(d: Date, n: number) {
  return new Date(d.getFullYear(), d.getMonth() + n, 1);
}
function startOfWeekMonday(d: Date) {
  const date = new Date(d);
  const day = (date.getDay() + 6) % 7; // 0 = Mon
  date.setDate(date.getDate() - day);
  date.setHours(0, 0, 0, 0);
  return date;
}
function addDays(d: Date, n: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

function buildMonthGrid(monthStart: Date) {
  const firstDayOfMonth = monthStart;
  const gridStart = startOfWeekMonday(firstDayOfMonth);
  const days: Date[] = [];
  for (let i = 0; i < 42; i++) days.push(addDays(gridStart, i));
  return days;
}

function tagDist(sessions: SessionWithTags[]) {
  const map = new Map<string, number>();
  for (const s of sessions) {
    if (s.tags.length === 0) {
      map.set("untagged", (map.get("untagged") ?? 0) + s.duration_seconds);
    } else {
      const per = s.duration_seconds / s.tags.length;
      for (const t of s.tags) map.set(t.name, (map.get(t.name) ?? 0) + per);
    }
  }
  return Array.from(map.entries())
    .map(([name, value]) => ({ name, value: Math.round(value) }))
    .sort((a, b) => b.value - a.value);
}

export function CalendarSection() {
  const { data: sessions = [] } = useSessions();
  const [monthAnchor, setMonthAnchor] = useState(() => startOfMonth(new Date()));
  const [selection, setSelection] = useState<Selection>(null);
  const [editId, setEditId] = useState<string | null>(null);

  // Build per-day total seconds map
  const dayTotals = useMemo(() => {
    const m = new Map<string, number>();
    for (const s of sessions) {
      const k = localDayKey(s.start_time);
      m.set(k, (m.get(k) ?? 0) + s.duration_seconds);
    }
    return m;
  }, [sessions]);

  const maxDayTotal = useMemo(() => {
    let max = 0;
    for (const v of dayTotals.values()) if (v > max) max = v;
    return max;
  }, [dayTotals]);

  const grid = useMemo(() => buildMonthGrid(monthAnchor), [monthAnchor]);
  const weeks = useMemo(() => {
    const w: Date[][] = [];
    for (let i = 0; i < 6; i++) w.push(grid.slice(i * 7, i * 7 + 7));
    return w;
  }, [grid]);

  const monthLabel = monthAnchor.toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });

  return (
    <div className="hairline rounded-2xl p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold">{monthLabel}</h2>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMonthAnchor((d) => addMonths(d, -1))}
            aria-label="Previous month"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setMonthAnchor(startOfMonth(new Date()));
              setSelection(null);
            }}
          >
            Today
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMonthAnchor((d) => addMonths(d, 1))}
            aria-label="Next month"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-[auto_repeat(7,minmax(0,1fr))] gap-1 text-[10px] uppercase tracking-wider text-muted-foreground mb-2">
        <div className="w-6" />
        {WEEKDAYS.map((d) => (
          <div key={d} className="text-center">{d}</div>
        ))}
      </div>

      {/* Grid: each row has a weekly summary trigger on the left */}
      <div className="space-y-1">
        {weeks.map((week, wi) => {
          const weekStart = week[0];
          const weekEnd = week[6];
          const weekActive =
            selection?.kind === "week" &&
            selection.weekStart.getTime() === weekStart.getTime();
          return (
            <div
              key={wi}
              className="grid grid-cols-[auto_repeat(7,minmax(0,1fr))] gap-1"
            >
              <button
                type="button"
                onClick={() =>
                  setSelection(
                    weekActive
                      ? null
                      : { kind: "week", weekStart, weekEnd }
                  )
                }
                className={cn(
                  "w-6 grid place-items-center rounded text-[10px] text-muted-foreground hover:bg-accent transition",
                  weekActive && "bg-foreground text-background hover:bg-foreground"
                )}
                aria-label={`Week of ${weekStart.toDateString()}`}
                title="Weekly summary"
              >
                W
              </button>
              {week.map((day) => {
                const inMonth = day.getMonth() === monthAnchor.getMonth();
                const key = localDayKey(day);
                const total = dayTotals.get(key) ?? 0;
                const intensity = maxDayTotal > 0 ? total / maxDayTotal : 0;
                const isToday = key === localDayKey(new Date());
                const dayActive =
                  selection?.kind === "day" && selection.key === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() =>
                      setSelection(
                        dayActive ? null : { kind: "day", key, date: day }
                      )
                    }
                    className={cn(
                      "aspect-square rounded-md text-xs flex flex-col items-center justify-between p-1.5 border transition",
                      inMonth ? "border-border" : "border-transparent text-muted-foreground/50",
                      dayActive
                        ? "bg-foreground text-background border-foreground"
                        : "hover:border-foreground/40",
                      isToday && !dayActive && "ring-1 ring-foreground/40"
                    )}
                  >
                    <span className="font-mono-num">{day.getDate()}</span>
                    <span
                      className="h-1 w-full rounded-full"
                      style={{
                        background:
                          total > 0
                            ? `hsl(var(--foreground) / ${0.15 + intensity * 0.85})`
                            : "transparent",
                      }}
                    />
                  </button>
                );
              })}
            </div>
          );
        })}
      </div>

      {/* Drill-down panel */}
      {selection && (
        <div className="mt-6 border-t border-border pt-6">
          {selection.kind === "day" ? (
            <DayPanel
              date={selection.date}
              sessions={sessions.filter(
                (s) => localDayKey(s.start_time) === selection.key
              )}
              onEdit={setEditId}
            />
          ) : (
            <WeekPanel
              weekStart={selection.weekStart}
              weekEnd={selection.weekEnd}
              sessions={sessions.filter((s) => {
                const t = new Date(s.start_time).getTime();
                return (
                  t >= selection.weekStart.getTime() &&
                  t < addDays(selection.weekEnd, 1).getTime()
                );
              })}
            />
          )}
        </div>
      )}

      <SessionEditDialog sessionId={editId} onClose={() => setEditId(null)} />
    </div>
  );
}

function DayPanel({
  date,
  sessions,
  onEdit,
}: {
  date: Date;
  sessions: SessionWithTags[];
  onEdit: (id: string) => void;
}) {
  const total = sessions.reduce((a, s) => a + s.duration_seconds, 0);
  const dist = tagDist(sessions);
  const timer = sessions.filter((s) => s.mode === "timer").length;
  const sw = sessions.filter((s) => s.mode === "stopwatch").length;
  return (
    <div>
      <div className="flex flex-wrap items-baseline justify-between gap-3 mb-4">
        <h3 className="text-base font-semibold">
          {date.toLocaleDateString(undefined, {
            weekday: "long",
            month: "long",
            day: "numeric",
          })}
        </h3>
        <div className="text-sm text-muted-foreground">
          <span className="font-mono-num text-foreground">{formatHumanDuration(total)}</span>
          {" · "}{sessions.length} sessions · {timer}T / {sw}S
        </div>
      </div>
      {dist.length > 0 && (
        <div className="h-40 mb-4">
          <ResponsiveContainer>
            <BarChart data={dist} layout="vertical" margin={{ left: 0, right: 16 }}>
              <XAxis type="number" hide />
              <YAxis
                type="category"
                dataKey="name"
                width={80}
                tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                formatter={(v: number) => formatHumanDuration(v)}
                contentStyle={{
                  background: "hsl(var(--background))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: 8,
                  fontSize: 12,
                }}
                cursor={{ fill: "hsl(var(--muted))" }}
              />
              <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                {dist.map((d) => (
                  <Cell
                    key={d.name}
                    fill={d.name === "untagged" ? "hsl(var(--muted-foreground))" : colorForTag(d.name)}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
      <ul className="divide-y divide-border">
        {sessions.length === 0 && (
          <li className="text-sm text-muted-foreground py-3">
            No sessions on this day.
          </li>
        )}
        {sessions.map((s) => (
          <li key={s.id}>
            <button
              type="button"
              onClick={() => onEdit(s.id)}
              className="w-full flex items-center justify-between py-3 text-left hover:bg-accent/40 -mx-2 px-2 rounded transition"
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className="text-xs font-mono-num text-muted-foreground w-12">
                  {new Date(s.start_time).toLocaleTimeString(undefined, {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
                <span className="text-xs uppercase tracking-wider text-muted-foreground">
                  {s.mode}
                </span>
                <div className="flex flex-wrap gap-1">
                  {s.tags.map((t) => (
                    <span
                      key={t.id}
                      className="inline-flex items-center gap-1 text-xs text-muted-foreground"
                    >
                      <span
                        className="h-1.5 w-1.5 rounded-full"
                        style={{ background: colorForTag(t.name) }}
                      />
                      {t.name}
                    </span>
                  ))}
                </div>
              </div>
              <span className="font-mono-num text-sm">
                {formatHumanDuration(s.duration_seconds)}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function WeekPanel({
  weekStart,
  weekEnd,
  sessions,
}: {
  weekStart: Date;
  weekEnd: Date;
  sessions: SessionWithTags[];
}) {
  const total = sessions.reduce((a, s) => a + s.duration_seconds, 0);
  const dist = tagDist(sessions);
  const mostUsed = dist[0]?.name ?? "—";

  // Daily breakdown
  const daily = Array.from({ length: 7 }).map((_, i) => {
    const d = addDays(weekStart, i);
    const k = localDayKey(d);
    const v = sessions
      .filter((s) => localDayKey(s.start_time) === k)
      .reduce((a, s) => a + s.duration_seconds, 0);
    return { day: WEEKDAYS[i], value: Math.round(v) };
  });

  return (
    <div>
      <div className="flex flex-wrap items-baseline justify-between gap-3 mb-4">
        <h3 className="text-base font-semibold">
          Week of {weekStart.toLocaleDateString(undefined, { month: "short", day: "numeric" })}
          {" – "}
          {weekEnd.toLocaleDateString(undefined, { month: "short", day: "numeric" })}
        </h3>
        <div className="text-sm text-muted-foreground">
          <span className="font-mono-num text-foreground">{formatHumanDuration(total)}</span>
          {" · "}most used: <span className="text-foreground">{mostUsed}</span>
        </div>
      </div>
      <div className="grid md:grid-cols-2 gap-6">
        <div className="h-48">
          <ResponsiveContainer>
            <BarChart data={daily}>
              <XAxis
                dataKey="day"
                tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis hide />
              <Tooltip
                formatter={(v: number) => formatHumanDuration(v)}
                contentStyle={{
                  background: "hsl(var(--background))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: 8,
                  fontSize: 12,
                }}
                cursor={{ fill: "hsl(var(--muted))" }}
              />
              <Bar dataKey="value" fill="hsl(var(--foreground))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="h-48">
          {dist.length === 0 ? (
            <div className="h-full grid place-items-center text-sm text-muted-foreground">
              No tags this week.
            </div>
          ) : (
            <ResponsiveContainer>
              <BarChart data={dist} layout="vertical" margin={{ left: 0, right: 16 }}>
                <XAxis type="number" hide />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={80}
                  tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  formatter={(v: number) => formatHumanDuration(v)}
                  contentStyle={{
                    background: "hsl(var(--background))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                  cursor={{ fill: "hsl(var(--muted))" }}
                />
                <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                  {dist.map((d) => (
                    <Cell
                      key={d.name}
                      fill={d.name === "untagged" ? "hsl(var(--muted-foreground))" : colorForTag(d.name)}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
}
