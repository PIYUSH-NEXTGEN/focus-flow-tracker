import { useTimeUnit } from "@/hooks/useTimeUnit";
import { Button } from "@/components/ui/button";

export function TimeUnitToggle() {
  const [unit, setUnit] = useTimeUnit();

  return (
    <div className="flex gap-1 rounded-lg bg-muted p-1">
      <Button
        variant={unit === "minutes" ? "default" : "ghost"}
        size="sm"
        onClick={() => setUnit("minutes")}
        className="text-xs"
      >
        Minutes
      </Button>
      <Button
        variant={unit === "hours" ? "default" : "ghost"}
        size="sm"
        onClick={() => setUnit("hours")}
        className="text-xs"
      >
        Hours
      </Button>
    </div>
  );
}
