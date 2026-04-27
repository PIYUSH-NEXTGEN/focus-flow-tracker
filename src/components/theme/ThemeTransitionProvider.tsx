import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { ThemeTransitionOverlay } from "@/components/theme/ThemeTransitionOverlay";

type ThemeMode = "light" | "dark";
type ApplyThemeFn = (targetTheme: ThemeMode) => void;

const ANIMATION_TOTAL_MS = 650;
const PARTICLE_COUNT = 32;

type ThemeTransitionContextValue = {
  isAnimating: boolean;
  startThemeTransition: (targetTheme: ThemeMode, applyTheme: ApplyThemeFn) => void;
};

const ThemeTransitionContext = createContext<ThemeTransitionContextValue | null>(null);

export function ThemeTransitionProvider({ children }: { children: ReactNode }) {
  const [isAnimating, setIsAnimating] = useState(false);
  const [targetTheme, setTargetTheme] = useState<ThemeMode>("dark");
  const timeoutRef = useRef<number | null>(null);

  const clearTimer = useCallback(() => {
    if (timeoutRef.current !== null) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      clearTimer();
    };
  }, [clearTimer]);

  const startThemeTransition = useCallback(
    (nextTheme: ThemeMode, applyTheme: ApplyThemeFn) => {
      if (isAnimating) return;

      setTargetTheme(nextTheme);
      setIsAnimating(true);
      clearTimer();

      timeoutRef.current = window.setTimeout(() => {
        applyTheme(nextTheme);
        setIsAnimating(false);
        timeoutRef.current = null;
      }, ANIMATION_TOTAL_MS);
    },
    [clearTimer, isAnimating]
  );

  return (
    <ThemeTransitionContext.Provider value={{ isAnimating, startThemeTransition }}>
      {children}
      <ThemeTransitionOverlay
        open={isAnimating}
        targetTheme={targetTheme}
        particleCount={PARTICLE_COUNT}
      />
    </ThemeTransitionContext.Provider>
  );
}

export function useThemeTransition() {
  const context = useContext(ThemeTransitionContext);

  if (!context) {
    throw new Error("useThemeTransition must be used within ThemeTransitionProvider");
  }

  return context;
}
