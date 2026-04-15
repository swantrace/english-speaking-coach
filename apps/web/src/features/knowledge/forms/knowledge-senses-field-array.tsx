import { Button } from "@english-coach/ui";
import type { Control } from "react-hook-form";
import { useFieldArray } from "react-hook-form";
import type { KnowledgeFormValues } from "../types";
import { KnowledgeSenseCard } from "./knowledge-sense-card";

interface KnowledgeSensesFieldArrayProps {
  control: Control<KnowledgeFormValues>;
}

export function KnowledgeSensesFieldArray({ control }: KnowledgeSensesFieldArrayProps) {
  const { append, fields, remove } = useFieldArray({
    control,
    keyName: "fieldId",
    name: "senses",
  });

  return (
    <div className="space-y-4">
      {fields.map((field, index) => (
        <KnowledgeSenseCard
          control={control}
          index={index}
          isRemovable={fields.length > 1}
          key={field.fieldId}
          onRemove={() => remove(index)}
        />
      ))}

      <Button
        onClick={() =>
          append({
            example: "",
            exampleZh: "",
            grammaticalNote: "",
            meaningEn: "",
            meaningZh: "",
            order: fields.length + 1,
          })
        }
        type="button"
        variant="outline"
      >
        Add sense
      </Button>
    </div>
  );
}
