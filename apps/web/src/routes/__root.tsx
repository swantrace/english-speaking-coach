import { createRootRoute } from "@tanstack/react-router";
import { RootLayout } from "../lib/app-pages";

export const Route = createRootRoute({
  component: RootLayout,
});
