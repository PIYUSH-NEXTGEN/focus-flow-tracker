import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { useThemeTransition } from "@/components/theme/ThemeTransitionProvider";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const { isAnimating, startThemeTransition } = useThemeTransition();

  // Prevent hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  const isDark = theme === "dark";
  const targetTheme = isDark ? "light" : "dark";

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => startThemeTransition(targetTheme, setTheme)}
      disabled={isAnimating}
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
    >
      {isDark ? (
        <Sun className="h-5 w-5" />
      ) : (
        <Moon className="h-5 w-5" />
      )}
    </Button>
  );
}
