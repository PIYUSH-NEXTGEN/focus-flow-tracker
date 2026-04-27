import { useEffect } from "react";
import type { CSSProperties } from "react";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { ThemeToggle } from "@/components/ThemeToggle";
import { TimeUnitToggle } from "@/components/TimeUnitToggle";
import { FocusStation } from "@/components/focus/FocusStation";
import { TodayStats } from "@/components/stats/TodayStats";
import { CalendarSection } from "@/components/stats/CalendarSection";
import { AllTimeStats } from "@/components/stats/AllTimeStats";
import { useScrollReveal } from "@/hooks/useScrollReveal";
import { cn } from "@/lib/utils";

export default function Index() {
  const { user, signOut } = useAuth();
  const todayReveal = useScrollReveal();
  const calendarReveal = useScrollReveal();
  const statsReveal = useScrollReveal();

  useEffect(() => {
    document.title = "Focus Meter — track your deep work";
    const desc = document.querySelector('meta[name="description"]');
    const content = "Focus Meter: a minimal timer and stopwatch for tracking deep work, with tags, calendar, and analytics.";
    if (desc) desc.setAttribute("content", content);
    else {
      const m = document.createElement("meta");
      m.name = "description";
      m.content = content;
      document.head.appendChild(m);
    }
    // canonical
    let link = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (!link) {
      link = document.createElement("link");
      link.rel = "canonical";
      document.head.appendChild(link);
    }
    link.href = window.location.origin + "/";
  }, []);

  return (
    <div className="min-h-screen">
      {/* Top bar */}
      <header className="sticky top-0 z-30 backdrop-blur-md bg-background/80 border-b border-border">
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-full bg-foreground text-background grid place-items-center font-mono-num text-[11px]">
              FM
            </div>
            <span className="font-semibold tracking-tight">Focus Meter</span>
          </div>
          <div className="flex items-center gap-3">
            <TimeUnitToggle />
            <span className="hidden sm:inline text-xs text-muted-foreground">
              {user?.email}
            </span>
            <ThemeToggle />
            <Button
              variant="ghost"
              size="icon"
              onClick={signOut}
              aria-label="Sign out"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 pb-24">
        {/* Section 1: Focus station */}
        <section className="fm-page-enter pt-12 pb-16" style={{ "--fm-delay": "0ms" } as CSSProperties}>
          <h1 className="sr-only">Focus Meter</h1>
          <FocusStation />
        </section>

        {/* Section 2: Today */}
        <section
          ref={todayReveal.ref}
          className={cn(
            "fm-page-enter fm-reveal py-10 border-t border-border",
            todayReveal.isVisible && "fm-reveal-visible"
          )}
          style={{ "--fm-delay": "120ms" } as CSSProperties}
        >
          <SectionHeading
            eyebrow="Today"
            title={new Date().toLocaleDateString(undefined, {
              weekday: "long",
              month: "long",
              day: "numeric",
            })}
          />
          <TodayStats />
        </section>

        {/* Section 3: Calendar */}
        <section
          ref={calendarReveal.ref}
          className={cn(
            "fm-page-enter fm-reveal py-10 border-t border-border",
            calendarReveal.isVisible && "fm-reveal-visible"
          )}
          style={{ "--fm-delay": "220ms" } as CSSProperties}
        >
          <SectionHeading eyebrow="Calendar" title="Browse your history" />
          <CalendarSection />
        </section>

        {/* Section 4: All-time */}
        <section
          ref={statsReveal.ref}
          className={cn(
            "fm-page-enter fm-reveal py-10 border-t border-border",
            statsReveal.isVisible && "fm-reveal-visible"
          )}
          style={{ "--fm-delay": "300ms" } as CSSProperties}
        >
          <SectionHeading eyebrow="Stats" title="All-time analytics" />
          <AllTimeStats />
        </section>
      </main>
    </div>
  );
}

function SectionHeading({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div className="mb-6">
      <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
        {eyebrow}
      </div>
      <h2 className="mt-1 text-2xl font-semibold tracking-tight">{title}</h2>
    </div>
  );
}
