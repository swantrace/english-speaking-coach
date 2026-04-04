import { createFileRoute } from "@tanstack/react-router";
import { LandingPage } from "../features/auth/auth-pages";

export const Route = createFileRoute("/")({
  component: LandingPage,
});
