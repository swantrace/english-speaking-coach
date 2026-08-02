// @vitest-environment jsdom

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ConversationPlaylistPage } from "./conversation-playlist-page";

const playlistState = vi.hoisted(() => ({
  items: [
    {
      assetId: "asset-1",
      contentType: "audio/wav" as const,
      durationMs: 61_000,
      endedAt: "2026-08-01T00:00:00.000Z",
      sessionId: "session-1",
      title: "Hotel check-in",
    },
    {
      assetId: "asset-2",
      contentType: "audio/wav" as const,
      durationMs: 45_000,
      endedAt: "2026-07-31T00:00:00.000Z",
      sessionId: "session-2",
      title: "Ordering dinner",
    },
  ],
}));

vi.mock("../queries", () => ({
  useConversationPlaylistQuery: () => ({
    data: { items: playlistState.items },
    isError: false,
    isPending: false,
  }),
}));

vi.mock("@/components/media/use-private-media-access", () => ({
  privateMediaAccessQueryOptions: (assetId: string) => ({
    queryFn: async () => ({ url: `https://media.example.com/${assetId}.wav` }),
    queryKey: ["media-access", assetId],
  }),
  usePrivateMediaAccess: (assetId: string | null) => ({
    data: assetId ? { url: `https://media.example.com/${assetId}.wav` } : undefined,
    isError: false,
  }),
}));

vi.mock("@tanstack/react-router", async () => {
  const actual = await vi.importActual<typeof import("@tanstack/react-router")>("@tanstack/react-router");
  return {
    ...actual,
    Link: ({ children }: { children: React.ReactNode }) => <a href="/review">{children}</a>,
  };
});

function renderPlaylist() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <ConversationPlaylistPage />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue(undefined);
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("ConversationPlaylistPage", () => {
  it("advances automatically when the current conversation ends", async () => {
    const { container } = renderPlaylist();
    expect(screen.getAllByText("Hotel check-in").length).toBeGreaterThan(0);
    expect(container.querySelector("audio")?.getAttribute("src")).toContain("asset-1.wav");

    const audio = container.querySelector("audio");
    expect(audio).not.toBeNull();
    fireEvent.ended(audio as HTMLAudioElement);

    await waitFor(() => {
      expect(screen.getAllByText("Ordering dinner").length).toBeGreaterThan(0);
      expect(container.querySelector("audio")?.getAttribute("src")).toContain("asset-2.wav");
    });
    expect(HTMLMediaElement.prototype.play).toHaveBeenCalled();
  });

  it("allows direct selection and exposes repeat modes", () => {
    renderPlaylist();
    fireEvent.click(screen.getAllByText("Ordering dinner")[0] as HTMLElement);
    expect(screen.getAllByText("Ordering dinner").length).toBeGreaterThan(0);
    expect(screen.getByText("Repeat all")).toBeTruthy();
    expect(screen.getByText("Repeat one")).toBeTruthy();
    expect(screen.getByText("Stop at end")).toBeTruthy();
  });
});
