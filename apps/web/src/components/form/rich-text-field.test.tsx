// @vitest-environment jsdom

import { Form } from "@english-coach/ui";
import { fireEvent, render, screen } from "@testing-library/react";
import { useForm } from "react-hook-form";
import { describe, expect, it } from "vitest";
import { RichTextField } from "./rich-text-field";

interface TestFormValues {
  content: string;
}

function TestForm() {
  const form = useForm<TestFormValues>({
    defaultValues: { content: "## Original topic\n\nDiscuss **remote work**." },
  });

  return (
    <Form {...form}>
      <RichTextField control={form.control} label="Practice context" name="content" />
      <output aria-label="Stored value">{form.watch("content")}</output>
    </Form>
  );
}

describe("RichTextField", () => {
  it("lets the user edit the canonical Markdown source", () => {
    render(<TestForm />);

    fireEvent.click(screen.getByRole("button", { name: "Markdown" }));
    const source = screen.getByRole("textbox", { name: "Markdown source" });
    expect((source as HTMLTextAreaElement).value).toContain("## Original topic");

    const nextMarkdown = "## New topic\n\n- fluency\n- vocabulary";
    fireEvent.change(source, { target: { value: nextMarkdown } });
    expect(screen.getByLabelText("Stored value").textContent).toBe(nextMarkdown);

    fireEvent.click(screen.getByRole("button", { name: "Visual" }));
    expect(screen.queryByRole("textbox", { name: "Markdown source" })).toBeNull();
  });
});
