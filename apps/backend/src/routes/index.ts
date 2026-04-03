import type { BackendApp } from "../http/context";
import { registerAdminRoutes } from "./admin";
import { registerAuthRoutes } from "./auth";
import { registerHistoryRoutes } from "./history";
import { registerInternalAgentRoutes } from "./internal-agent";
import { registerScenarioGenerateRoutes } from "./scenario-generate";
import { registerScenarioRoutes } from "./scenarios";
import { registerSessionRoutes } from "./session";
import { registerSystemRoutes } from "./system";

export function registerRoutes(app: BackendApp) {
  registerAuthRoutes(app);
  registerSystemRoutes(app);
  registerInternalAgentRoutes(app);
  registerSessionRoutes(app);
  registerScenarioGenerateRoutes(app);
  registerScenarioRoutes(app);
  registerAdminRoutes(app);
  registerHistoryRoutes(app);
}
