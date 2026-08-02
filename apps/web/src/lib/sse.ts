interface EventSourceListener {
  eventName: string;
  handleEvent: (event: MessageEvent<string>) => void;
}

interface ConnectEventSourceOptions {
  listeners: EventSourceListener[];
  onError?: () => void;
  onOpen?: () => void;
  url: string;
}

export function connectEventSource({ listeners, onError, onOpen, url }: ConnectEventSourceOptions) {
  const eventSource = new EventSource(url, { withCredentials: true });

  eventSource.onopen = () => {
    onOpen?.();
  };
  eventSource.onerror = () => {
    onError?.();
  };

  for (const listener of listeners) {
    eventSource.addEventListener(listener.eventName, listener.handleEvent as EventListener);
  }

  return () => {
    eventSource.close();
  };
}
