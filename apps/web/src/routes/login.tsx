import { createFileRoute } from "@tanstack/react-router";
import { LoginPage } from "../lib/app-pages";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});
