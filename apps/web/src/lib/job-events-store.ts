import {
  type JobEventsSubmissionSummary,
  jobEventsConnectedEvent,
  jobEventsHeartbeatEvent,
  jobEventsSystemMessageSchema,
} from "@english-coach/contract/job-events";
import { z } from "zod";

export type JobEventsConnectionState = "connecting" | "open" | "closed" | "error";

export type JobEventsStoreJob<TJobEvent extends { jobId: string }> = TJobEvent & {
  updatedAt: string;
};

export interface JobEventsStoreState<TJobEvent extends { jobId: string }, TSubmissionResult> {
  connectionState: JobEventsConnectionState;
  eventsUrl: string;
  jobs: Array<JobEventsStoreJob<TJobEvent>>;
  lastConnectedAt?: string;
  lastError?: string;
  lastHeartbeatAt?: string;
  lastSubmissionSummary?: JobEventsSubmissionSummary;
  submissionResults: TSubmissionResult[];
  submitState: "idle" | "submitting";
}

function joinApiUrl(baseUrl: string, path: string) {
  return new URL(path, baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`).toString();
}

function sortJobs<TJobEvent extends { jobId: string }>(jobs: Map<string, JobEventsStoreJob<TJobEvent>>) {
  return [...jobs.values()].sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
}

interface CreateJobEventsStoreOptions<TSubmissionItem, TSubmissionResult, TJobEvent extends { jobId: string }> {
  apiBaseUrl: string;
  eventName: string;
  eventsPath: string;
  mapQueuedResultToJob: (result: TSubmissionResult) => TJobEvent | null;
  submissionItemSchema: z.ZodType<TSubmissionItem>;
  submissionResponseSchema: z.ZodType<{
    eventsUrl: string;
    results: TSubmissionResult[];
    summary: JobEventsSubmissionSummary;
  }>;
  submitPath: string;
  updatedEventSchema: z.ZodType<TJobEvent>;
}

export interface JobEventsStore<TSubmissionItem, TSubmissionResult, TJobEvent extends { jobId: string }> {
  connect: () => void;
  disconnect: () => void;
  getSnapshot: () => JobEventsStoreState<TJobEvent, TSubmissionResult>;
  submit: (items: TSubmissionItem[]) => Promise<{
    eventsUrl: string;
    results: TSubmissionResult[];
    summary: JobEventsSubmissionSummary;
  }>;
  subscribe: (listener: () => void) => () => void;
}

export function createJobEventsStore<TSubmissionItem, TSubmissionResult, TJobEvent extends { jobId: string }>(
  options: CreateJobEventsStoreOptions<TSubmissionItem, TSubmissionResult, TJobEvent>,
): JobEventsStore<TSubmissionItem, TSubmissionResult, TJobEvent> {
  const initialEventsUrl = joinApiUrl(options.apiBaseUrl, options.eventsPath);
  const submitUrl = joinApiUrl(options.apiBaseUrl, options.submitPath);
  const listeners = new Set<() => void>();
  const jobs = new Map<string, JobEventsStoreJob<TJobEvent>>();
  let eventSource: EventSource | null = null;

  let state: JobEventsStoreState<TJobEvent, TSubmissionResult> = {
    connectionState: "closed",
    eventsUrl: initialEventsUrl,
    jobs: [],
    submissionResults: [],
    submitState: "idle",
  };

  const emit = () => {
    state = {
      ...state,
      jobs: sortJobs(jobs),
      submissionResults: [...state.submissionResults],
    };

    for (const listener of listeners) {
      listener();
    }
  };

  const setState = (nextState: Partial<JobEventsStoreState<TJobEvent, TSubmissionResult>>) => {
    state = {
      ...state,
      ...nextState,
    };
    emit();
  };

  const upsertJob = (job: TJobEvent) => {
    jobs.set(job.jobId, {
      ...jobs.get(job.jobId),
      ...job,
      updatedAt: new Date().toISOString(),
    });
    emit();
  };

  const connectToUrl = (url: string, force = false) => {
    if (eventSource) {
      if (!force && state.eventsUrl === url) {
        return;
      }

      eventSource.close();
      eventSource = null;
    }

    setState({ connectionState: "connecting", eventsUrl: url, lastError: undefined });

    const source = new EventSource(url, { withCredentials: true });
    eventSource = source;

    source.addEventListener("open", () => {
      setState({ connectionState: "open", lastError: undefined });
    });

    source.addEventListener(jobEventsConnectedEvent, (event) => {
      if (!(event instanceof MessageEvent)) {
        return;
      }

      try {
        const parsedEvent = jobEventsSystemMessageSchema.safeParse(JSON.parse(event.data) as unknown);

        if (!parsedEvent.success) {
          setState({ lastError: `Invalid ${jobEventsConnectedEvent} payload` });
          return;
        }

        setState({ connectionState: "open", lastConnectedAt: new Date().toISOString() });
      } catch {
        setState({ lastError: `Failed to parse ${jobEventsConnectedEvent} payload` });
      }
    });

    source.addEventListener(jobEventsHeartbeatEvent, (event) => {
      if (!(event instanceof MessageEvent)) {
        return;
      }

      try {
        const parsedEvent = jobEventsSystemMessageSchema.safeParse(JSON.parse(event.data) as unknown);

        if (!parsedEvent.success) {
          setState({ lastError: `Invalid ${jobEventsHeartbeatEvent} payload` });
          return;
        }

        setState({ lastHeartbeatAt: new Date().toISOString() });
      } catch {
        setState({ lastError: `Failed to parse ${jobEventsHeartbeatEvent} payload` });
      }
    });

    source.addEventListener(options.eventName, (event) => {
      if (!(event instanceof MessageEvent)) {
        return;
      }

      try {
        const payload = JSON.parse(event.data) as unknown;
        const parsedEvent = options.updatedEventSchema.safeParse(payload);

        if (!parsedEvent.success) {
          setState({ lastError: `Invalid ${options.eventName} payload` });
          return;
        }

        upsertJob(parsedEvent.data);
      } catch {
        setState({ lastError: `Failed to parse ${options.eventName} payload` });
      }
    });

    source.addEventListener("error", () => {
      const nextConnectionState = source.readyState === EventSource.CLOSED ? "closed" : "error";

      if (nextConnectionState === "closed") {
        eventSource = null;
      }

      setState({
        connectionState: nextConnectionState,
        lastError: "Job events connection interrupted",
      });
    });
  };

  const connect = () => {
    connectToUrl(state.eventsUrl);
  };

  const disconnect = () => {
    if (!eventSource) {
      setState({ connectionState: "closed" });
      return;
    }

    eventSource.close();
    eventSource = null;
    setState({ connectionState: "closed", lastError: undefined });
  };

  const submit = async (items: TSubmissionItem[]) => {
    const parsedItems = z.array(options.submissionItemSchema).parse(items);
    const previousEventsUrl = state.eventsUrl;

    setState({ submitState: "submitting", lastError: undefined });
    connect();

    try {
      const response = await fetch(submitUrl, {
        body: JSON.stringify({ items: parsedItems }),
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        method: "POST",
      });

      const payload = (await response.json()) as unknown;
      const parsedResponse = options.submissionResponseSchema.safeParse(payload);

      if (!parsedResponse.success) {
        throw new Error("Invalid submission response");
      }

      for (const result of parsedResponse.data.results) {
        const queuedJob = options.mapQueuedResultToJob(result);

        if (!queuedJob) {
          continue;
        }

        upsertJob(queuedJob);
      }

      const nextEventsUrl = joinApiUrl(options.apiBaseUrl, parsedResponse.data.eventsUrl);

      setState({
        eventsUrl: nextEventsUrl,
        lastSubmissionSummary: parsedResponse.data.summary,
        submissionResults: parsedResponse.data.results,
        submitState: "idle",
      });

      if (!eventSource || previousEventsUrl !== nextEventsUrl) {
        connectToUrl(nextEventsUrl, true);
      }

      return parsedResponse.data;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to submit job request";
      setState({
        lastError: message,
        submitState: "idle",
      });
      throw error;
    }
  };

  return {
    connect,
    disconnect,
    getSnapshot: () => state,
    submit,
    subscribe(listener: () => void) {
      listeners.add(listener);

      return () => {
        listeners.delete(listener);
      };
    },
  };
}
