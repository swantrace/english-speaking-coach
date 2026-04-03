import type { Scenario } from "@english-coach/contract";
import { llm } from "@livekit/agents";
import { describe, expect, it } from "vitest";

import { SessionTracker, withLatestWorkerFeedback } from "./agent";

const scenario: Scenario = {
  characters: [
    { description: "The learner ordering food.", name: "Customer" },
    { description: "A waiter taking the order.", name: "Waiter" },
  ],
  createdAt: new Date().toISOString(),
  exampleDialogue: [
    { speaker: "agent" as const, text: "Good evening. Are you ready to order?" },
    { speaker: "user" as const, text: "Yes, I'd like the pasta." },
  ],
  goals: {
    goals: [
      {
        description: "Order a dish",
        id: "order-dish",
        logic: {
          required_intents: ["order_food"],
          required_slots: ["dish_name"],
        },
      },
      {
        description: "Ask for the bill",
        id: "ask-for-bill",
        logic: {
          required_intents: ["request_bill"],
          required_slots: [],
        },
      },
    ],
    intents: ["order_food", "request_bill"],
    slots: ["dish_name"],
  },
  id: "scenario-1",
  setting: "A small neighborhood restaurant.",
  title: "Restaurant practice",
  updatedAt: new Date().toISOString(),
};

describe("SessionTracker", () => {
  it("marks a goal complete when its intent and slots are satisfied", () => {
    const tracker = new SessionTracker(scenario);

    tracker.advance("order_food", { dish_name: "pasta" });

    expect(tracker.getCompletedGoalIds()).toEqual(["order-dish"]);
    expect(tracker.toGoalProgressPacket().currentGoalId).toBe("ask-for-bill");
  });

  it("renders remaining slots for the active goal", () => {
    const tracker = new SessionTracker(scenario);

    expect(tracker.renderCurrentStatus()).toContain("Remaining Slots: dish_name");
  });

  it("returns a wrap-up hint when all goals are complete", () => {
    const tracker = new SessionTracker(scenario);

    tracker.advance("order_food", { dish_name: "pasta" });
    tracker.advance("request_bill", {});

    expect(tracker.createHint("request_bill", {})).toContain("All scenario goals are complete");
  });
});

describe("withLatestWorkerFeedback", () => {
  it("replaces older worker feedback messages and keeps the rest of the chat context", () => {
    const chatContext = new llm.ChatContext();

    chatContext.addMessage({
      content: "Keep the learner talking.",
      role: "system",
    });
    chatContext.addMessage({
      content: "Hello coach.",
      role: "user",
    });
    chatContext.addMessage({
      content: "[WORKER_FEEDBACK]\nAsk a follow-up question.",
      role: "system",
    });

    const updatedContext = withLatestWorkerFeedback(chatContext, "Focus on specificity.");

    const messageItems = updatedContext.items.flatMap((item) =>
      item.type === "message" ? [{ role: item.role, text: item.textContent }] : [],
    );

    expect(messageItems).toEqual([
      { role: "system", text: "Keep the learner talking." },
      { role: "user", text: "Hello coach." },
      { role: "system", text: "[WORKER_FEEDBACK]\nFocus on specificity." },
    ]);
  });
});
