import { createKnowledgeItemHandlers } from "./handlers/knowledge-item";
import { createScenarioHandlers } from "./handlers/scenario";
import { createSessionHandlers } from "./handlers/session";
import type { ProviderId } from "./registry";

export type AiProviderClient = ReturnType<typeof createProviderHandlers>;

const providerCache = new Map<ProviderId, AiProviderClient>();

function createProviderHandlers(providerId: ProviderId) {
  return {
    id: providerId,
    knowledgeItem: createKnowledgeItemHandlers(providerId),
    scenario: createScenarioHandlers(providerId),
    session: createSessionHandlers(providerId),
  };
}

export function getProvider(id: ProviderId): AiProviderClient {
  const cachedProvider = providerCache.get(id);

  if (cachedProvider) {
    return cachedProvider;
  }

  const provider = createProviderHandlers(id);
  providerCache.set(id, provider);
  return provider;
}
