import { describe, expect, it } from "vitest";
import { createFreeFormSessionSummary, isLegacyHtmlContext, mapFreeFormSessionFormInputToRequest } from "./mappers";

describe("free-form Markdown context", () => {
  it("keeps Markdown as the canonical API value", () => {
    const content = "## Topic\n\nDiscuss **remote work**.\n\n- productivity\n- collaboration";

    expect(mapFreeFormSessionFormInputToRequest({ content })).toEqual({
      contextDocument: content,
      sessionType: "free-form",
      summary: "Topic\n\nDiscuss remote work.\n\nproductivity\ncollaboration",
    });
  });

  it("creates readable summaries from pasted Markdown links and quotes", () => {
    expect(createFreeFormSessionSummary("> Read [this article](https://example.com) and discuss `trade-offs`.")).toBe(
      "Read this article and discuss trade-offs.",
    );
  });

  it("detects legacy HTML without treating Markdown angle brackets as HTML", () => {
    expect(isLegacyHtmlContext("<p>Legacy <strong>context</strong></p>")).toBe(true);
    expect(isLegacyHtmlContext("Use <verb> after **might**.")).toBe(false);
  });
});
