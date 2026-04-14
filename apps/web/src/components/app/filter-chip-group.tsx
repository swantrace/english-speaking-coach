import { Badge, Button, cn } from "@english-coach/ui";

interface FilterChipGroupProps {
  options: string[];
  selectedValues: string[];
  onToggle: (value: string) => void;
}

export function FilterChipGroup({ options, selectedValues, onToggle }: FilterChipGroupProps) {
  const selectedValueSet = new Set(selectedValues);

  return (
    <div className="flex flex-wrap gap-2">
      {options.map((option) => {
        const isSelected = selectedValueSet.has(option);

        return (
          <Button
            className={cn("rounded-full px-3", isSelected ? "border-transparent" : "border-stone-200")}
            key={option}
            onClick={() => onToggle(option)}
            size="sm"
            type="button"
            variant={isSelected ? "default" : "outline"}
          >
            <Badge className="bg-transparent p-0 text-inherit shadow-none" variant="outline">
              {option}
            </Badge>
          </Button>
        );
      })}
    </div>
  );
}
