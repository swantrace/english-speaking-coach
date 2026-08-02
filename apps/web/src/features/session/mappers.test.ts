import type { HistoryDetailResponse } from "@english-coach/contract/session";
import { describe, expect, it } from "vitest";
import {
  createFreeFormSessionSummary,
  isLegacyHtmlContext,
  mapFreeFormSessionFormInputToRequest,
  mapSessionHistoryDetailToRepeatInput,
} from "./mappers";

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

describe("repeating a completed session", () => {
  it("reuses the exact free-form Markdown context", () => {
    const content = "## Interview practice\n\nAsk follow-up questions.";
    const detail = {
      contextDocument: content,
      session: { sessionType: "free-form" },
    } as HistoryDetailResponse;

    expect(mapSessionHistoryDetailToRepeatInput(detail)).toEqual({
      input: { content },
      sessionType: "free-form",
    });
  });

  it("reuses the role-play scenario and selected character", () => {
    const detail = {
      session: {
        scenarioId: "scenario-1",
        selectedCharacterIndex: 1,
        sessionType: "role-play",
      },
    } as HistoryDetailResponse;

    expect(mapSessionHistoryDetailToRepeatInput(detail)).toEqual({
      input: { scenarioId: "scenario-1", selectedCharacterIndex: 1 },
      sessionType: "role-play",
    });
  });

  it("rejects history records whose original setup is unavailable", () => {
    expect(() =>
      mapSessionHistoryDetailToRepeatInput({
        session: { scenarioId: null, selectedCharacterIndex: null, sessionType: "role-play" },
      } as HistoryDetailResponse),
    ).toThrow("original role-play setup");
  });
});
