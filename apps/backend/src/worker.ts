import { inConversationAnalysisQueueName, lingAnalysisQueueName } from "@english-coach/contract";
import { inConversationAnalysisWorker } from "./lib/queues/in-conversation.analysis";
import { lingAnalysisWorker } from "./lib/queues/ling.analysis";
import { scenarioGenerateQueueName, scenarioGenerateWorker } from "./lib/queues/scenario.generate";

void scenarioGenerateWorker;
void inConversationAnalysisWorker;
void lingAnalysisWorker;

console.log(`backend worker listening for jobs on queue '${scenarioGenerateQueueName}'`);
console.log(`backend worker listening for jobs on queue '${inConversationAnalysisQueueName}'`);
console.log(`backend worker listening for jobs on queue '${lingAnalysisQueueName}'`);
