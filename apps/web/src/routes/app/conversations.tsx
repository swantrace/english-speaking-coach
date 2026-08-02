import { createFileRoute } from "@tanstack/react-router";
import { ConversationPlaylistPage } from "@/features/session/components/conversation-playlist-page";

export const Route = createFileRoute("/app/conversations")({
  component: ConversationPlaylistPage,
});
