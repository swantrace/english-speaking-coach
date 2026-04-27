import { Button, Input, SendHorizontal } from "@english-coach/ui";
import { useChat } from "@livekit/components-react";
import { type FormEvent, useMemo, useState } from "react";
import { selectConnectionStatus } from "../runtime/selectors";
import { useSessionRuntimeStore } from "../runtime/store";

export function SessionTextComposer() {
  const [message, setMessage] = useState("");
  const [sendError, setSendError] = useState<string | null>(null);
  const status = useSessionRuntimeStore(selectConnectionStatus);
  const chatOptions = useMemo(() => ({}), []);
  const { isSending, send } = useChat(chatOptions);
  const upsertTranscriptTurn = useSessionRuntimeStore((state) => state.upsertTranscriptTurn);
  const trimmedMessage = message.trim();
  const isDisabled = status !== "connected" || isSending;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!trimmedMessage || isDisabled) {
      return;
    }

    setSendError(null);

    try {
      const sentMessage = await send(trimmedMessage);
      upsertTranscriptTurn({
        id: `chat:${sentMessage.id}`,
        order: sentMessage.timestamp,
        speaker: "user",
        speakerLabel: "You",
        status: "final",
        text: sentMessage.message.trim(),
        timestampMs: sentMessage.timestamp,
      });
      setMessage("");
    } catch (error) {
      setSendError(error instanceof Error ? error.message : "Message failed to send.");
    }
  }

  return (
    <section className="rounded-[1.5rem] border border-stone-200 bg-white px-4 py-3 shadow-xs">
      <form className="flex flex-col gap-3 sm:flex-row" onSubmit={handleSubmit}>
        <Input
          aria-label="Text message"
          autoComplete="off"
          className="h-10 flex-1 bg-stone-50"
          disabled={isDisabled}
          onChange={(event) => setMessage(event.target.value)}
          placeholder={status === "connected" ? "Type to the coach" : "Connect before typing"}
          value={message}
        />
        <Button className="h-10 shrink-0" disabled={isDisabled || !trimmedMessage} type="submit">
          <SendHorizontal aria-hidden="true" className="size-4" />
          Send
        </Button>
      </form>
      {sendError ? <p className="mt-2 text-sm text-red-600">{sendError}</p> : null}
    </section>
  );
}
