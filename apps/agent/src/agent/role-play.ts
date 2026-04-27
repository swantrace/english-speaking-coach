import { type GoalProgressPacket, goalProgressPacketSchema } from "@english-coach/contract";
import type { Scenario } from "@english-coach/contract/scenario";
import {
  buildActiveGoalSchemaSectionPrompt,
  buildCurrentStatusSectionPrompt,
  buildExtractionGuidanceSectionPrompt,
  buildHintSectionPrompt,
  buildRolePlayInstructionsPrompt,
} from "@english-coach/prompts";
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

    return buildHintSectionPrompt({
      currentGoalDescription: currentGoal.description,
      filledSlotSummary,
      intent,
      remainingSlots,
    });
  }

  renderExtractionGuidance() {
    return buildExtractionGuidanceSectionPrompt({
      currentGoal: this.getCurrentGoal(),
    });
  }

  renderActiveGoalSchema() {
    return buildActiveGoalSchemaSectionPrompt({
      currentGoal: this.getCurrentGoal(),
    });
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

    return buildCurrentStatusSectionPrompt({
      completedGoalIds: this.completedGoalIds,
      currentGoal,
      filledSlotsForCurrentGoal: this.getFilledSlotsForCurrentGoal(),
      goals: this.scenario.goals.goals,
    });
  }
}

export function createRolePlayInstructions(config: RolePlayRuntimeConfig, sessionTracker: SessionTracker) {
  const userCharacter = config.scenario.characters[config.selectedCharacterIndex];
  const agentCharacter = config.scenario.characters[config.selectedCharacterIndex === 0 ? 1 : 0];

  if (!userCharacter || !agentCharacter) {
    throw new Error("Scenario characters are incomplete for the selected role-play configuration.");
  }

  return buildRolePlayInstructionsPrompt({
    activeGoalSchema: sessionTracker.renderActiveGoalSchema(),
    agentCharacter,
    currentStatus: sessionTracker.renderCurrentStatus(),
    extractionGuidance: sessionTracker.renderExtractionGuidance(),
    scenarioSetting: config.scenario.setting,
    userCharacter,
  });
}
