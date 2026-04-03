import { createFileRoute } from "@tanstack/react-router";
import { HomeRedirectPage } from "../lib/app-pages";

export const Route = createFileRoute("/")({
  component: HomeRedirectPage,
});
