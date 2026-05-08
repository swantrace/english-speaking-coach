import type { BackendApp } from "../http/context";
import { registerAdminDashboardRoutes } from "./admin/dashboard";
import { registerAdminKnowledgeItemRoutes } from "./admin/knowledge-items";
import { registerAdminKnowledgeOccurrenceRoutes } from "./admin/knowledge-occurrences";
import { registerAdminSubmissionRoutes } from "./admin/submissions";
import { registerAdminUserRoutes } from "./admin/users";

export function registerAdminRoutes(app: BackendApp) {
  registerAdminDashboardRoutes(app);
  registerAdminKnowledgeOccurrenceRoutes(app);
  registerAdminKnowledgeItemRoutes(app);
  registerAdminSubmissionRoutes(app);
  registerAdminUserRoutes(app);
}
