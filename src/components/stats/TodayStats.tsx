import { useMemo } from "react";
import { useSessions } from "@/hooks/useFocusData";
import { colorForTag, formatHumanDuration, localDayKey, type SessionWithTags } from "@/lib/focus";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from "recharts";

interface Props {
  /** Optional date (local). Defaults to today. */
  date?: Date;
}

function tagDistribution(sessions: SessionWithTags[]) {
  const map = new Map<string, number>();
  for (const s of sessions) {
    if (s.tags.length === 0) {
      map.set("untagged", (map.get("untagged") ?? 0) + s.duration_seconds);
    } else {
      // Distribute evenly across tags so totals don't double-count.
      const per = s.duration_seconds / s.tags.length;
      for (const t of s.tags) {
        map.set(t.name, (map.get(t.name) ?? 0) + per);
      }
    }
  }
  return Array.from(map.entries())
    .map(([name, value]) => ({ name, value: Math.round(value) }))
    .sort((a, b) => b.value - a.value);
}

export function TodayStats({ date }: Props) {
  const { data: sessions = [] } = useSessions();
  const day = date ?? new Date();
  const dayKey = localDayKey(day);

  const todays = useMemo(
    () => sessions.filter((s) => localDayKey(s.start_time) === dayKey),
    [sessions, dayKey]
  );

  const totalSec = todays.reduce((a, s) => a + s.duration_seconds, 0);
  const timerCount = todays.filter((s) => s.mode === "timer").length;
  const stopwatchCount = todays.filter((s) => s.mode === "stopwatch").length;

  const dist = useMemo(() => tagDistribution(todays), [todays]);

  return (
    <div className="grid gap-6 md:grid-cols-3">
      <StatCard label="Total focus" value={formatHumanDuration(totalSec)} />
      <StatCard label="Sessions" value={todays.length.toString()} />
      <StatCard
        label="Mode"
        value={
          todays.length === 0
            ? "—"
            : `${timerCount} timer · ${stopwatchCount} stopwatch`
        }
      />

      <div className="md:col-span-3 hairline rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-medium uppercase tracking-[0.15em] text-muted-foreground">
            Tag distribution
          </h3>
          <span className="text-xs text-muted-foreground">{dist.length} tags</span>
        </div>
        {dist.length === 0 ? (
          <div className="text-sm text-muted-foreground py-10 text-center">
            No focus time yet today.
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-6 items-center">
            <div className="h-56">
              <ResponsiveContainer>
                <PieChart>
                  <Pie
                    data={dist}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={50}
                    outerRadius={90}
                    paddingAngle={2}
                    stroke="hsl(var(--background))"
                  >
                    {dist.map((d) => (
                      <Cell
                        key={d.name}
                        fill={d.name === "untagged" ? "hsl(var(--muted-foreground))" : colorForTag(d.name)}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(v: number) => formatHumanDuration(v)}
                    contentStyle={{
                      background: "hsl(var(--background))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <ul className="space-y-2">
              {dist.map((d) => (
                <li key={d.name} className="flex items-center justify-between text-sm">
                  <span className="inline-flex items-center gap-2">
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{
                        background: d.name === "untagged" ? "hsl(var(--muted-foreground))" : colorForTag(d.name),
                      }}
                    />
                    {d.name}
                  </span>
                  <span className="font-mono-num text-muted-foreground">
                    {formatHumanDuration(d.value)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="hairline rounded-2xl p-6">
      <div className="text-xs uppercase tracking-[0.15em] text-muted-foreground">
        {label}
      </div>
      <div className="mt-2 font-mono-num text-3xl font-semibold">{value}</div>
    </div>
  );
}
