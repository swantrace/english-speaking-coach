import { createRoot } from "react-dom/client";
import "./style.css";
import { Button } from "@english-coach/ui";

export const App = () => (
  <main className="relative min-h-screen overflow-hidden bg-background text-foreground">
    <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(14,165,233,0.18),_transparent_32%),radial-gradient(circle_at_bottom_left,_rgba(34,197,94,0.14),_transparent_28%)]" />
    <div className="relative mx-auto flex min-h-screen w-full max-w-5xl items-center px-6 py-20 sm:px-10">
      <section className="grid gap-8 md:max-w-2xl">
        <span className="w-fit rounded-full border border-border/70 bg-background/70 px-3 py-1 text-xs font-medium uppercase tracking-[0.24em] text-muted-foreground backdrop-blur">
          Tailwind + shadcn/ui
        </span>
        <div className="grid gap-4">
          <h1 className="max-w-3xl text-balance text-4xl font-semibold tracking-tight sm:text-5xl md:text-6xl">
            Shared UI components are now coming from the monorepo package.
          </h1>
          <p className="max-w-2xl text-pretty text-base leading-7 text-muted-foreground sm:text-lg">
            The starter counter and header have been removed. This screen is styled with Tailwind CSS, and the button
            below is exported from the shared shadcn/ui package in packages/ui.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <Button size="lg">Open shadcn/ui button</Button>
          <span className="text-sm text-muted-foreground">Imported from @english-coach/ui</span>
        </div>
      </section>
    </div>
  </main>
);

const root = document.getElementById("app");
if (root) {
  createRoot(root).render(<App />);
}
