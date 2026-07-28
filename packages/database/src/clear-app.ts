import { assertDestructiveDatabaseOperationAllowed, databaseUrl } from "./config";
import { databaseClient } from "./index";

assertDestructiveDatabaseOperationAllowed();

await databaseClient.batch(
  [
    "delete from ai_tool_calls",
    "delete from ai_model_requests",
    "delete from submission_jobs",
    "delete from submissions",
  ],
  "write",
);
databaseClient.close();

console.log(`Cleared application data tables at ${databaseUrl} while preserving auth data`);
