// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { FreeformSideContent } from "./freeform-side-content";

describe("FreeformSideContent", () => {
  it("renders Markdown context instead of displaying source syntax", () => {
    const { container } = render(
      <FreeformSideContent
        context={{ content: "## Discussion topic\n\n- fluency\n- vocabulary", summary: "Discussion topic" }}
      />,
    );

    expect(screen.getByRole("heading", { name: "Discussion topic", level: 2 })).toBeTruthy();
    expect(container.textContent).not.toContain("## Discussion topic");
  });

  it("shows legacy HTML as clean text without visible tags", () => {
    const { container } = render(
      <FreeformSideContent
        context={{ content: "<p>Discuss <strong>remote work</strong>.</p>", summary: "Remote work" }}
      />,
    );

    expect(container.textContent).toContain("Discuss remote work.");
    expect(container.textContent).not.toContain("<strong>");
  });
});
