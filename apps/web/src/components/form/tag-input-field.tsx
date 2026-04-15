import { Badge, Button, FormControl, FormField, FormItem, FormLabel, FormMessage, Input } from "@english-coach/ui";
import { useState } from "react";
import type { Control, FieldPath, FieldPathValue, FieldValues } from "react-hook-form";

function normalizeTokens(value: string[]) {
  return [...new Set(value.map((item) => item.trim()).filter(Boolean))];
}

interface TagInputFieldProps<TFieldValues extends FieldValues> {
  control: Control<TFieldValues>;
  description?: string;
  label: string;
  name: FieldPath<TFieldValues>;
  placeholder?: string;
}

export function TagInputField<TFieldValues extends FieldValues>({
  control,
  description,
  label,
  name,
  placeholder = "Type a value and press Enter",
}: TagInputFieldProps<TFieldValues>) {
  const [draftValue, setDraftValue] = useState("");

  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => {
        const value = Array.isArray(field.value) ? (field.value as string[]) : [];

        function commitDraft(rawValue: string) {
          const nextValue = rawValue.trim();

          if (!nextValue) {
            return;
          }

          field.onChange(
            normalizeTokens([...value, nextValue]) as FieldPathValue<TFieldValues, FieldPath<TFieldValues>>,
          );
          setDraftValue("");
        }

        function removeToken(token: string) {
          field.onChange(
            value.filter((item) => item !== token) as FieldPathValue<TFieldValues, FieldPath<TFieldValues>>,
          );
        }

        return (
          <FormItem>
            <FormLabel>{label}</FormLabel>
            {description ? <p className="text-sm text-slate-500">{description}</p> : null}
            <FormControl>
              <div className="space-y-3">
                <Input
                  onBlur={() => commitDraft(draftValue)}
                  onChange={(event) => setDraftValue(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key !== "Enter" && event.key !== ",") {
                      return;
                    }

                    event.preventDefault();
                    commitDraft(draftValue);
                  }}
                  placeholder={placeholder}
                  type="text"
                  value={draftValue}
                />

                {value.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {value.map((token) => (
                      <Badge className="gap-2 rounded-full px-3 py-1 text-sm" key={token} variant="outline">
                        <span>{token}</span>
                        <Button
                          className="h-auto px-0 text-xs"
                          onClick={() => removeToken(token)}
                          size="sm"
                          type="button"
                          variant="ghost"
                        >
                          Remove
                        </Button>
                      </Badge>
                    ))}
                  </div>
                ) : null}
              </div>
            </FormControl>
            <FormMessage />
          </FormItem>
        );
      }}
    />
  );
}
