import type { BackendApp } from "../http/context";
import { registerAdminAiModelRequestRoutes } from "./admin/ai-model-requests";
import { registerAdminDashboardRoutes } from "./admin/dashboard";
import { registerAdminKnowledgeItemRoutes } from "./admin/knowledge-items";
import { registerAdminKnowledgeOccurrenceRoutes } from "./admin/knowledge-occurrences";
import { registerAdminSubmissionRoutes } from "./admin/submissions";
import { registerAdminUserRoutes } from "./admin/users";

export function registerAdminRoutes(app: BackendApp) {
  registerAdminDashboardRoutes(app);
  registerAdminAiModelRequestRoutes(app);
  registerAdminKnowledgeOccurrenceRoutes(app);
  registerAdminKnowledgeItemRoutes(app);
  registerAdminSubmissionRoutes(app);
  registerAdminUserRoutes(app);
}
