export interface ScenarioListFilters {
  search?: string;
  tags?: string[];
}

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
