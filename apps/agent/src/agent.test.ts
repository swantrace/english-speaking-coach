import type { Scenario, SessionAgentBootstrap, SessionCompletionJob } from "@english-coach/contract";
import { llm } from "@livekit/agents";
import { beforeEach, describe, expect, it, vi } from "vitest";

const dependencyMocks = vi.hoisted(() => ({
  addInConversationAnalysisJob: vi.fn(),
  addSessionCompletionJob: vi.fn(),
  fetchSessionBootstrapFromBackend: vi.fn(),
}));

vi.mock("./agent/runtime-services", () => ({
  analysisTurnThreshold: 2,
  fetchSessionBootstrapFromBackend: dependencyMocks.fetchSessionBootstrapFromBackend,
  inConversationAnalysisQueue: {
    add: dependencyMocks.addInConversationAnalysisJob,
  },
  sessionCompletionQueue: {
    add: dependencyMocks.addSessionCompletionJob,
  },
}));

import { Agent } from "./agent";
import { withLatestWorkerFeedback } from "./agent/free-form";
import { prepareAgent } from "./agent/prepare-agent";
import { createRolePlayInstructions, SessionTracker } from "./agent/role-play";
import { toSessionTurns } from "./agent/session-turns";

const scenario: Scenario = {
  characters: [
    { description: "The learner ordering food.", name: "Customer" },
    { description: "A waiter taking the order.", name: "Waiter" },
  ],
  createdAt: new Date().toISOString(),
  exampleDialogue: [
    { characterIndex: 1 as const, text: "Good evening. Are you ready to order?" },
    { characterIndex: 0 as const, text: "Yes, I'd like the pasta." },
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
  reviewStatus: "approved",
  reviewedAt: null,
  reviewedByUserId: null,
  setting: "A small neighborhood restaurant.",
  source: "admin",
  submissionId: null,
  title: "Restaurant practice",
  updatedAt: new Date().toISOString(),
};

const freeFormBootstrap: Extract<SessionAgentBootstrap, { sessionType: "free-form" }> = {
  contextDocument: "Discuss dinner plans.",
  freeFormContextId: "context-1",
  roomName: "room-1",
  sessionHistoryId: "history-1",
  sessionType: "free-form",
  userId: "user-1",
};

const rolePlayBootstrap: Extract<SessionAgentBootstrap, { sessionType: "role-play" }> = {
  roomName: "room-2",
  scenario,
  selectedCharacterIndex: 0,
  sessionHistoryId: "history-2",
  sessionType: "role-play",
  userId: "user-2",
};

beforeEach(() => {
  dependencyMocks.addInConversationAnalysisJob.mockReset();
  dependencyMocks.addSessionCompletionJob.mockReset();
  dependencyMocks.fetchSessionBootstrapFromBackend.mockReset();
});

describe("SessionTracker", () => {
  it("marks a goal complete when its intent and slots are satisfied", () => {
    const tracker = new SessionTracker(scenario);

    tracker.advance("order_food", { dish_name: "pasta" });

    expect(tracker.getCompletedGoalIds()).toEqual(["order-dish"]);
    expect(tracker.toGoalProgressPacket(3).currentGoalId).toBe("ask-for-bill");
    expect(tracker.toGoalProgressPacket(3).transcriptTurnIndex).toBe(3);
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

  it("includes explicit slot extraction guidance in role-play instructions", () => {
    const tracker = new SessionTracker(scenario);
    const instructions = createRolePlayInstructions(
      {
        ...rolePlayBootstrap,
        publishGoalProgress: async () => {},
      },
      tracker,
    );

    expect(instructions).toContain("Extract slot values from the learner's natural wording");
    expect(instructions).toContain("[ACTIVE_GOAL_SCHEMA]");
    expect(instructions).toContain("Goal: Order a dish");
    expect(instructions).toContain("Required intents: order_food");
    expect(instructions).toContain("Required slots: dish_name");
    expect(instructions).toContain("Current goal intent names: order_food");
    expect(instructions).toContain("Current goal slot names: dish_name");
    expect(instructions).toContain("May I have a cup of mocha?");
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

describe("toSessionTurns", () => {
  it("extracts only user and assistant message turns from chat context", () => {
    const chatContext = new llm.ChatContext();

    chatContext.addMessage({ content: "System note", role: "system" });
    chatContext.addMessage({ content: "Hello coach.", createdAt: 1, role: "user" });
    chatContext.addMessage({ content: "Hello learner.", createdAt: 2, role: "assistant" });

    expect(toSessionTurns(chatContext)).toEqual([
      { speaker: "user", text: "Hello coach.", timestampMs: 1 },
      { speaker: "assistant", text: "Hello learner.", timestampMs: 2 },
    ]);
  });
});

describe("Agent analysis", () => {
  it("enqueues in-conversation analysis after the threshold and assistant reply", async () => {
    const agent = new Agent(freeFormBootstrap);
    dependencyMocks.addInConversationAnalysisJob.mockResolvedValue(undefined);

    const initialContext = agent.chatCtx.copy();
    initialContext.addMessage({ content: "Hi", createdAt: 1, role: "user" });
    initialContext.addMessage({ content: "Hello", createdAt: 2, role: "assistant" });
    initialContext.addMessage({ content: "I want pasta", createdAt: 3, role: "user" });
    await agent.updateChatCtx(initialContext);

    expect(await agent.analyzeTurns(0)).toBe(0);
    expect(dependencyMocks.addInConversationAnalysisJob).not.toHaveBeenCalled();

    const nextContext = agent.chatCtx.copy();
    nextContext.addMessage({ content: "What kind of pasta?", createdAt: 4, role: "assistant" });
    await agent.updateChatCtx(nextContext);

    expect(await agent.analyzeTurns(0)).toBe(4);
    expect(dependencyMocks.addInConversationAnalysisJob).toHaveBeenCalledWith(
      "inConversationAnalysis",
      {
        roomName: "room-1",
        sessionHistoryId: "history-1",
        transcriptStartIndex: 0,
        turns: [
          { speaker: "user", text: "Hi", timestampMs: 1 },
          { speaker: "assistant", text: "Hello", timestampMs: 2 },
          { speaker: "user", text: "I want pasta", timestampMs: 3 },
          { speaker: "assistant", text: "What kind of pasta?", timestampMs: 4 },
        ],
      },
      {
        removeOnComplete: true,
      },
    );
    expect(dependencyMocks.addSessionCompletionJob).not.toHaveBeenCalled();
  });

  it("only sends the remaining free-form turns during session completion", async () => {
    const agent = new Agent(freeFormBootstrap);
    dependencyMocks.addSessionCompletionJob.mockResolvedValue(undefined);

    const chatContext = agent.chatCtx.copy();
    chatContext.addMessage({ content: "Earlier turn", createdAt: 1, role: "user" });
    chatContext.addMessage({ content: "Recent reply", createdAt: 2, role: "assistant" });
    chatContext.addMessage({ content: "Newest user turn", createdAt: 3, role: "user" });
    await agent.updateChatCtx(chatContext);

    await agent.analyzeSession(2);

    expect(dependencyMocks.addSessionCompletionJob).toHaveBeenCalledWith(
      "sessionCompletion",
      {
        completedGoals: [],
        roomName: "room-1",
        sessionHistoryId: "history-1",
        transcript: [{ speaker: "user", text: "Newest user turn", timestampMs: 3 }],
      },
      { jobId: "sessionCompletion-history-1", removeOnComplete: true },
    );
  });
});

describe("prepareAgent", () => {
  it("publishes initial role-play goal progress after the local participant becomes available", async () => {
    dependencyMocks.fetchSessionBootstrapFromBackend.mockResolvedValue(rolePlayBootstrap);

    let localParticipant:
      | {
          publishData: ReturnType<typeof vi.fn>;
        }
      | undefined;

    const agent = await prepareAgent(
      JSON.stringify({ sessionHistoryId: "history-2" }),
      () => localParticipant as never,
    );

    localParticipant = {
      publishData: vi.fn().mockResolvedValue(undefined),
    };

    await agent.publishInitialGoalProgress();

    expect(localParticipant.publishData).toHaveBeenCalledWith(
      expect.any(Uint8Array),
      expect.objectContaining({ reliable: true, topic: "goal-progress" }),
    );
  });
});
