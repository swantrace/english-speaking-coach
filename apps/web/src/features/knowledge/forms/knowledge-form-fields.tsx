import { communicativeFunctionValues, fixednessLevelValues, patternTypeValues } from "@english-coach/domain";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@english-coach/ui";
import type { Control } from "react-hook-form";
import { FormSection } from "@/components/form/form-section";
import { SwitchField } from "@/components/form/switch-field";
import { TextField } from "@/components/form/text-field";
import { formatCommunicativeFunction, formatFixednessLevel, formatPatternType } from "@/lib/format";
import type { KnowledgeFormValues } from "../types";
import { KnowledgeSensesFieldArray } from "./knowledge-senses-field-array";

interface EnumSelectFieldProps {
  control: Control<KnowledgeFormValues>;
  label: string;
  name: "communicativeFunction" | "fixednessLevel" | "patternType";
  options: readonly string[];
  placeholder: string;
  renderLabel: (value: string) => string;
}

function EnumSelectField({ control, label, name, options, placeholder, renderLabel }: EnumSelectFieldProps) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{label}</FormLabel>
          <Select
            onValueChange={(value) => field.onChange(value === "__none__" ? "" : value)}
            value={field.value || "__none__"}
          >
            <FormControl>
              <SelectTrigger className="bg-white">
                <SelectValue placeholder={placeholder} />
              </SelectTrigger>
            </FormControl>
            <SelectContent>
              <SelectItem value="__none__">Not set</SelectItem>
              {options.map((option) => (
                <SelectItem key={option} value={option}>
                  {renderLabel(option)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

export function KnowledgeFormFields({ control }: { control: Control<KnowledgeFormValues> }) {
  return (
    <>
      <FormSection
        description="Capture the true knowledge-item structure used by admin review, including taxonomy and review visibility."
        title="Knowledge basics"
      >
        <div className="grid gap-4 lg:grid-cols-2">
          <TextField control={control} label="Pattern" name="pattern" placeholder="be supposed to <v>" />
          <SwitchField
            control={control}
            description="Pending-review items stay out of downstream learner-facing views until approved."
            label="Keep pending review"
            name="isPendingReview"
          />
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <EnumSelectField
            control={control}
            label="Pattern type"
            name="patternType"
            options={patternTypeValues}
            placeholder="Select pattern type"
            renderLabel={(value) => formatPatternType(value as (typeof patternTypeValues)[number])}
          />
          <EnumSelectField
            control={control}
            label="Fixedness level"
            name="fixednessLevel"
            options={fixednessLevelValues}
            placeholder="Select fixedness level"
            renderLabel={(value) => formatFixednessLevel(value as (typeof fixednessLevelValues)[number])}
          />
          <EnumSelectField
            control={control}
            label="Communicative function"
            name="communicativeFunction"
            options={communicativeFunctionValues}
            placeholder="Select communicative function"
            renderLabel={(value) => formatCommunicativeFunction(value as (typeof communicativeFunctionValues)[number])}
          />
        </div>
      </FormSection>

      <FormSection
        description="Each sense keeps meaning, example, and optional grammatical guidance grouped together so create and edit stay consistent."
        title="Senses"
      >
        <KnowledgeSensesFieldArray control={control} />
      </FormSection>
    </>
  );
}
