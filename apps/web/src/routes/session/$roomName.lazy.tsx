import { createLazyFileRoute } from "@tanstack/react-router";
import { SessionPage } from "../../features/session/session-pages";

export const Route = createLazyFileRoute("/session/$roomName")({
  component: SessionPage,
});
