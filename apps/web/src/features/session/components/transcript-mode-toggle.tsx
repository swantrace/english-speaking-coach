import { Button, cn } from "@english-coach/ui";

export type TranscriptMode = "original" | "refined";

interface TranscriptModeToggleProps {
  mode: TranscriptMode;
  onModeChange: (mode: TranscriptMode) => void;
}

export function TranscriptModeToggle({ mode, onModeChange }: TranscriptModeToggleProps) {
  return (
    <div className="inline-flex rounded-full border border-stone-200 bg-stone-100 p-1">
      {(["original", "refined"] as const).map((value) => {
        const isActive = value === mode;

        return (
          <Button
            className={cn(
              "rounded-full px-4",
              isActive ? "bg-white text-slate-950 shadow-sm hover:bg-white" : "text-slate-600 hover:text-slate-900",
            )}
            key={value}
            onClick={() => onModeChange(value)}
            size="sm"
            type="button"
            variant="ghost"
          >
            {value === "original" ? "Original" : "Refined"}
          </Button>
        );
      })}
    </div>
  );
}
