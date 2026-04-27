import { useMemo } from "react";
import type { CSSProperties } from "react";
import { useSessions } from "@/hooks/useFocusData";
import { colorForTag, formatHumanDuration, localDayKey, type SessionWithTags, formatDuration, type TimeUnit } from "@/lib/focus";
import { useTimeUnit } from "@/hooks/useTimeUnit";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell } from "recharts";

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
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
}

function computeStreaks(daySet: Set<string>): { longest: number; average: number } {
  if (daySet.size === 0) return { longest: 0, average: 0 };
  const days = Array.from(daySet).sort();
  const streaks: number[] = [];
  let cur = 1;
  for (let i = 1; i < days.length; i++) {
    const prev = new Date(days[i - 1] + "T00:00:00");
    const next = new Date(days[i] + "T00:00:00");
    const diffDays = Math.round((next.getTime() - prev.getTime()) / 86_400_000);
    if (diffDays === 1) cur++;
    else {
      streaks.push(cur);
      cur = 1;
    }
  }
  streaks.push(cur);
  const longest = Math.max(...streaks);
  const average = streaks.reduce((a, b) => a + b, 0) / streaks.length;
  return { longest, average: Math.round(average * 10) / 10 };
}

export function AllTimeStats() {
  const { data: sessions = [] } = useSessions();
  const [unit] = useTimeUnit();

  const now = new Date();
  const monthSessions = sessions.filter((s) => {
    const d = new Date(s.start_time);
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
  });
  const yearSessions = sessions.filter((s) => {
    const d = new Date(s.start_time);
    return d.getFullYear() === now.getFullYear();
  });

  const allTotal = sessions.reduce((a, s) => a + s.duration_seconds, 0);
  const monthTotal = monthSessions.reduce((a, s) => a + s.duration_seconds, 0);
  const yearTotal = yearSessions.reduce((a, s) => a + s.duration_seconds, 0);

  // Highest day
  const dayTotals = useMemo(() => {
    const m = new Map<string, number>();
    for (const s of sessions) {
      const k = localDayKey(s.start_time);
      m.set(k, (m.get(k) ?? 0) + s.duration_seconds);
    }
    return m;
  }, [sessions]);

  const highest = useMemo(() => {
    let best: { key: string; value: number } | null = null;
    for (const [k, v] of dayTotals.entries()) {
      if (!best || v > best.value) best = { key: k, value: v };
    }
    return best;
  }, [dayTotals]);

  const avgSession = sessions.length > 0 ? allTotal / sessions.length : 0;

  const daySet = useMemo(() => new Set(dayTotals.keys()), [dayTotals]);
  const { longest, average } = useMemo(() => computeStreaks(daySet), [daySet]);

  const monthDist = useMemo(() => tagDist(monthSessions), [monthSessions]);
  const yearDist = useMemo(() => tagDist(yearSessions), [yearSessions]);
  const allDist = useMemo(() => tagDist(sessions), [sessions]);

  return (
    <div className="fm-page-enter space-y-8" style={{ "--fm-delay": "90ms" } as CSSProperties}>
      <div className="grid gap-3 md:grid-cols-3">
        <Tile label={`This month (${now.toLocaleDateString(undefined, { month: "short" })})`} value={formatDuration(monthTotal, unit)} sub={`${monthSessions.length} sessions`} />
        <Tile label={`This year (${now.getFullYear()})`} value={formatDuration(yearTotal, unit)} sub={`${yearSessions.length} sessions`} />
        <Tile label="All time" value={formatDuration(allTotal, unit)} sub={`${sessions.length} sessions`} />
      </div>

      <div className="grid gap-3 md:grid-cols-3 lg:grid-cols-5">
        <Tile
          label="Highest day"
          value={highest ? formatDuration(highest.value, unit) : "—"}
          sub={highest ? new Date(highest.key + "T00:00:00").toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) : ""}
        />
        <Tile label="Total sessions" value={sessions.length.toString()} />
        <Tile label="Avg session" value={formatDuration(avgSession, unit)} />
        <Tile label="Longest streak" value={`${longest}d`} />
        <Tile label="Avg streak" value={`${average}d`} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <DistCard title="Month tags" data={monthDist} unit={unit} />
        <DistCard title="Year tags" data={yearDist} unit={unit} />
        <DistCard title="All-time tags" data={allDist} unit={unit} />
      </div>
    </div>
  );
}

function Tile({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="hairline rounded-2xl p-5">
      <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </div>
      <div className="mt-2 font-mono-num text-2xl font-semibold">{value}</div>
      {sub && <div className="text-xs text-muted-foreground mt-1">{sub}</div>}
    </div>
  );
}

function DistCard({ title, data, unit }: { title: string; data: { name: string; value: number }[]; unit: TimeUnit }) {
  return (
    <div className="hairline rounded-2xl p-5">
      <h3 className="text-sm font-medium uppercase tracking-[0.15em] text-muted-foreground mb-4">
        {title}
      </h3>
      {data.length === 0 ? (
        <div className="h-40 grid place-items-center text-sm text-muted-foreground">
          No data
        </div>
      ) : (
        <div className="h-44">
          <ResponsiveContainer>
            <BarChart data={data} layout="vertical" margin={{ left: 0, right: 16 }}>
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
                formatter={(v: number) => formatDuration(v, unit)}
                contentStyle={{
                  background: "hsl(var(--background))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: 8,
                  fontSize: 12,
                }}
                cursor={{ fill: "hsl(var(--muted))" }}
              />
              <Bar dataKey="value" radius={[0, 4, 4, 0]} isAnimationActive animationDuration={500} animationEasing="ease-out">
                {data.map((d) => (
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
    </div>
  );
}
