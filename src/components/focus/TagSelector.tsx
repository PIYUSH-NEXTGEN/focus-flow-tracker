import { useState } from "react";
import { Plus, X, Loader2 } from "lucide-react";
import { useCreateTag, useTags } from "@/hooks/useFocusData";
import { colorForTag } from "@/lib/focus";
import { cn } from "@/lib/utils";

interface Props {
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  /** When true, chips are display-only (no toggle). */
  readOnly?: boolean;
  size?: "sm" | "md";
}

export function TagSelector({ selectedIds, onChange, readOnly, size = "md" }: Props) {
  const { data: tags = [] } = useTags();
  const createTag = useCreateTag();
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");

  const toggle = (id: string) => {
    if (readOnly) return;
    if (selectedIds.includes(id)) onChange(selectedIds.filter((x) => x !== id));
    else onChange([...selectedIds, id]);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setAdding(false);
      return;
    }
    try {
      const created = await createTag.mutateAsync(trimmed);
      onChange([...selectedIds, created.id]);
      setName("");
      setAdding(false);
    } catch {
      // toast handled by caller if needed
    }
  };

  const padX = size === "sm" ? "px-2.5" : "px-3";
  const padY = size === "sm" ? "py-1" : "py-1.5";
  const text = size === "sm" ? "text-xs" : "text-sm";

  return (
    <div className="flex flex-wrap items-center gap-2 justify-center">
      {tags.map((t) => {
        const selected = selectedIds.includes(t.id);
        return (
          <button
            key={t.id}
            type="button"
            onClick={() => toggle(t.id)}
            disabled={readOnly}
            className={cn(
              "fm-tag-chip inline-flex items-center gap-1.5 rounded-full border",
              padX, padY, text,
              selected
                ? "fm-tag-chip-selected bg-foreground text-background border-foreground"
                : "fm-tag-chip-unselected bg-background text-foreground border-border hover:border-foreground/40",
              readOnly && "cursor-default"
            )}
          >
            <span
              className="h-1.5 w-1.5 rounded-full"
              style={{ background: colorForTag(t.name) }}
            />
            {t.name}
          </button>
        );
      })}

      {!readOnly && (
        adding ? (
          <form onSubmit={submit} className="inline-flex items-center">
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={submit}
              placeholder="tag name"
              className={cn(
                "rounded-full border border-foreground bg-background outline-none",
                padX, padY, text, "w-28"
              )}
            />
          </form>
        ) : (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className={cn(
              "fm-interactive inline-flex items-center gap-1 rounded-full border border-dashed border-border text-muted-foreground hover:text-foreground hover:border-foreground/40",
              padX, padY, text
            )}
          >
            {createTag.isPending ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Plus className="h-3 w-3" />
            )}
            tag
          </button>
        )
      )}
    </div>
  );
}
