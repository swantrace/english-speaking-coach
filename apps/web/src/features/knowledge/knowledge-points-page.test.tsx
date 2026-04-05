import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen } from "@testing-library/react";
import { useSyncExternalStore } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { KnowledgePointsPage } from "./knowledge-points-page";

const routerMockState = vi.hoisted(() => ({
  currentSearch: {
    page: 1,
    pageSize: 10,
    search: undefined,
    sortBy: "lastSeenAt" as const,
    sortDirection: "desc" as const,
  },
  listeners: new Set<() => void>(),
  navigate: vi.fn(),
}));

const mockStudentUser = {
  email: "student@example.com",
  id: "student-1",
  name: "Student",
  role: "student" as const,
};

const appDataMockState = vi.hoisted(() => ({
  useKnowledgePointDetail: vi.fn((knowledgeItemId?: string) => ({
    data:
      knowledgeItemId === "knowledge-1"
        ? {
            agentOccurrenceCount: 1,
            communicativeFunction: "make_request_or_offer" as const,
            createdAt: "2026-04-05T10:00:00.000Z",
            example: "I'd like a coffee, please.",
            fixednessLevel: "fixed_expression" as const,
            id: "knowledge-1",
            lastSeenAt: "2026-04-05T12:00:00.000Z",
            occurrences: [
              {
                excerpt: "I'd like a coffee.",
                id: "occurrence-1",
                occurrenceCount: 1,
                sessionEndedAt: "2026-04-05T12:00:00.000Z",
                sessionHistoryId: "session-1",
                sessionStartedAt: "2026-04-05T11:55:00.000Z",
                sessionTitle: "Free-form",
                sessionType: "free-form" as const,
                speaker: "user" as const,
                transcriptTurnIndex: 2,
              },
            ],
            pattern: "I'd like <np>",
            reviewStatus: "approved" as const,
            reviewedAt: "2026-04-05T10:01:00.000Z",
            reviewedByUserId: "admin-1",
            sessionCount: 2,
            source: "admin" as const,
            submissionId: null,
            syntaxRole: "clause_pattern" as const,
            totalOccurrences: 3,
            updatedAt: "2026-04-05T12:00:00.000Z",
            userOccurrenceCount: 2,
          }
        : undefined,
    error: null,
    isPending: false,
  })),
  useKnowledgePoints: vi.fn(() => ({
    data: {
      items: [
        {
          agentOccurrenceCount: 1,
          communicativeFunction: "make_request_or_offer" as const,
          createdAt: "2026-04-05T10:00:00.000Z",
          example: "I'd like a coffee, please.",
          fixednessLevel: "fixed_expression" as const,
          id: "knowledge-1",
          lastSeenAt: "2026-04-05T12:00:00.000Z",
          pattern: "I'd like <np>",
          reviewStatus: "approved" as const,
          reviewedAt: "2026-04-05T10:01:00.000Z",
          reviewedByUserId: "admin-1",
          sessionCount: 2,
          source: "admin" as const,
          submissionId: null,
          syntaxRole: "clause_pattern" as const,
          totalOccurrences: 3,
          updatedAt: "2026-04-05T12:00:00.000Z",
          userOccurrenceCount: 2,
        },
      ],
      limit: 10,
      offset: 0,
      page: 1,
      pageSize: 10,
      total: 1,
      totalPages: 1,
    },
    error: null,
    isPending: false,
  })),
  useViewer: vi.fn(() => ({ data: { user: mockStudentUser }, isPending: false })),
}));

vi.mock("@tanstack/react-router", async () => {
  const actual = await vi.importActual<typeof import("@tanstack/react-router")>("@tanstack/react-router");

  return {
    ...actual,
    Link: ({ children, ...props }: { children: React.ReactNode }) => <a {...props}>{children}</a>,
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
    useKnowledgePointDetail: appDataMockState.useKnowledgePointDetail,
    useKnowledgePoints: appDataMockState.useKnowledgePoints,
    useViewer: appDataMockState.useViewer,
  };
});

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
      <KnowledgePointsPage />
    </QueryClientProvider>,
  );
}

describe("KnowledgePointsPage", () => {
  beforeEach(() => {
    routerMockState.currentSearch = {
      page: 1,
      pageSize: 10,
      search: undefined,
      sortBy: "lastSeenAt",
      sortDirection: "desc",
    };
    routerMockState.navigate.mockClear();
  });

  it("renders tracked items and opens the read-only detail modal", () => {
    renderPage();

    expect(screen.getByText("I'd like <np>")).toBeTruthy();
    expect(screen.getByText(/you: 2/i)).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: /inspect/i }));

    expect(screen.getByRole("heading", { name: /i'd like <np>/i })).toBeTruthy();
    expect(screen.getByText(/open turn/i)).toBeTruthy();
    expect(screen.getByText(/linked turns/i)).toBeTruthy();
  });
});
