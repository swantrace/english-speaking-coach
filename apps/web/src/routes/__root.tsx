import { createRootRoute } from "@tanstack/react-router";
import { RootLayout } from "../features/layout/root-layout";

export const Route = createRootRoute({
  component: RootLayout,
});
