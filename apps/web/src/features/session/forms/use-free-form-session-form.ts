import { useForm } from "react-hook-form";
import { freeFormSessionFormResolver } from "../schemas";
import type { FreeFormSessionFormValues } from "../types";

export function useFreeFormSessionForm() {
  return useForm<FreeFormSessionFormValues>({
    defaultValues: {
      content: "",
    },
    mode: "onBlur",
    resolver: freeFormSessionFormResolver,
  });
}
