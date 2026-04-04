import { createFileRoute } from "@tanstack/react-router";
import { LoginPage } from "../features/auth/auth-pages";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});
