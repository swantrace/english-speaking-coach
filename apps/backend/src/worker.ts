import {
  inConversationAnalysisQueueName,
  lingAnalysisQueueName,
  sessionCompletionQueueName,
} from "@english-coach/contract";
import { inConversationAnalysisWorker } from "./lib/queues/in-conversation.analysis";
import { knowledgeGenerateQueueName, knowledgeGenerateWorker } from "./lib/queues/knowledge.generate";
import { lingAnalysisWorker } from "./lib/queues/ling.analysis";
import { scenarioGenerateQueueName, scenarioGenerateWorker } from "./lib/queues/scenario.generate";
import { sessionCompletionWorker } from "./lib/queues/session.completion";

void knowledgeGenerateWorker;
void scenarioGenerateWorker;
void inConversationAnalysisWorker;
void lingAnalysisWorker;
void sessionCompletionWorker;

console.log(`backend worker listening for jobs on queue '${knowledgeGenerateQueueName}'`);
console.log(`backend worker listening for jobs on queue '${scenarioGenerateQueueName}'`);
console.log(`backend worker listening for jobs on queue '${inConversationAnalysisQueueName}'`);
console.log(`backend worker listening for jobs on queue '${sessionCompletionQueueName}'`);
console.log(`backend worker listening for jobs on queue '${lingAnalysisQueueName}'`);
