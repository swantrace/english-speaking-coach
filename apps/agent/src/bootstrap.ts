import { loadAgentEnv } from "./env";

type BootstrapAgentOptions = {
  loadEnvironment?: () => void;
  startAgent?: () => Promise<unknown>;
};

export async function bootstrapAgent({
  loadEnvironment = loadAgentEnv,
  startAgent = () => import("./agent-server"),
}: BootstrapAgentOptions = {}) {
  loadEnvironment();
  await startAgent();
}
