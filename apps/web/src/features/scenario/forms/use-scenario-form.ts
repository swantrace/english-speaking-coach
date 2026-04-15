import { useMemo } from "react";
import { useForm } from "react-hook-form";
import { createEmptyScenarioFormValues } from "../mappers";
import { scenarioFormResolver } from "../schemas";
import type { ScenarioFormValues } from "../types";

export function useScenarioForm(defaultValues?: ScenarioFormValues) {
  const resolvedDefaults = useMemo(() => defaultValues ?? createEmptyScenarioFormValues(), [defaultValues]);

  return useForm<ScenarioFormValues>({
    defaultValues: resolvedDefaults,
    mode: "onBlur",
    resolver: scenarioFormResolver,
  });
}
