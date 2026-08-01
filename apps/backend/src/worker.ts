import { knowledgeGenerateQueueName, knowledgeOccurrenceEnrichQueueName } from "@english-coach/contract/knowledge";
import { scenarioGenerateQueueName } from "@english-coach/contract/scenario";
import {
  inConversationAnalysisQueueName,
  lingAnalysisQueueName,
  sessionCompletionQueueName,
} from "@english-coach/contract/session";
import { inConversationAnalysisWorker } from "./lib/queues/in-conversation.analysis";
import { knowledgeGenerateWorker } from "./lib/queues/knowledge.generate";
import {
  backfillKnowledgeOccurrenceEnrichment,
  knowledgeOccurrenceEnrichWorker,
} from "./lib/queues/knowledge-occurrence.resolve";
import { lingAnalysisWorker } from "./lib/queues/ling.analysis";
import { scenarioGenerateWorker } from "./lib/queues/scenario.generate";
import { sessionCompletionWorker } from "./lib/queues/session.completion";

void knowledgeGenerateWorker;
void knowledgeOccurrenceEnrichWorker;
void scenarioGenerateWorker;
void inConversationAnalysisWorker;
void lingAnalysisWorker;
void sessionCompletionWorker;

const occurrenceBackfill = await backfillKnowledgeOccurrenceEnrichment();

if (occurrenceBackfill.enqueuedCount > 0) {
  console.log(`queued ${occurrenceBackfill.enqueuedCount} existing knowledge occurrences for draft enrichment`);
}

console.log(`backend worker listening for jobs on queue '${knowledgeGenerateQueueName}'`);
console.log(`backend worker listening for jobs on queue '${knowledgeOccurrenceEnrichQueueName}'`);
console.log(`backend worker listening for jobs on queue '${scenarioGenerateQueueName}'`);
console.log(`backend worker listening for jobs on queue '${inConversationAnalysisQueueName}'`);
console.log(`backend worker listening for jobs on queue '${sessionCompletionQueueName}'`);
console.log(`backend worker listening for jobs on queue '${lingAnalysisQueueName}'`);
