import { useMemo } from "react";
import { useForm } from "react-hook-form";
import { createEmptyKnowledgeFormValues } from "../mappers";
import { knowledgeFormResolver } from "../schemas";
import type { KnowledgeFormValues } from "../types";

export function useKnowledgeForm(defaultValues?: KnowledgeFormValues) {
  const resolvedDefaults = useMemo(() => defaultValues ?? createEmptyKnowledgeFormValues(), [defaultValues]);

  return useForm<KnowledgeFormValues>({
    defaultValues: resolvedDefaults,
    mode: "onBlur",
    resolver: knowledgeFormResolver,
  });
}
