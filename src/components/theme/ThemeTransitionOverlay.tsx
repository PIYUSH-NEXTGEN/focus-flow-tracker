import { Moon, Sun } from "lucide-react";
import type { CSSProperties } from "react";

type ThemeMode = "light" | "dark";

type ThemeTransitionOverlayProps = {
  open: boolean;
  targetTheme: ThemeMode;
  particleCount: number;
};

const SUN_COLORS = ["#FACC15", "#FCD34D", "#EAB308"];
const MOON_COLORS = ["#60A5FA", "#818CF8", "#A78BFA"];

const PARTICLE_DISTANCE = 130;

function createParticles(count: number, targetTheme: ThemeMode) {
  const palette = targetTheme === "dark" ? MOON_COLORS : SUN_COLORS;

  return Array.from({ length: count }, (_, idx) => {
    const angle = (Math.PI * 2 * idx) / count;
    const distance = PARTICLE_DISTANCE + (idx % 4) * 10;
    const size = 4 + (idx % 3);
    const x = Math.cos(angle) * distance;
    const y = Math.sin(angle) * distance;

    return {
      id: idx,
      x,
      y,
      size,
      color: palette[idx % palette.length],
      delay: (idx % 8) * 10,
    };
  });
}

export function ThemeTransitionOverlay({
  open,
  targetTheme,
  particleCount,
}: ThemeTransitionOverlayProps) {
  if (!open) return null;

  const particles = createParticles(particleCount, targetTheme);
  const isDarkTarget = targetTheme === "dark";

  return (
    <div
      className="theme-transition-overlay"
      aria-hidden="true"
      role="presentation"
    >
      <div className="theme-transition-center">
        <div className="theme-transition-icon-wrap">
          {isDarkTarget ? (
            <Moon className="theme-transition-icon" />
          ) : (
            <Sun className="theme-transition-icon" />
          )}
        </div>

        <div className="theme-transition-particles">
          {particles.map((particle) => (
            <span
              key={particle.id}
              className="theme-transition-particle"
              style={
                {
                  "--tx": `${particle.x}px`,
                  "--ty": `${particle.y}px`,
                  "--size": `${particle.size}px`,
                  "--particle-color": particle.color,
                  "--particle-delay": `${particle.delay}ms`,
                } as CSSProperties
              }
            />
          ))}
        </div>
      </div>
    </div>
  );
}
