import { createLazyFileRoute } from "@tanstack/react-router";
import { LandingPage } from "../features/auth/landing-page";

export const Route = createLazyFileRoute("/")({
  component: LandingPage,
});
