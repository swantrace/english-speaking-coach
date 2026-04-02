import { scenarioGenerateQueueName, scenarioGenerateWorker } from "./lib/queues/scenario.generate";

void scenarioGenerateWorker;

console.log(`backend worker listening for jobs on queue '${scenarioGenerateQueueName}'`);
