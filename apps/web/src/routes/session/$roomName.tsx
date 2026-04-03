import { createFileRoute } from "@tanstack/react-router";
import { SessionPage } from "../../lib/app-pages";

export const Route = createFileRoute("/session/$roomName")({
  component: SessionPage,
});
