# Focus Meter — Build Plan

A minimal black-and-white focus tracker with timer + stopwatch modes, tags, calendar drill-down, and analytics. All data syncs across devices via Lovable Cloud.

## 1. Backend (Lovable Cloud)

Enable Lovable Cloud with email/password + Google sign-in.

**Tables**

- `tags`
  - `id`, `user_id`, `name` (unique per user), `created_at`
- `sessions`
  - `id`, `user_id`, `mode` ('timer' | 'stopwatch'), `start_time`, `end_time`, `duration_seconds`, `target_seconds` (timer only, nullable), `pause_events` (jsonb array of `{paused_at, resumed_at}`), `created_at`, `updated_at`
- `session_tags` (join)
  - `session_id`, `tag_id`

RLS: each user sees/edits only their own rows. `user_roles` table not needed (single-user-per-account app).

## 2. Top of page — Focus station

- **Auth gate**: redirect to a clean black/white sign-in page if signed out.
- **Mode selector**: two toggle buttons "Timer" / "Stopwatch" (locked once a session starts).
- **Timer input** (Timer mode only, before start): free `HH:MM:SS` input with auto-formatting.
- **Circular progress display**:
  - Timer mode: progress fills as time elapses toward target.
  - Stopwatch mode: subtle rotating ring (no fill, since no target).
  - Numeric `HH:MM:SS` centered inside.
- **Tag chips** above/below circle:
  - Inline "+ Add tag" creates new tag.
  - Click chip to toggle selection for current session.
  - Selected tags stay visible while session runs.
- **Controls**: Play, Pause, End (large icon buttons).
  - Timer mode auto-ends and saves when target reached.

**Accurate time tracking** (handles tab switch, sleep, minimize):

- Store `startTimestamp` in state + localStorage on Play.
- On Pause: push `{paused_at: Date.now()}`; on Resume: complete with `resumed_at`.
- Elapsed = `(now - startTimestamp) - sum(pause durations)`.
- UI ticks via `requestAnimationFrame` / 250ms interval purely for display — actual elapsed is always recomputed from timestamps.
- On mount, hydrate any in-progress session from localStorage so refresh/sleep resumes correctly.
- On End: write to Cloud, clear localStorage.

## 3. Post-session edit dialog

Immediately after End (and from any session row in calendar drill-down):

- Editable: start time, end time, duration (auto-recalculates if start/end changed), tags.
- Save updates the row in Cloud.

## 4. Today's stats (scroll section 2)

- Total focus time today
- Sessions count today
- Mode split (Timer vs Stopwatch) — small bar
- Tag distribution — pie/donut chart

## 5. Calendar (scroll section 3)

- Monthly grid with prev/next month nav.
- Each day cell shows a small intensity dot/bar based on total focus time.
- **Click a day** → inline panel opens directly below calendar:
  - Date header, total time, sessions count, mode split, tag distribution
  - List of sessions (click any → opens edit dialog)
- **Click a week number (left of each row)** → inline panel shows weekly summary:
  - Total time, most-used tag, tag distribution bar, daily breakdown bar across 7 days
- Only one panel open at a time; smooth height animation.

## 6. All-time analytics (scroll section 4)

- Monthly summary (current month aggregated)
- Yearly summary (current year aggregated)
- All-time totals
- Metrics row:
  - Highest focus day (date + hours)
  - Total sessions
  - Average session duration
  - Longest streak (consecutive days with ≥1 session)
  - Average streak length

Charts: bar + pie via Recharts using only the 7 allowed colors (green, blue, purple, orange, red, cyan, yellow), assigned deterministically to tags by hash so each tag keeps the same color across all graphs.

## 7. UI / theme

- Strict black & white base: white background, near-black text, hairline borders, no neon.
- Typography: clean sans (Inter), generous spacing, large numerics for the timer.
- Single scrollable page (`/`) in this exact order: Focus station → Today → Calendar → All-time.
- Sticky minimal top bar with app name + auth menu.
- Fully responsive (timer circle scales, calendar collapses to compact cells on mobile).

## 8. Constraints honored

No Pomodoro, notifications, AI suggestions, or gamification. Strictly functional.

---

## Technical notes

- Stack: existing React + Vite + Tailwind + shadcn/ui. Recharts for graphs. `date-fns` for date math.
- Design tokens in `index.css`: define `--graph-green/blue/purple/orange/red/cyan/yellow` as HSL; expose via Tailwind config.
- Timer correctness: pure timestamp math, persisted to localStorage every state change so reload/sleep recovers exactly.
- All Cloud reads via React Query; mutations invalidate the relevant queries so stats update live after End/edit.
- Streak calc: derive from distinct session dates in user's local timezone.