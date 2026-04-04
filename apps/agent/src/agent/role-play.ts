import { type GoalProgressPacket, goalProgressPacketSchema, type Scenario } from "@english-coach/contract";

import type { RolePlayRuntimeConfig } from "./types";

type GoalState = {
  filledSlots: Record<string, string>;
  matchedIntents: Set<string>;
};

export class SessionTracker {
  private readonly goalStates = new Map<string, GoalState>();
  private readonly completedGoalIds = new Set<string>();

  constructor(private readonly scenario: Scenario) {
    for (const goal of scenario.goals.goals) {
      this.goalStates.set(goal.id, {
        filledSlots: {},
        matchedIntents: new Set<string>(),
      });
    }
  }

  getCurrentGoal() {
    return this.scenario.goals.goals.find((goal) => !this.completedGoalIds.has(goal.id)) ?? null;
  }

  getCompletedGoalIds() {
    return [...this.completedGoalIds];
  }

  getFilledSlotsForCurrentGoal() {
    const currentGoal = this.getCurrentGoal();

    if (!currentGoal) {
      return {};
    }

    return { ...(this.goalStates.get(currentGoal.id)?.filledSlots ?? {}) };
  }

  advance(intent: string, slots: Record<string, string>) {
    const currentGoal = this.getCurrentGoal();

    if (!currentGoal) {
      return;
    }

    const currentState = this.goalStates.get(currentGoal.id);

    if (!currentState) {
      throw new Error(`Missing runtime state for goal ${currentGoal.id}`);
    }

    if (currentGoal.logic.required_intents.includes(intent)) {
      currentState.matchedIntents.add(intent);
    }

    for (const requiredSlot of currentGoal.logic.required_slots) {
      const candidateValue = slots[requiredSlot]?.trim();

      if (candidateValue) {
        currentState.filledSlots[requiredSlot] = candidateValue;
      }
    }

    const hasRequiredIntents = currentGoal.logic.required_intents.every((requiredIntent) =>
      currentState.matchedIntents.has(requiredIntent),
    );
    const hasRequiredSlots = currentGoal.logic.required_slots.every((requiredSlot) =>
      Boolean(currentState.filledSlots[requiredSlot]),
    );

    if (hasRequiredIntents && hasRequiredSlots) {
      this.completedGoalIds.add(currentGoal.id);
    }
  }

  createHint(intent: string, slots: Record<string, string>) {
    const currentGoal = this.getCurrentGoal();

    if (!currentGoal) {
      return "All scenario goals are complete. Wrap up naturally and close the role-play in character.";
    }

    const filledSlotSummary = Object.entries(slots)
      .map(([name, value]) => `${name}=${value}`)
      .join(", ");
    const remainingSlots = currentGoal.logic.required_slots.filter(
      (slot) => !this.getFilledSlotsForCurrentGoal()[slot],
    );

    return [
      filledSlotSummary ? `Detected ${intent} with ${filledSlotSummary}.` : `Detected ${intent}.`,
      remainingSlots.length > 0
        ? `Next: guide the learner toward ${remainingSlots.join(", ")}.`
        : `Next: move the role-play toward goal '${currentGoal.description}'.`,
    ].join(" ");
  }

  toGoalProgressPacket(transcriptTurnIndex?: number): GoalProgressPacket {
    const currentGoal = this.getCurrentGoal();
    const fallbackGoalId = this.scenario.goals.goals.at(-1)?.id ?? "complete";

    return goalProgressPacketSchema.parse({
      currentGoalId: currentGoal?.id ?? fallbackGoalId,
      filledSlots: this.getFilledSlotsForCurrentGoal(),
      goals: this.scenario.goals.goals.map((goal) => ({
        description: goal.description,
        id: goal.id,
        optional: goal.optional,
        status: this.completedGoalIds.has(goal.id) ? "complete" : "incomplete",
      })),
      transcriptTurnIndex,
      type: "goal-progress",
    });
  }

  renderCurrentStatus() {
    const currentGoal = this.getCurrentGoal();

    return [
      "[CURRENT_STATUS]",
      "Current Goals:",
      ...this.scenario.goals.goals.map((goal) => {
        if (this.completedGoalIds.has(goal.id)) {
          return `- [x] ${goal.description}`;
        }

        if (currentGoal?.id === goal.id) {
          const remainingSlots = goal.logic.required_slots.filter((slot) => !this.getFilledSlotsForCurrentGoal()[slot]);
          return `- [ ] ${goal.description} (Remaining Slots: ${remainingSlots.join(", ") || "none"})`;
        }

        return `- [ ] ${goal.description}`;
      }),
    ].join("\n");
  }
}

export function createRolePlayInstructions(config: RolePlayRuntimeConfig, sessionTracker: SessionTracker) {
  const userCharacter = config.scenario.characters[config.selectedCharacterIndex];
  const agentCharacter = config.scenario.characters[config.selectedCharacterIndex === 0 ? 1 : 0];

  if (!userCharacter || !agentCharacter) {
    throw new Error("Scenario characters are incomplete for the selected role-play configuration.");
  }

  return [
    `You are role-playing as ${agentCharacter.name}. ${agentCharacter.description}`,
    `The learner is playing as ${userCharacter.name}. ${userCharacter.description}`,
    `Scenario setting: ${config.scenario.setting}`,
    "Stay in character, speak naturally, and keep replies concise enough for voice conversation.",
    "Call the detectIntentAndSlot tool whenever the learner makes meaningful progress on the active goal.",
    "After the tool returns, use the hint to shape the next in-character turn.",
    sessionTracker.renderCurrentStatus(),
  ].join("\n\n");
}
