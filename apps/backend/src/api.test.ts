import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import {
  type ScenarioGenerateJobUpdate,
  type ScenarioGenerateSubmissionResponse,
  scenarioGenerateSubmitPath,
} from "@english-coach/contract/scenario-generate";

import { app } from "./api";
import {
  getScenarioGenerateSnapshots,
  publishScenarioGenerateProgress,
  scenarioGenerateProgressChannel,
  scenarioGenerateQueue,
  scenarioGenerateUpdatedEvent,
  scenarioGenerateWorker,
} from "./lib/queues/scenario.generate";
import { createSubscriberRedisConnection } from "./lib/redis";

function parseSseEvents(payload: string) {
  return payload
    .trim()
    .split("\n\n")
    .filter(Boolean)
    .map((chunk) => {
      const lines = chunk.split("\n");
      const id = lines.find((line) => line.startsWith("id: "))?.slice(4);
      const event = lines.find((line) => line.startsWith("event: "))?.slice(7);
      const data = lines.find((line) => line.startsWith("data: "))?.slice(6);

      return {
        data: data ? (JSON.parse(data) as ScenarioGenerateJobUpdate) : null,
        event,
        id,
      };
    });
}

async function readScenarioEventsUntil(
  eventsUrl: string,
  sessionCookie: string,
  predicate: (event: { data: ScenarioGenerateJobUpdate | null; event?: string; id?: string }) => boolean,
) {
  const response = await app.request(`http://localhost${eventsUrl}`, {
    headers: {
      Cookie: sessionCookie,
    },
  });

  expect(response.status).toBe(200);
  expect(response.body).toBeTruthy();

  const reader = response.body?.getReader();

  if (!reader) {
    throw new Error("Missing SSE response body");
  }

  const decoder = new TextDecoder();
  let payload = "";

  while (true) {
    const { done, value } = await reader.read();

    if (done) {
      break;
    }

    payload += decoder.decode(value, { stream: true });

    const events = parseSseEvents(payload);

    if (events.some(predicate)) {
      await reader.cancel();
      return events;
    }
  }

  return parseSseEvents(payload);
}

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

async function signUpAndCreateSession() {
  const email = `coach-${Date.now()}@example.com`;
  const password = "password1234";

  const signUpResponse = await app.request("http://localhost/api/auth/sign-up/email", {
    body: JSON.stringify({
      email,
      name: "Coach Tester",
      password,
    }),
    headers: {
      "Content-Type": "application/json",
      origin: "http://localhost:5173",
    },
    method: "POST",
  });

  expect(signUpResponse.status).toBe(200);

  const setCookie = signUpResponse.headers.get("set-cookie");

  expect(setCookie).toBeTruthy();

  if (!setCookie) {
    throw new Error("Expected Better Auth sign-up response to set a session cookie");
  }

  return setCookie;
}

describe("scenario generation integration", () => {
  const subscriber = createSubscriberRedisConnection("scenario-test");

  beforeAll(async () => {
    await scenarioGenerateQueue.waitUntilReady();
    await scenarioGenerateWorker.waitUntilReady();
    await scenarioGenerateQueue.drain();
    await scenarioGenerateQueue.clean(0, 1000, "completed");
    await scenarioGenerateQueue.clean(0, 1000, "failed");
  });

  subscriber.on("error", () => {
    // Ignore subscriber-mode reconnect noise in integration tests.
  });

  afterAll(() => {
    subscriber.disconnect();
  });

  test("handles pubsub, batch submissions, enqueue failures, and failed SSE snapshots", async () => {
    const sessionCookie = await signUpAndCreateSession();

    await subscriber.subscribe(scenarioGenerateProgressChannel);

    const unauthorizedResponse = await app.request(`http://localhost${scenarioGenerateSubmitPath}`, {
      body: JSON.stringify({
        items: [
          {
            message: "anonymous request",
            queuedAt: new Date().toISOString(),
          },
        ],
      }),
      headers: {
        "Content-Type": "application/json",
      },
      method: "POST",
    });

    expect(unauthorizedResponse.status).toBe(401);
    await expect(unauthorizedResponse.json()).resolves.toEqual({
      error: "Authentication required",
    });

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

    await expect(expectedMessage).resolves.toMatchObject({
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
          {
            message: "integration test scenario",
            queuedAt: new Date().toISOString(),
          },
          {
            message: "",
          },
          {
            message: 123,
          },
        ],
      }),
      headers: {
        Cookie: sessionCookie,
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
    expect(generateBody.results).toHaveLength(3);
    expect(generateBody.results[0]?.status).toBe("queued");
    expect(generateBody.results[0]?.jobId).toBeTruthy();
    expect(generateBody.submissionId).toBeTruthy();
    expect(new URL(generateBody.eventsUrl, "http://localhost").searchParams.get("submissionId")).toBe(
      generateBody.submissionId,
    );
    expect(generateBody.results[1]).toMatchObject({
      cursor: 1,
      index: 1,
      status: "invalid_input",
    });
    expect(generateBody.results[2]).toMatchObject({
      cursor: 2,
      index: 2,
      status: "invalid_input",
    });

    const queuedJobId = generateBody.results[0]?.jobId;

    if (!queuedJobId) {
      throw new Error("Expected the first batch item to be queued");
    }

    await expect(
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

    const sseEvents = await readScenarioEventsUntil(
      generateBody.eventsUrl,
      sessionCookie,
      (event) =>
        event.event === scenarioGenerateUpdatedEvent &&
        event.data?.jobId === queuedJobId &&
        event.data.status === "completed",
    );

    expect(
      sseEvents.some(
        (event) =>
          event.event === scenarioGenerateUpdatedEvent &&
          event.data?.jobId === queuedJobId &&
          event.data.status === "completed" &&
          event.id === "0",
      ),
    ).toBe(true);

    const originalAdd = scenarioGenerateQueue.add.bind(scenarioGenerateQueue);

    Object.assign(scenarioGenerateQueue, {
      add: async () => {
        throw new Error("Redis unavailable");
      },
    });

    try {
      const generateResponse = await app.request(`http://localhost${scenarioGenerateSubmitPath}`, {
        body: JSON.stringify({
          items: [
            {
              message: "will fail to enqueue",
              queuedAt: new Date().toISOString(),
            },
          ],
        }),
        headers: {
          Cookie: sessionCookie,
          "Content-Type": "application/json",
        },
        method: "POST",
      });

      expect(generateResponse.status).toBe(200);

      const generateBody = (await generateResponse.json()) as ScenarioGenerateSubmissionResponse;

      expect(generateBody.summary).toEqual({
        enqueueFailed: 1,
        invalid: 0,
        queued: 0,
        total: 1,
      });
      expect(new URL(generateBody.eventsUrl, "http://localhost").searchParams.get("submissionId")).toBe(
        generateBody.submissionId,
      );
      expect(generateBody.results[0]).toMatchObject({
        cursor: 0,
        error: "Redis unavailable",
        index: 0,
        status: "enqueue_failed",
      });
    } finally {
      Object.assign(scenarioGenerateQueue, {
        add: originalAdd,
      });
    }

    const failedGenerateResponse = await app.request(`http://localhost${scenarioGenerateSubmitPath}`, {
      body: JSON.stringify({
        items: [
          {
            message: "integration failure scenario",
            queuedAt: new Date().toISOString(),
            shouldFail: true,
          },
        ],
      }),
      headers: {
        Cookie: sessionCookie,
        "Content-Type": "application/json",
      },
      method: "POST",
    });

    expect(failedGenerateResponse.status).toBe(200);

    const failedGenerateBody = (await failedGenerateResponse.json()) as ScenarioGenerateSubmissionResponse;

    const failedJobId = failedGenerateBody.results[0]?.jobId;

    if (!failedJobId) {
      throw new Error("Expected failing scenario job id");
    }

    const liveEvents = await readScenarioEventsUntil(
      failedGenerateBody.eventsUrl,
      sessionCookie,
      (event) =>
        event.event === scenarioGenerateUpdatedEvent &&
        event.data?.jobId === failedJobId &&
        event.data.status === "failed",
    );

    expect(
      liveEvents.some(
        (event) =>
          event.event === scenarioGenerateUpdatedEvent &&
          event.data?.jobId === failedJobId &&
          event.data.status === "failed" &&
          event.id === "0",
      ),
    ).toBe(true);

    const snapshotEvents = await readScenarioEventsUntil(
      failedGenerateBody.eventsUrl,
      sessionCookie,
      (event) =>
        event.event === scenarioGenerateUpdatedEvent &&
        event.data?.jobId === failedJobId &&
        event.data.status === "failed",
    );

    expect(
      snapshotEvents.some(
        (event) =>
          event.event === scenarioGenerateUpdatedEvent &&
          event.data?.jobId === failedJobId &&
          event.data.status === "failed" &&
          event.id === "0",
      ),
    ).toBe(true);

    await expect(
      getScenarioGenerateSnapshots({
        cursor: 0,
        limit: 1,
        submissionId: generateBody.submissionId,
      }),
    ).resolves.toHaveLength(0);
  }, 60000);
});
