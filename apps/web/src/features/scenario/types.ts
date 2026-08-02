export interface ScenarioListFilters {
  search?: string;
  tags?: string[];
}

export type AdminScenarioReviewStatus = "approved" | "pendingReview";

export interface ScenarioCharacterView {
  description: string;
  index: 0 | 1;
  name: string;
}

export interface ScenarioGoalView {
  description: string;
  id: string;
  optional: boolean;
  requiredIntents: string[];
  requiredSlots: string[];
}

export interface ExampleDialogueTurn {
  characterIndex: 0 | 1;
  id: string;
  speakerName: string;
  text: string;
}

export interface ScenarioListItem {
  characterNames: [string, string];
  id: string;
  imageAssetId: string | null;
  imageUrl: string | null;
  setting: string;
  tags: string[];
  title: string;
}

export interface ScenarioDetail {
  characters: [ScenarioCharacterView, ScenarioCharacterView];
  exampleDialogue: ExampleDialogueTurn[];
  goalDimensions: {
    intents: string[];
    slots: string[];
  };
  goals: ScenarioGoalView[];
  id: string;
  imageAssetId: string | null;
  imageUrl: string | null;
  setting: string;
  tags: string[];
  title: string;
}

export interface ScenarioListView {
  availableTags: string[];
  items: ScenarioListItem[];
  total: number;
}

export interface AdminScenarioListFilters {
  reviewStatus?: AdminScenarioReviewStatus;
  search?: string;
  tags?: string[];
}

export interface AdminScenarioListItemView {
  id: string;
  isPendingReview: boolean;
  reviewStatus: AdminScenarioReviewStatus;
  settingPreview: string;
  tags: string[];
  title: string;
  updatedAt: string;
  updatedAtLabel: string;
}

export interface AdminScenarioListPageView {
  availableTags: string[];
  items: AdminScenarioListItemView[];
  total: number;
}

export interface AdminScenarioDetailView extends ScenarioDetail {
  createdAt: string;
  createdAtLabel: string;
  isPendingReview: boolean;
  reviewStatus: AdminScenarioReviewStatus;
  updatedAt: string;
  updatedAtLabel: string;
}

export interface ScenarioFormCharacterValue {
  description: string;
  name: string;
}

export interface ScenarioFormGoalValue {
  description: string;
  id: string;
  logic: {
    required_intents: string[];
    required_slots: string[];
  };
  optional: boolean;
}

export interface ScenarioFormDialogueTurnValue {
  characterIndex: 0 | 1;
  id: string;
  text: string;
}

export interface ScenarioFormValues {
  characters: [ScenarioFormCharacterValue, ScenarioFormCharacterValue];
  exampleDialogue: ScenarioFormDialogueTurnValue[];
  goals: {
    goals: ScenarioFormGoalValue[];
    intents: string[];
    slots: string[];
  };
  imageAssetId: string | null;
  imageFile: File | null;
  imageUrl: string;
  isPendingReview: boolean;
  removeImage: boolean;
  setting: string;
  tags: string[];
  title: string;
}

export interface BulkScenarioFormValues {
  drafts: string;
}

export interface BulkScenarioSubmissionView {
  enqueueFailedCount: number;
  invalidCount: number;
  kind: "scenario.generate";
  queuedCount: number;
  submissionId: string;
  totalCount: number;
}

export type AdminScenarioActionKey = "approve" | "delete" | "edit";

export interface AdminScenarioWritePayload {
  characters: [ScenarioFormCharacterValue, ScenarioFormCharacterValue];
  exampleDialogue: Array<{
    characterIndex: 0 | 1;
    text: string;
  }>;
  goals: {
    goals: Array<{
      description: string;
      id: string;
      logic: {
        required_intents: string[];
        required_slots: string[];
      };
      optional: boolean;
    }>;
    intents: string[];
    slots: string[];
  };
  imageUrl: string | null;
  isPendingReview: boolean;
  setting: string;
  tags: string[];
  title: string;
}
