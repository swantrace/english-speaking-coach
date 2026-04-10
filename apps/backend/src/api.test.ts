import { afterAll, beforeAll, beforeEach, describe, expect, test } from "bun:test";
import { transcriptAnnotationUpsertRequestSchema } from "@english-coach/contract";
import {
  type KnowledgeGenerateJobUpdate,
  type KnowledgeGenerateSubmissionResponse,
  knowledgeGenerateSubmitPath,
} from "@english-coach/contract/knowledge-generate";
import {
  type ScenarioGenerateJobUpdate,
  type ScenarioGenerateSubmissionResponse,
  scenarioGenerateSubmitPath,
} from "@english-coach/contract/scenario-generate";
import { db } from "@english-coach/database";
import {
  freeFormContexts,
  knowledgeItems,
  scenarios,
  sessionErrors,
  sessionHistory,
  sessionKnowledgePointOccurrences,
  sessionTranscripts,
  submissions,
  user,
} from "@english-coach/database/schema";
import { eq } from "drizzle-orm";
import { TokenVerifier } from "livekit-server-sdk";
import { createSubscriberRedisConnection } from "./lib/redis";

process.env.SCENARIO_GENERATE_USE_TEST_GENERATOR = "1";
process.env.KNOWLEDGE_GENERATE_USE_TEST_GENERATOR = "1";

const { app } = await import("./api");
const {
  getKnowledgeGenerateSnapshots,
  knowledgeGenerateQueue,
  knowledgeGenerateWorker,
  processKnowledgeGenerateJob,
  setKnowledgeGeneratorForTests,
} = await import("./lib/queues/knowledge.generate");
const {
  getScenarioGenerateSnapshots,
  publishScenarioGenerateProgress,
  scenarioGenerateProgressChannel,
  scenarioGenerateQueue,
  scenarioGenerateWorker,
  setScenarioGeneratorForTests,
} = await import("./lib/queues/scenario.generate");

function waitForMessage(
  subscriber: ReturnType<typeof createSubscriberRedisConnection>,
  predicate: (message: ScenarioGenerateJobUpdate) => boolean,
  timeoutMs = 5000,
) {
  return new Promise<ScenarioGenerateJobUpdate>((resolve, reject) => {
    const timeout = setTimeout(() => {
      subscriber.off("message", onMessage);
      reject(new Error("Timed out waiting for Redis pub/sub message"));
    }, timeoutMs);

    const onMessage = (_channel: string, rawMessage: string) => {
      try {
        const message = JSON.parse(rawMessage) as ScenarioGenerateJobUpdate;

        if (!predicate(message)) {
          return;
        }

        clearTimeout(timeout);
        subscriber.off("message", onMessage);
        resolve(message);
      } catch {
        // Ignore malformed payloads in the shared test subscriber.
      }
    };

    subscriber.on("message", onMessage);
  });
}

async function waitForSnapshot(
  submissionId: string,
  predicate: (message: ScenarioGenerateJobUpdate) => boolean,
  timeoutMs = 30000,
) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    const snapshots = await getScenarioGenerateSnapshots({
      limit: 10,
      submissionId,
    });

    const match = snapshots.find(predicate);

    if (match) {
      return match;
    }

    await Bun.sleep(250);
  }

  throw new Error(`Timed out waiting for scenario snapshot for submission ${submissionId}`);
}

async function waitForKnowledgeSnapshot(
  submissionId: string,
  predicate: (message: KnowledgeGenerateJobUpdate) => boolean,
  timeoutMs = 30000,
) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    const snapshots = await getKnowledgeGenerateSnapshots({
      limit: 10,
      submissionId,
    });

    const match = snapshots.find(predicate);

    if (match) {
      return match;
    }

    await Bun.sleep(250);
  }

  throw new Error(`Timed out waiting for knowledge snapshot for submission ${submissionId}`);
}

async function signUpAndCreateSession(label: string) {
  const email = `coach-${label}-${Date.now()}@example.com`;
  const password = "password1234";

  const signUpResponse = await app.request("http://localhost/api/auth/sign-up/email", {
    body: JSON.stringify({
      email,
      name: `${label} Tester`,
      password,
    }),
    headers: {
      "Content-Type": "application/json",
      origin: "http://localhost:5173",
    },
    method: "POST",
  });

  expect(signUpResponse.status).toBe(200);

  const cookie = signUpResponse.headers.get("set-cookie");

  expect(cookie).toBeTruthy();

  if (!cookie) {
    throw new Error("Expected Better Auth sign-up response to set a session cookie");
  }

  const sessionResponse = await app.request("http://localhost/api/session", {
    headers: {
      Cookie: cookie,
    },
  });

  expect(sessionResponse.status).toBe(200);

  const sessionBody = (await sessionResponse.json()) as {
    user: { id: string; email: string; role?: string };
  };

  return {
    cookie,
    email,
    userId: sessionBody.user.id,
  };
}

async function promoteUserToAdmin(email: string) {
  await db.update(user).set({ role: "admin" }).where(eq(user.email, email));
}

async function createScenarioRecord(titlePrefix: string) {
  const now = new Date().toISOString();
  const id = crypto.randomUUID();

  await db.insert(scenarios).values({
    characters: [
      { description: "A student ordering in English.", name: "Student" },
      { description: "A patient cafe worker.", name: "Barista" },
    ],
    createdAt: now,
    exampleDialogue: [
      { characterIndex: 1, text: "Hi there, what can I get for you today?" },
      { characterIndex: 0, text: "I'd like a cappuccino, please." },
    ],
    goals: {
      goals: [
        {
          description: "Order a drink",
          id: "order-drink",
          logic: { required_intents: ["order_drink"], required_slots: ["drink_type"] },
        },
      ],
      intents: ["order_drink"],
      slots: ["drink_type"],
    },
    id,
    setting: "A neighborhood coffee shop during the morning rush.",
    title: `${titlePrefix} ${Date.now()}`,
    updatedAt: now,
  });

  return id;
}

describe("backend phase 2 integration", () => {
  const subscriber = createSubscriberRedisConnection("scenario-test");

  beforeAll(async () => {
    process.env.SCENARIO_GENERATE_USE_TEST_GENERATOR = "1";
    process.env.KNOWLEDGE_GENERATE_USE_TEST_GENERATOR = "1";
    await knowledgeGenerateQueue.waitUntilReady();
    await knowledgeGenerateWorker.waitUntilReady();
    await knowledgeGenerateQueue.drain();
    await knowledgeGenerateQueue.clean(0, 1000, "completed");
    await knowledgeGenerateQueue.clean(0, 1000, "failed");
    await scenarioGenerateQueue.waitUntilReady();
    await scenarioGenerateWorker.waitUntilReady();
    await scenarioGenerateQueue.drain();
    await scenarioGenerateQueue.clean(0, 1000, "completed");
    await scenarioGenerateQueue.clean(0, 1000, "failed");
  });

  beforeEach(async () => {
    await knowledgeGenerateQueue.drain();
    await knowledgeGenerateQueue.clean(0, 1000, "completed");
    await knowledgeGenerateQueue.clean(0, 1000, "failed");
    await scenarioGenerateQueue.drain();
    await scenarioGenerateQueue.clean(0, 1000, "completed");
    await scenarioGenerateQueue.clean(0, 1000, "failed");

    setKnowledgeGeneratorForTests(async (prompt) => ({
      communicativeFunction: "give_or_seek_information",
      example: `Could you explain ${prompt}?`,
      fixednessLevel: "restricted_collocation",
      pattern: `Could you explain <np> ${prompt}`,
      syntaxRole: "clause_pattern",
    }));

    setScenarioGeneratorForTests(async (prompt) => ({
      characters: [
        { description: "Practising customer language.", name: "Learner" },
        { description: "Responds naturally to the learner.", name: "Coach" },
      ],
      exampleDialogue: [
        { characterIndex: 1, text: "Welcome in. How can I help?" },
        { characterIndex: 0, text: "I need help with this situation." },
      ],
      goals: {
        goals: [
          {
            description: "State your main request clearly",
            id: "main-request",
            logic: { required_intents: ["state_request"], required_slots: ["request_detail"] },
          },
        ],
        intents: ["state_request"],
        slots: ["request_detail"],
      },
      setting: `Prompt-derived setting for ${prompt}`,
      title: `Generated from ${prompt}`,
    }));
  });

  subscriber.on("error", () => {
    // Ignore subscriber reconnect noise in integration tests.
  });

  afterAll(() => {
    delete process.env.KNOWLEDGE_GENERATE_USE_TEST_GENERATOR;
    setKnowledgeGeneratorForTests(null);
    delete process.env.SCENARIO_GENERATE_USE_TEST_GENERATOR;
    setScenarioGeneratorForTests(null);
    subscriber.disconnect();
  });

  test("requires admin for scenario generation, persists ownership, and publishes completion updates", async () => {
    const student = await signUpAndCreateSession("student-generate");
    const admin = await signUpAndCreateSession("admin-generate");

    await promoteUserToAdmin(admin.email);
    await subscriber.subscribe(scenarioGenerateProgressChannel);

    const unauthorizedResponse = await app.request(`http://localhost${scenarioGenerateSubmitPath}`, {
      body: JSON.stringify({
        items: [{ message: "anonymous request", queuedAt: new Date().toISOString() }],
      }),
      headers: {
        "Content-Type": "application/json",
      },
      method: "POST",
    });

    expect(unauthorizedResponse.status).toBe(401);

    const forbiddenResponse = await app.request(`http://localhost${scenarioGenerateSubmitPath}`, {
      body: JSON.stringify({
        items: [{ message: "student request", queuedAt: new Date().toISOString() }],
      }),
      headers: {
        Cookie: student.cookie,
        "Content-Type": "application/json",
      },
      method: "POST",
    });

    expect(forbiddenResponse.status).toBe(403);

    const jobId = `pubsub-test-${Date.now()}`;
    const expectedMessage = waitForMessage(subscriber, (message) => message.jobId === jobId);

    await publishScenarioGenerateProgress({
      cursor: 0,
      jobId,
      message: "Pub/Sub integration test",
      progress: 42,
      status: "started",
      submissionId: "pubsub-test",
    });

    expect(expectedMessage).resolves.toMatchObject({
      cursor: 0,
      jobId,
      message: "Pub/Sub integration test",
      progress: 42,
      status: "started",
      submissionId: "pubsub-test",
    });

    const generateResponse = await app.request(`http://localhost${scenarioGenerateSubmitPath}`, {
      body: JSON.stringify({
        items: [
          { message: "admin integration scenario", queuedAt: new Date().toISOString() },
          { message: "" },
          { message: 123 },
        ],
      }),
      headers: {
        Cookie: admin.cookie,
        "Content-Type": "application/json",
      },
      method: "POST",
    });

    expect(generateResponse.status).toBe(200);

    const generateBody = (await generateResponse.json()) as ScenarioGenerateSubmissionResponse;

    expect(generateBody.summary).toEqual({
      enqueueFailed: 0,
      invalid: 2,
      queued: 1,
      total: 3,
    });

    const queuedJobId = generateBody.results[0]?.jobId;

    if (!queuedJobId) {
      throw new Error("Expected queued scenario generation job id");
    }

    expect(
      getScenarioGenerateSnapshots({
        limit: 1,
        submissionId: generateBody.submissionId,
      }),
    ).resolves.toMatchObject([
      {
        cursor: 0,
        jobId: queuedJobId,
        submissionId: generateBody.submissionId,
      },
    ]);

    const completedSnapshot = await waitForSnapshot(
      generateBody.submissionId,
      (snapshot) => snapshot.jobId === queuedJobId && snapshot.status === "completed",
    );

    expect(completedSnapshot.status).toBe("completed");

    const [submissionRecord] = await db
      .select()
      .from(submissions)
      .where(eq(submissions.id, generateBody.submissionId))
      .limit(1);

    expect(submissionRecord?.userId).toBe(admin.userId);
  }, 60000);

  test("supports admin scenario CRUD, filtering, and approval-gated scenario reads", async () => {
    const student = await signUpAndCreateSession("student-admin-scenarios");
    const admin = await signUpAndCreateSession("admin-admin-scenarios");

    await promoteUserToAdmin(admin.email);

    const createScenarioResponse = await app.request("http://localhost/api/admin/scenarios", {
      body: JSON.stringify({
        characters: [
          { description: "A job candidate preparing for an interview.", name: "Candidate" },
          { description: "A hiring manager asking follow-up questions.", name: "Hiring Manager" },
        ],
        exampleDialogue: [
          { characterIndex: 1, text: "Tell me about your background." },
          { characterIndex: 0, text: "I have five years of product experience." },
        ],
        goals: {
          goals: [
            {
              description: "Summarize your background clearly",
              id: "summarize-background",
              logic: { required_intents: ["summarize_background"], required_slots: ["experience"] },
            },
          ],
          intents: ["summarize_background"],
          slots: ["experience"],
        },
        reviewStatus: "approved",
        setting: "A first-round interview for a product manager role.",
        title: `Interview Flow ${Date.now()}`,
      }),
      headers: {
        Cookie: admin.cookie,
        "Content-Type": "application/json",
      },
      method: "POST",
    });

    expect(createScenarioResponse.status).toBe(201);

    const createdScenario = (await createScenarioResponse.json()) as {
      id: string;
      reviewStatus: string;
      source: string;
      title: string;
    };

    expect(createdScenario.reviewStatus).toBe("approved");
    expect(createdScenario.source).toBe("admin");

    const moveToPendingResponse = await app.request(`http://localhost/api/admin/scenarios/${createdScenario.id}`, {
      body: JSON.stringify({ reviewStatus: "pending_review", title: `${createdScenario.title} Draft` }),
      headers: {
        Cookie: admin.cookie,
        "Content-Type": "application/json",
      },
      method: "PATCH",
    });

    expect(moveToPendingResponse.status).toBe(200);
    expect(await moveToPendingResponse.json()).toMatchObject({
      id: createdScenario.id,
      reviewStatus: "pending_review",
      title: `${createdScenario.title} Draft`,
    });

    const learnerScenarioDetailWhilePendingResponse = await app.request(
      `http://localhost/api/scenarios/${createdScenario.id}`,
      {
        headers: {
          Cookie: student.cookie,
        },
      },
    );

    expect(learnerScenarioDetailWhilePendingResponse.status).toBe(404);

    const adminScenarioListResponse = await app.request(
      "http://localhost/api/admin/scenarios?reviewStatus=pending_review&source=admin&search=Interview%20Flow",
      {
        headers: {
          Cookie: admin.cookie,
        },
      },
    );

    expect(adminScenarioListResponse.status).toBe(200);
    expect(await adminScenarioListResponse.json()).toMatchObject({
      items: [expect.objectContaining({ id: createdScenario.id, reviewStatus: "pending_review", source: "admin" })],
    });

    const approveScenarioResponse = await app.request(`http://localhost/api/admin/scenarios/${createdScenario.id}`, {
      body: JSON.stringify({ reviewStatus: "approved" }),
      headers: {
        Cookie: admin.cookie,
        "Content-Type": "application/json",
      },
      method: "PATCH",
    });

    expect(approveScenarioResponse.status).toBe(200);

    const learnerScenarioDetailAfterApprovalResponse = await app.request(
      `http://localhost/api/scenarios/${createdScenario.id}`,
      {
        headers: {
          Cookie: student.cookie,
        },
      },
    );

    expect(learnerScenarioDetailAfterApprovalResponse.status).toBe(200);
    expect(await learnerScenarioDetailAfterApprovalResponse.json()).toMatchObject({
      id: createdScenario.id,
      reviewStatus: "approved",
    });

    const deleteScenarioResponse = await app.request(`http://localhost/api/admin/scenarios/${createdScenario.id}`, {
      headers: {
        Cookie: admin.cookie,
      },
      method: "DELETE",
    });

    expect(deleteScenarioResponse.status).toBe(204);

    const deletedScenarioResponse = await app.request(`http://localhost/api/scenarios/${createdScenario.id}`, {
      headers: {
        Cookie: admin.cookie,
      },
    });

    expect(deletedScenarioResponse.status).toBe(404);
  });

  test("supports admin knowledge item CRUD, knowledge generation review flows, history detail reads, session token minting, and SSE timeout", async () => {
    const student = await signUpAndCreateSession("student-history");
    const admin = await signUpAndCreateSession("admin-history");

    await promoteUserToAdmin(admin.email);

    const scenarioSearchPrefix = `Cafe Scenario ${Date.now()}`;
    const scenarioId = await createScenarioRecord(scenarioSearchPrefix);
    const cursorScenarioPrefix = `Cursor Scenario ${Date.now()}`;
    const cursorScenarioA = await createScenarioRecord(cursorScenarioPrefix);
    const cursorScenarioB = await createScenarioRecord(cursorScenarioPrefix);
    const knowledgeItemPattern = `I'd like <np> ${Date.now()}`;
    const knowledgeGeneratePrompt = `support escalation phrases ${Date.now()}`;

    const createKnowledgeItemResponse = await app.request("http://localhost/api/admin/knowledge-items", {
      body: JSON.stringify({
        communicativeFunction: "make_request_or_offer",
        example: "I'd like a table for two.",
        fixednessLevel: "fixed_expression",
        pattern: knowledgeItemPattern,
        source: "admin",
        syntaxRole: "clause_pattern",
      }),
      headers: {
        Cookie: admin.cookie,
        "Content-Type": "application/json",
      },
      method: "POST",
    });

    expect(createKnowledgeItemResponse.status).toBe(201);
    const createdKnowledgeItem = (await createKnowledgeItemResponse.json()) as {
      id: string;
      pattern: string;
      reviewStatus: string;
      source: string;
    };
    expect(createdKnowledgeItem.pattern).toBe(knowledgeItemPattern);
    expect(createdKnowledgeItem.reviewStatus).toBe("approved");
    expect(createdKnowledgeItem.source).toBe("admin");

    const secondaryKnowledgeItemResponse = await app.request("http://localhost/api/admin/knowledge-items", {
      body: JSON.stringify({
        communicativeFunction: "manage_social_relation",
        example: "Thank you for your help.",
        fixednessLevel: "fixed_expression",
        pattern: `Thank you for <np> ${Date.now()}`,
        source: "admin",
        syntaxRole: "clause_pattern",
        reviewStatus: "approved",
      }),
      headers: {
        Cookie: admin.cookie,
        "Content-Type": "application/json",
      },
      method: "POST",
    });

    expect(secondaryKnowledgeItemResponse.status).toBe(201);

    const patchKnowledgeItemResponse = await app.request(
      `http://localhost/api/admin/knowledge-items/${createdKnowledgeItem.id}`,
      {
        body: JSON.stringify({
          reviewStatus: "pending_review",
        }),
        headers: {
          Cookie: admin.cookie,
          "Content-Type": "application/json",
        },
        method: "PATCH",
      },
    );

    expect(patchKnowledgeItemResponse.status).toBe(200);
    expect(await patchKnowledgeItemResponse.json()).toMatchObject({
      id: createdKnowledgeItem.id,
      reviewStatus: "pending_review",
      source: "admin",
    });

    await knowledgeGenerateQueue.pause();

    const generateKnowledgeResponse = await app.request(`http://localhost${knowledgeGenerateSubmitPath}`, {
      body: JSON.stringify({
        items: [
          { message: knowledgeGeneratePrompt, queuedAt: new Date().toISOString() },
          { message: "" },
          { message: 123 },
        ],
      }),
      headers: {
        Cookie: admin.cookie,
        "Content-Type": "application/json",
      },
      method: "POST",
    });

    expect(generateKnowledgeResponse.status).toBe(200);

    const generateKnowledgeBody = (await generateKnowledgeResponse.json()) as KnowledgeGenerateSubmissionResponse;

    expect(generateKnowledgeBody.summary).toEqual({
      enqueueFailed: 0,
      invalid: 2,
      queued: 1,
      total: 3,
    });

    const queuedKnowledgeJobId = generateKnowledgeBody.results[0]?.jobId;
    const queuedKnowledgeJobPayload = generateKnowledgeBody.results[0]?.payload;
    const queuedKnowledgeJobCursor = generateKnowledgeBody.results[0]?.cursor;

    if (!queuedKnowledgeJobId || !queuedKnowledgeJobPayload || typeof queuedKnowledgeJobCursor !== "number") {
      throw new Error("Expected queued knowledge generation job id");
    }

    try {
      const queuedKnowledgeJob = await knowledgeGenerateQueue.getJob(queuedKnowledgeJobId);

      if (queuedKnowledgeJob) {
        await queuedKnowledgeJob.remove();
      }

      await processKnowledgeGenerateJob(
        {
          ...queuedKnowledgeJobPayload,
          cursor: queuedKnowledgeJobCursor,
          submissionId: generateKnowledgeBody.submissionId,
        },
        queuedKnowledgeJobId,
      );
    } finally {
      await knowledgeGenerateQueue.resume();
    }

    const completedKnowledgeSnapshot = await waitForKnowledgeSnapshot(
      generateKnowledgeBody.submissionId,
      (snapshot) => snapshot.jobId === queuedKnowledgeJobId && snapshot.status === "completed",
    );

    expect(completedKnowledgeSnapshot.status).toBe("completed");

    const [knowledgeSubmissionRecord] = await db
      .select()
      .from(submissions)
      .where(eq(submissions.id, generateKnowledgeBody.submissionId))
      .limit(1);

    expect(knowledgeSubmissionRecord).toMatchObject({
      id: generateKnowledgeBody.submissionId,
      kind: "knowledge.generate",
      userId: admin.userId,
    });

    const knowledgeSubmissionHistoryResponse = await app.request(
      "http://localhost/api/admin/knowledge-items/generate/submissions?limit=5&jobsPerSubmission=3",
      {
        headers: {
          Cookie: admin.cookie,
        },
      },
    );

    expect(knowledgeSubmissionHistoryResponse.status).toBe(200);
    expect(await knowledgeSubmissionHistoryResponse.json()).toMatchObject({
      items: expect.arrayContaining([
        expect.objectContaining({
          eventsUrl: expect.stringContaining(generateKnowledgeBody.submissionId),
          id: generateKnowledgeBody.submissionId,
          jobs: expect.arrayContaining([
            expect.objectContaining({
              jobId: queuedKnowledgeJobId,
              status: "completed",
              submissionId: generateKnowledgeBody.submissionId,
            }),
          ]),
          summary: expect.objectContaining({
            completed: 1,
            totalJobs: 1,
          }),
          totalCount: 3,
        }),
      ]),
    });

    const listKnowledgeItemsResponse = await app.request(
      "http://localhost/api/admin/knowledge-items?source=auto_generated&reviewStatus=pending_review&page=1&pageSize=5",
      {
        headers: {
          Cookie: admin.cookie,
        },
      },
    );

    expect(listKnowledgeItemsResponse.status).toBe(200);
    const listedKnowledgeItemsBody = (await listKnowledgeItemsResponse.json()) as {
      items: Array<{
        id: string;
        pattern: string;
        reviewStatus: string;
        source: string;
        submissionId: string | null;
      }>;
      total: number;
    };

    const generatedKnowledgeItem = listedKnowledgeItemsBody.items.find(
      (item) => item.submissionId === generateKnowledgeBody.submissionId,
    );

    expect(generatedKnowledgeItem).toBeTruthy();
    expect(generatedKnowledgeItem).toMatchObject({
      reviewStatus: "pending_review",
      source: "auto_generated",
      submissionId: generateKnowledgeBody.submissionId,
    });

    const filteredKnowledgeItemsResponse = await app.request(
      `http://localhost/api/admin/knowledge-items?source=auto_generated&reviewStatus=pending_review&search=${encodeURIComponent(knowledgeGeneratePrompt)}&sortBy=pattern&sortDirection=asc&page=1&pageSize=5`,
      {
        headers: {
          Cookie: admin.cookie,
        },
      },
    );

    expect(filteredKnowledgeItemsResponse.status).toBe(200);
    const filteredKnowledgeItemsBody = (await filteredKnowledgeItemsResponse.json()) as {
      items: Array<{ id: string; pattern: string; reviewStatus: string; source: string }>;
      page: number;
      pageSize: number;
    };

    expect(filteredKnowledgeItemsBody.page).toBe(1);
    expect(filteredKnowledgeItemsBody.pageSize).toBe(5);
    expect(filteredKnowledgeItemsBody.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: generatedKnowledgeItem?.id,
          pattern: generatedKnowledgeItem?.pattern,
          reviewStatus: "pending_review",
          source: "auto_generated",
        }),
      ]),
    );

    const approveGeneratedKnowledgeItemResponse = await app.request(
      `http://localhost/api/admin/knowledge-items/${generatedKnowledgeItem?.id}`,
      {
        body: JSON.stringify({ reviewStatus: "approved" }),
        headers: {
          Cookie: admin.cookie,
          "Content-Type": "application/json",
        },
        method: "PATCH",
      },
    );

    expect(approveGeneratedKnowledgeItemResponse.status).toBe(200);
    expect(await approveGeneratedKnowledgeItemResponse.json()).toMatchObject({
      id: generatedKnowledgeItem?.id,
      reviewStatus: "approved",
      source: "auto_generated",
      submissionId: generateKnowledgeBody.submissionId,
    });

    const scenarioListResponse = await app.request("http://localhost/api/learner/scenarios?limit=25&offset=0", {
      headers: {
        Cookie: student.cookie,
      },
    });

    expect(scenarioListResponse.status).toBe(200);
    await expect(scenarioListResponse.json()).resolves.toEqual(
      expect.objectContaining({
        items: expect.arrayContaining([
          expect.objectContaining({
            id: scenarioId,
          }),
        ]),
        limit: 25,
        page: 1,
        pageSize: 25,
        offset: 0,
        totalPages: expect.any(Number),
        total: expect.any(Number),
      }),
    );

    const adminScenarioListResponse = await app.request(
      `http://localhost/api/admin/scenarios?search=${encodeURIComponent(scenarioSearchPrefix)}&sortBy=title&sortDirection=asc&page=1&pageSize=5`,
      {
        headers: {
          Cookie: admin.cookie,
        },
      },
    );

    expect(adminScenarioListResponse.status).toBe(200);
    const adminScenarioListBody = (await adminScenarioListResponse.json()) as {
      items: Array<{ id: string }>;
      page: number;
      pageSize: number;
    };

    expect(adminScenarioListBody.page).toBe(1);
    expect(adminScenarioListBody.pageSize).toBe(5);
    expect(adminScenarioListBody.items.some((item) => item.id === scenarioId)).toBe(true);

    const scenarioSearchResponse = await app.request(
      `http://localhost/api/learner/scenarios?search=${encodeURIComponent(scenarioSearchPrefix)}&sortBy=title&sortDirection=asc&page=1&pageSize=5`,
      {
        headers: {
          Cookie: student.cookie,
        },
      },
    );

    expect(scenarioSearchResponse.status).toBe(200);
    const scenarioSearchBody = (await scenarioSearchResponse.json()) as {
      items: Array<{ id: string }>;
      page: number;
      pageSize: number;
    };

    expect(scenarioSearchBody.page).toBe(1);
    expect(scenarioSearchBody.pageSize).toBe(5);
    expect(scenarioSearchBody.items).toEqual(expect.arrayContaining([expect.objectContaining({ id: scenarioId })]));

    const firstCursorScenarioResponse = await app.request(
      `http://localhost/api/learner/scenarios?pagination=cursor&search=${encodeURIComponent(cursorScenarioPrefix)}&pageSize=1`,
      {
        headers: {
          Cookie: student.cookie,
        },
      },
    );

    expect(firstCursorScenarioResponse.status).toBe(200);

    const firstCursorScenarioBody = (await firstCursorScenarioResponse.json()) as {
      hasMore: boolean;
      items: Array<{ id: string }>;
      nextCursor: string | null;
    };

    expect(firstCursorScenarioBody.items).toHaveLength(1);
    expect(([cursorScenarioA, cursorScenarioB] as string[]).includes(firstCursorScenarioBody.items[0]?.id ?? "")).toBe(
      true,
    );
    expect(firstCursorScenarioBody.hasMore).toBe(true);
    expect(firstCursorScenarioBody.nextCursor).toBeTruthy();

    const secondCursorScenarioResponse = await app.request(
      `http://localhost/api/learner/scenarios?pagination=cursor&search=${encodeURIComponent(cursorScenarioPrefix)}&pageSize=1&cursor=${encodeURIComponent(firstCursorScenarioBody.nextCursor ?? "")}`,
      {
        headers: {
          Cookie: student.cookie,
        },
      },
    );

    expect(secondCursorScenarioResponse.status).toBe(200);

    const secondCursorScenarioBody = (await secondCursorScenarioResponse.json()) as {
      items: Array<{ id: string }>;
      nextCursor: string | null;
    };

    expect(secondCursorScenarioBody.items).toHaveLength(1);
    expect(secondCursorScenarioBody.items[0]?.id).not.toBe(firstCursorScenarioBody.items[0]?.id);

    const scenarioDetailResponse = await app.request(`http://localhost/api/scenarios/${scenarioId}`, {
      headers: {
        Cookie: student.cookie,
      },
    });

    expect(scenarioDetailResponse.status).toBe(200);

    process.env.LIVEKIT_API_KEY = "test-api-key";
    process.env.LIVEKIT_API_SECRET = "test-secret";

    const rolePlayTokenResponse = await app.request("http://localhost/api/sessions/token", {
      body: JSON.stringify({
        scenarioId,
        selectedCharacterIndex: 1,
        sessionType: "role-play",
      }),
      headers: {
        Cookie: student.cookie,
        "Content-Type": "application/json",
      },
      method: "POST",
    });

    expect(rolePlayTokenResponse.status).toBe(200);

    const rolePlayTokenBody = (await rolePlayTokenResponse.json()) as { roomName: string; token: string };
    const verifier = new TokenVerifier("test-api-key", "test-secret");
    const decodedToken = await verifier.verify(rolePlayTokenBody.token);
    const agentMetadata = JSON.parse(decodedToken.roomConfig?.agents?.[0]?.metadata ?? "{}") as {
      sessionHistoryId: string;
    };

    expect(decodedToken.roomConfig?.name).toBe(rolePlayTokenBody.roomName);
    expect(agentMetadata.sessionHistoryId).toBeTruthy();

    const rolePlayBootstrapResponse = await app.request(
      `http://localhost/api/internal/agent/sessions/${agentMetadata.sessionHistoryId}`,
      {
        headers: {
          Authorization: "Bearer english-coach-local-api-token",
        },
      },
    );

    expect(rolePlayBootstrapResponse.status).toBe(200);
    expect(rolePlayBootstrapResponse.json()).resolves.toMatchObject({
      roomName: rolePlayTokenBody.roomName,
      scenario: {
        id: scenarioId,
      },
      selectedCharacterIndex: 1,
      sessionHistoryId: agentMetadata.sessionHistoryId,
      sessionType: "role-play",
      userId: student.userId,
    });

    const freeFormContextId = crypto.randomUUID();
    const freeFormSessionId = crypto.randomUUID();
    const now = new Date().toISOString();

    await db.insert(freeFormContexts).values({
      content: "Review a conversation about ordering food politely.",
      createdAt: now,
      id: freeFormContextId,
    });

    await db.insert(sessionHistory).values({
      endedAt: now,
      freeFormContextId,
      id: freeFormSessionId,
      review: "## Review\nStrong use of polite requests.",
      sessionType: "free-form",
      startedAt: now,
      userId: student.userId,
    });

    await db.insert(sessionErrors).values({
      dimension: "lexical",
      errorDescription: "Incorrect word choice for a menu item.",
      id: crypto.randomUUID(),
      sessionHistoryId: freeFormSessionId,
      suggestion: "Ask whether 'I'd like a coffee' sounds more natural here.",
      utterance: "I'd like a coffee.",
    });

    await db.insert(sessionTranscripts).values({
      annotations: [
        {
          id: `history-annotation-${freeFormSessionId}`,
          kind: "coaching",
          text: "Ask why the verb changes in the past tense.",
          transcriptTurnIndex: 1,
        },
      ],
      createdAt: now,
      id: crypto.randomUUID(),
      rewrittenTurns: [{ text: "I went to the cafe yesterday.", transcriptTurnIndex: 1 }],
      sessionHistoryId: freeFormSessionId,
      turns: [
        { speaker: "assistant", text: "What would you like?", timestampMs: Date.now() },
        { speaker: "user", text: "I'd like a coffee.", timestampMs: Date.now() + 1_000 },
      ],
    });

    const freeFormBootstrapResponse = await app.request(
      `http://localhost/api/internal/agent/sessions/${freeFormSessionId}`,
      {
        headers: {
          Authorization: "Bearer english-coach-local-api-token",
        },
      },
    );

    expect(freeFormBootstrapResponse.status).toBe(200);
    expect(freeFormBootstrapResponse.json()).resolves.toMatchObject({
      contextDocument: "Review a conversation about ordering food politely.",
      freeFormContextId,
      roomName: `session-${freeFormSessionId}`,
      sessionHistoryId: freeFormSessionId,
      sessionType: "free-form",
      userId: student.userId,
    });

    const historyListResponse = await app.request("http://localhost/api/history?limit=1&offset=0", {
      headers: {
        Cookie: student.cookie,
      },
    });

    expect(historyListResponse.status).toBe(200);
    expect(historyListResponse.json()).resolves.toMatchObject({
      items: [
        expect.objectContaining({
          canReopen: true,
          id: freeFormSessionId,
          title: "Free-form",
        }),
      ],
      limit: 1,
      offset: 0,
      page: 1,
      pageSize: 1,
      total: expect.any(Number),
      totalPages: expect.any(Number),
    });

    const filteredHistoryResponse = await app.request(
      `http://localhost/api/history?sessionType=free-form&search=${encodeURIComponent("polite")}&sortBy=startedAt&sortDirection=desc&page=1&pageSize=5`,
      {
        headers: {
          Cookie: student.cookie,
        },
      },
    );

    expect(filteredHistoryResponse.status).toBe(200);
    const filteredHistoryBody = (await filteredHistoryResponse.json()) as {
      items: Array<{ id: string; sessionType: string }>;
      page: number;
      pageSize: number;
    };

    expect(filteredHistoryBody.page).toBe(1);
    expect(filteredHistoryBody.pageSize).toBe(5);
    expect(filteredHistoryBody.items).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: freeFormSessionId, sessionType: "free-form" })]),
    );

    await db.insert(sessionKnowledgePointOccurrences).values({
      id: crypto.randomUUID(),
      knowledgeItemId: createdKnowledgeItem.id,
      proposedPattern: "I went to <place> yesterday",
      sessionHistoryId: freeFormSessionId,
      transcriptTurnIndex: 1,
      utterance: "I went to the cafe yesterday.",
    });

    const historyDetailResponse = await app.request(`http://localhost/api/history/${freeFormSessionId}`, {
      headers: {
        Cookie: student.cookie,
      },
    });

    expect(historyDetailResponse.status).toBe(200);
    const historyDetailBody = (await historyDetailResponse.json()) as {
      errors: Array<{ dimension: string; matchedTranscriptTurnIndex: number | null }>;
      knowledgeItems: Array<{
        knowledgeItemId: string;
        occurrences: Array<{ transcriptTurnIndex: number }>;
        speaker: string;
      }>;
      rewrittenTranscript: Array<{ text: string; transcriptTurnIndex: number }>;
      session: { canReopen: boolean; id: string; title: string };
      transcript: Array<{ speaker: string }>;
      transcriptAnnotations: Array<{ kind: string; text: string; transcriptTurnIndex: number }>;
      transcriptTurnAnchors: Array<{ id: string; turnLabel: string }>;
    };

    expect(historyDetailBody.session).toMatchObject({
      canReopen: true,
      id: freeFormSessionId,
      title: "Free-form",
    });
    expect(historyDetailBody.errors).toEqual(
      expect.arrayContaining([expect.objectContaining({ dimension: "lexical", matchedTranscriptTurnIndex: 1 })]),
    );
    expect(historyDetailBody.knowledgeItems).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          knowledgeItemId: createdKnowledgeItem.id,
          occurrences: expect.arrayContaining([expect.objectContaining({ transcriptTurnIndex: 1 })]),
          speaker: "user",
        }),
      ]),
    );
    expect(historyDetailBody.rewrittenTranscript).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ text: "I went to the cafe yesterday.", transcriptTurnIndex: 1 }),
      ]),
    );
    expect(historyDetailBody.transcriptAnnotations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: `history-annotation-${freeFormSessionId}`,
          kind: "coaching",
          text: "Ask why the verb changes in the past tense.",
          transcriptTurnIndex: 1,
        }),
      ]),
    );
    expect(historyDetailBody.transcriptTurnAnchors).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: "turn-0", turnLabel: "Turn 1" })]),
    );
    expect(historyDetailBody.transcript).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ speaker: "assistant" }),
        expect.objectContaining({ speaker: "user" }),
      ]),
    );

    const rolePlayAnnotationResponse = await app.request(
      `http://localhost/api/internal/agent/sessions/${agentMetadata.sessionHistoryId}/transcript-annotations`,
      {
        body: JSON.stringify(
          transcriptAnnotationUpsertRequestSchema.parse({
            annotations: [
              {
                id: `role-play-annotation-${agentMetadata.sessionHistoryId}`,
                kind: "goal-progress",
                source: "role-play-live",
                text: "Completed goal: Order a drink",
                transcriptTurnIndex: 0,
              },
            ],
          }),
        ),
        headers: {
          Authorization: "Bearer english-coach-local-api-token",
          "Content-Type": "application/json",
        },
        method: "POST",
      },
    );

    expect(rolePlayAnnotationResponse.status).toBe(200);

    const rolePlayHistoryDetailResponse = await app.request(
      `http://localhost/api/history/${agentMetadata.sessionHistoryId}`,
      {
        headers: {
          Cookie: student.cookie,
        },
      },
    );

    expect(rolePlayHistoryDetailResponse.status).toBe(200);
    expect(rolePlayHistoryDetailResponse.json()).resolves.toMatchObject({
      session: {
        canReopen: false,
        id: agentMetadata.sessionHistoryId,
        sessionType: "role-play",
      },
      transcriptAnnotations: [
        expect.objectContaining({
          kind: "goal-progress",
          source: "role-play-live",
          text: "Completed goal: Order a drink",
          transcriptTurnIndex: 0,
        }),
      ],
    });

    process.env.SCENARIO_GENERATE_SSE_MAX_DURATION_MS = "25";

    try {
      const timeoutResponse = await app.request(
        "http://localhost/api/scenarios/generate/events?submissionId=timeout-check&limit=1",
        {
          headers: {
            Cookie: admin.cookie,
          },
        },
      );

      expect(timeoutResponse.status).toBe(200);
      const timeoutPayload = await timeoutResponse.text();

      expect(timeoutPayload).toContain("event: connected");
    } finally {
      delete process.env.SCENARIO_GENERATE_SSE_MAX_DURATION_MS;
    }

    const deleteKnowledgeItemResponse = await app.request(
      `http://localhost/api/admin/knowledge-items/${createdKnowledgeItem.id}`,
      {
        headers: {
          Cookie: admin.cookie,
        },
        method: "DELETE",
      },
    );

    expect(deleteKnowledgeItemResponse.status).toBe(204);

    const deleteScenarioResponse = await app.request(`http://localhost/api/scenarios/${scenarioId}`, {
      headers: {
        Cookie: admin.cookie,
      },
      method: "DELETE",
    });

    expect(deleteScenarioResponse.status).toBe(204);
  }, 60000);

  test("lists learner knowledge points and returns transcript-linked occurrences for the current user only", async () => {
    const student = await signUpAndCreateSession("student-knowledge-points");
    const otherStudent = await signUpAndCreateSession("student-knowledge-points-other");
    const now = new Date().toISOString();
    const knowledgeItemId = crypto.randomUUID();
    const firstContextId = crypto.randomUUID();
    const secondContextId = crypto.randomUUID();
    const otherContextId = crypto.randomUUID();
    const firstSessionId = crypto.randomUUID();
    const secondSessionId = crypto.randomUUID();
    const otherSessionId = crypto.randomUUID();

    await db.insert(knowledgeItems).values({
      communicativeFunction: "make_request_or_offer",
      createdAt: now,
      fixednessLevel: "fixed_expression",
      id: knowledgeItemId,
      isPendingReview: false,
      pattern: `I'd like <np> phase7 ${Date.now()}`,
      senses: [],
      syntaxRole: "clause_pattern",
      updatedAt: now,
    });

    await db.insert(freeFormContexts).values([
      { content: "Order food politely.", createdAt: now, id: firstContextId },
      { content: "Ask for help politely.", createdAt: now, id: secondContextId },
      { content: "Other learner context.", createdAt: now, id: otherContextId },
    ]);

    await db.insert(sessionHistory).values([
      {
        endedAt: now,
        freeFormContextId: firstContextId,
        id: firstSessionId,
        review: "## Review\nPolite request forms are improving.",
        sessionType: "free-form",
        startedAt: now,
        userId: student.userId,
      },
      {
        endedAt: now,
        freeFormContextId: secondContextId,
        id: secondSessionId,
        review: "## Review\nKeep softening requests.",
        sessionType: "free-form",
        startedAt: now,
        userId: student.userId,
      },
      {
        endedAt: now,
        freeFormContextId: otherContextId,
        id: otherSessionId,
        review: "## Review\nOther learner review.",
        sessionType: "free-form",
        startedAt: now,
        userId: otherStudent.userId,
      },
    ]);

    await db.insert(sessionKnowledgePointOccurrences).values([
      {
        id: crypto.randomUUID(),
        knowledgeItemId,
        proposedPattern: "I'd like <np>",
        sessionHistoryId: firstSessionId,
        transcriptTurnIndex: 1,
        utterance: "I'd like a coffee.",
      },
      {
        id: crypto.randomUUID(),
        knowledgeItemId,
        proposedPattern: "I'd like <np>",
        sessionHistoryId: firstSessionId,
        transcriptTurnIndex: 3,
        utterance: "I'd like some water.",
      },
      {
        id: crypto.randomUUID(),
        knowledgeItemId,
        proposedPattern: "I'd like to <verb>",
        sessionHistoryId: secondSessionId,
        transcriptTurnIndex: 0,
        utterance: "I'd like to help.",
      },
      {
        id: crypto.randomUUID(),
        knowledgeItemId,
        proposedPattern: "I'd like <np>",
        sessionHistoryId: otherSessionId,
        transcriptTurnIndex: 2,
        utterance: "I'd like a discount.",
      },
    ]);

    const listResponse = await app.request(
      "http://localhost/api/knowledge-points?page=1&pageSize=10&sortBy=totalOccurrences&sortDirection=desc",
      {
        headers: {
          Cookie: student.cookie,
        },
      },
    );

    expect(listResponse.status).toBe(200);
    expect(listResponse.json()).resolves.toMatchObject({
      items: [
        expect.objectContaining({
          agentOccurrenceCount: 0,
          id: knowledgeItemId,
          sessionCount: 2,
          totalOccurrences: 3,
          userOccurrenceCount: 0,
        }),
      ],
      page: 1,
      pageSize: 10,
      total: 1,
    });

    const detailResponse = await app.request(`http://localhost/api/knowledge-points/${knowledgeItemId}`, {
      headers: {
        Cookie: student.cookie,
      },
    });

    expect(detailResponse.status).toBe(200);
    expect(detailResponse.json()).resolves.toEqual(
      expect.objectContaining({
        id: knowledgeItemId,
        occurrences: expect.arrayContaining([
          expect.objectContaining({
            excerpt: "I'd like a coffee.",
            sessionHistoryId: firstSessionId,
            sessionTitle: "Free-form",
            speaker: "user",
            transcriptTurnIndex: 1,
          }),
          expect.objectContaining({
            excerpt: "I'd like some water.",
            sessionHistoryId: firstSessionId,
            sessionTitle: "Free-form",
            speaker: "user",
            transcriptTurnIndex: 3,
          }),
          expect.objectContaining({
            excerpt: "I'd like to help.",
            sessionHistoryId: secondSessionId,
            sessionTitle: "Free-form",
            speaker: "assistant",
            transcriptTurnIndex: 0,
          }),
        ]),
        sessionCount: 2,
        totalOccurrences: 3,
      }),
    );
  });
});
