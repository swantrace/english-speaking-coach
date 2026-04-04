import { createFileRoute } from "@tanstack/react-router";
import { SessionPage } from "../../features/session/session-pages";

export const Route = createFileRoute("/session/$roomName")({
  component: SessionPage,
});
