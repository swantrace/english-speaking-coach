import { afterEach, describe, expect, it, vi } from "vitest";
import { connectEventSource } from "./sse";

class FakeEventSource {
  static latest: FakeEventSource | null = null;

  closed = false;
  listeners = new Map<string, EventListener>();
  onerror: ((event: Event) => void) | null = null;
  onopen: ((event: Event) => void) | null = null;

  constructor(
    readonly url: string,
    readonly options?: EventSourceInit,
  ) {
    FakeEventSource.latest = this;
  }

  addEventListener(eventName: string, listener: EventListener) {
    this.listeners.set(eventName, listener);
  }

  close() {
    this.closed = true;
  }
}

afterEach(() => {
  FakeEventSource.latest = null;
  vi.unstubAllGlobals();
});

describe("connectEventSource", () => {
  it("shares credentialed setup, named listeners, and cleanup", () => {
    vi.stubGlobal("EventSource", FakeEventSource);
    const handleEvent = vi.fn();
    const disconnect = connectEventSource({
      listeners: [{ eventName: "progress.updated", handleEvent }],
      url: "https://api.example.com/events",
    });
    const source = FakeEventSource.latest;

    expect(source?.url).toBe("https://api.example.com/events");
    expect(source?.options).toEqual({ withCredentials: true });
    expect(source?.listeners.has("progress.updated")).toBe(true);

    disconnect();
    expect(source?.closed).toBe(true);
  });
});
