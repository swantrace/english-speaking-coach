import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen } from "@testing-library/react";
import { useSyncExternalStore } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AdminKnowledgeItemsPage } from "./admin-knowledge-page";

const routerMockState = vi.hoisted(() => ({
  currentSearch: {
    page: 1,
    pageSize: 10,
    reviewStatus: undefined,
    search: undefined,
    sortBy: "updatedAt" as const,
    sortDirection: "desc" as const,
    source: "all" as const,
    tab: "manage" as const,
  },
  listeners: new Set<() => void>(),
  navigate: vi.fn(),
}));

const mockAdminUser = {
  email: "admin@example.com",
  id: "admin-1",
  name: "Admin",
  role: "admin" as const,
};

const manageItem = {
  communicativeFunction: "make_request_or_offer" as const,
  createdAt: "2026-04-05T10:00:00.000Z",
  example: "I'd like a receipt, please.",
  fixednessLevel: "fixed_expression" as const,
  id: "knowledge-1",
  pattern: "I'd like <np>",
  reviewStatus: "approved" as const,
  reviewedAt: "2026-04-05T10:01:00.000Z",
  reviewedByUserId: "admin-1",
  source: "admin" as const,
  submissionId: null,
  syntaxRole: "clause_pattern" as const,
  updatedAt: "2026-04-05T10:01:00.000Z",
};

const pendingItem = {
  communicativeFunction: "give_or_seek_information" as const,
  createdAt: "2026-04-05T11:00:00.000Z",
  example: "Could you explain the refund policy?",
  fixednessLevel: "restricted_collocation" as const,
  id: "knowledge-2",
  pattern: "Could you explain <np>",
  reviewStatus: "pending_review" as const,
  reviewedAt: null,
  reviewedByUserId: null,
  source: "auto_generated" as const,
  submissionId: "submission-1",
  syntaxRole: "clause_pattern" as const,
  updatedAt: "2026-04-05T11:00:00.000Z",
};

const appDataMockState = vi.hoisted(() => ({
  refetchHistory: vi.fn(),
  refetchPending: vi.fn(),
  useViewer: vi.fn(() => ({ data: { user: mockAdminUser }, isPending: false })),
  useKnowledgeItemsList: vi.fn((query: { reviewStatus?: string; source?: string }) => {
    const isPendingReviewQuery = query.reviewStatus === "pending_review" && query.source === "auto_generated";

    return {
      data: isPendingReviewQuery
        ? {
            items: [pendingItem],
            limit: 8,
            offset: 0,
            page: 1,
            pageSize: 8,
            total: 1,
            totalPages: 1,
          }
        : {
            items: [manageItem],
            limit: 10,
            offset: 0,
            page: 1,
            pageSize: 10,
            total: 1,
            totalPages: 1,
          },
      error: null,
      isPending: false,
      refetch: isPendingReviewQuery ? appDataMockState.refetchPending : vi.fn(),
    };
  }),
  useKnowledgeGenerateHistory: vi.fn(() => ({
    data: {
      items: [
        {
          createdAt: "2026-04-05T11:00:00.000Z",
          eventsUrl: "/api/admin/knowledge-items/generate/events?submissionId=submission-1&limit=50",
          id: "submission-1",
          jobs: [
            {
              cursor: 0,
              jobId: "job-1",
              message: "polite clarifying phrases",
              processedAt: "2026-04-05T11:01:00.000Z",
              progress: 100,
              queuedAt: "2026-04-05T11:00:00.000Z",
              status: "completed" as const,
              submissionId: "submission-1",
            },
          ],
          summary: {
            completed: 1,
            failed: 0,
            queued: 0,
            started: 0,
            totalJobs: 1,
          },
          totalCount: 3,
          updatedAt: "2026-04-05T11:01:00.000Z",
          userId: "admin-1",
        },
      ],
    },
    error: null,
    isPending: false,
    refetch: appDataMockState.refetchHistory,
  })),
}));

const knowledgeStoreMockState = vi.hoisted(() => ({
  connect: vi.fn(),
  connectToEventsUrl: vi.fn(),
  disconnect: vi.fn(),
  snapshot: {
    connectionState: "open" as const,
    eventsUrl: "/api/admin/knowledge-items/generate/events",
    jobs: [
      {
        cursor: 0,
        jobId: "live-job-1",
        message: "polite clarifying phrases",
        progress: 100,
        queuedAt: "2026-04-05T11:00:00.000Z",
        status: "completed" as const,
        submissionId: "submission-1",
        updatedAt: "2026-04-05T11:01:00.000Z",
      },
    ],
    lastConnectedAt: undefined,
    lastError: undefined,
    lastHeartbeatAt: undefined,
    lastSubmissionSummary: undefined,
    submissionResults: [],
    submitState: "idle" as const,
  },
}));

vi.mock("@tanstack/react-router", async () => {
  const actual = await vi.importActual<typeof import("@tanstack/react-router")>("@tanstack/react-router");

  return {
    ...actual,
    useNavigate: () => {
      return (options: { search?: unknown }) => {
        if (typeof options.search === "function") {
          routerMockState.currentSearch = options.search(routerMockState.currentSearch);
        }

        routerMockState.navigate(options);

        for (const listener of routerMockState.listeners) {
          listener();
        }

        return Promise.resolve();
      };
    },
    useSearch: () =>
      useSyncExternalStore(
        (listener) => {
          routerMockState.listeners.add(listener);

          return () => {
            routerMockState.listeners.delete(listener);
          };
        },
        () => routerMockState.currentSearch,
      ),
  };
});

vi.mock("../../lib/app-data", async () => {
  const actual = await vi.importActual<typeof import("../../lib/app-data")>("../../lib/app-data");

  return {
    ...actual,
    useKnowledgeGenerateHistory: appDataMockState.useKnowledgeGenerateHistory,
    useKnowledgeItemsList: appDataMockState.useKnowledgeItemsList,
    useViewer: appDataMockState.useViewer,
  };
});

vi.mock("../../lib/knowledge-generate-store", () => ({
  knowledgeGenerateStore: {
    connect: knowledgeStoreMockState.connect,
    connectToEventsUrl: knowledgeStoreMockState.connectToEventsUrl,
    disconnect: knowledgeStoreMockState.disconnect,
  },
  useKnowledgeGenerateStore: () => knowledgeStoreMockState.snapshot,
}));

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <AdminKnowledgeItemsPage />
    </QueryClientProvider>,
  );
}

describe("AdminKnowledgeItemsPage", () => {
  beforeEach(() => {
    routerMockState.currentSearch = {
      page: 1,
      pageSize: 10,
      reviewStatus: undefined,
      search: undefined,
      sortBy: "updatedAt",
      sortDirection: "desc",
      source: "all",
      tab: "manage",
    };
    routerMockState.navigate.mockClear();
    knowledgeStoreMockState.connect.mockClear();
    knowledgeStoreMockState.connectToEventsUrl.mockClear();
    knowledgeStoreMockState.disconnect.mockClear();
    appDataMockState.refetchHistory.mockClear();
    appDataMockState.refetchPending.mockClear();
  });

  it("renders the bulk generation tab state and reconnects a persisted submission stream", () => {
    routerMockState.currentSearch = {
      ...routerMockState.currentSearch,
      tab: "generate",
    };

    renderPage();

    expect(screen.getByRole("heading", { name: /recent submissions/i })).toBeTruthy();
    expect(screen.getByRole("heading", { name: /pending review queue/i })).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: /reconnect stream/i }));

    expect(knowledgeStoreMockState.connectToEventsUrl).toHaveBeenCalledWith(
      "/api/admin/knowledge-items/generate/events?submissionId=submission-1&limit=50",
    );
  });

  it("opens create and edit dialogs from the management tab", () => {
    renderPage();

    fireEvent.click(screen.getAllByRole("button", { name: /add knowledge item/i })[0]!);
    expect(screen.getByRole("heading", { name: /create knowledge item/i })).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: /cancel/i }));

    fireEvent.click(screen.getAllByRole("button", { name: /^edit$/i })[0]!);

    expect(screen.getByRole("heading", { name: /edit knowledge item/i })).toBeTruthy();
    expect(screen.getByDisplayValue("I'd like <np>")).toBeTruthy();
    expect(screen.getByDisplayValue("I'd like a receipt, please.")).toBeTruthy();
  });
});
