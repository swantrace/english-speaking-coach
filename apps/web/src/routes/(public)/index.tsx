import { ArrowUpRight, Badge, BookOpen, Button, ClipboardList, Sparkles } from "@english-coach/ui";
import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/(public)/")({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <main className="overflow-hidden">
      <section className="relative">
        <div className="absolute inset-x-0 top-0 -z-10 h-64 bg-[radial-gradient(circle_at_top_left,_rgba(191,219,254,0.85),_transparent_45%),radial-gradient(circle_at_top_right,_rgba(251,191,36,0.32),_transparent_42%)]" />
        <div className="mx-auto grid max-w-7xl gap-12 px-4 py-16 lg:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)] lg:px-6 lg:py-24">
          <div className="max-w-3xl">
            <Badge
              className="rounded-full border border-sky-200 bg-white/80 px-4 py-1 text-[11px] font-semibold uppercase tracking-[0.28em] text-sky-700 shadow-sm backdrop-blur-sm"
              variant="outline"
            >
              English practice with structure
            </Badge>
            <h1 className="mt-6 max-w-2xl text-5xl font-semibold tracking-tight text-slate-950 sm:text-6xl">
              Build confident spoken English with coaching that feels focused, not overwhelming.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-700">
              English Coach helps learners practice realistic scenarios, get consistent feedback, and keep momentum.
              Instead of guessing what to study next, you move through guided exercises designed to sharpen fluency one
              conversation at a time.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Button asChild className="h-11 rounded-full bg-slate-950 px-6 text-white hover:bg-slate-800">
                <Link to="/signup">Start free</Link>
              </Button>
              <Button asChild className="h-11 rounded-full border-slate-300 bg-white/90 px-6" variant="outline">
                <Link to="/login">I already have an account</Link>
              </Button>
            </div>
            <div className="mt-10 grid gap-4 sm:grid-cols-3">
              <div className="rounded-3xl border border-white/70 bg-white/75 p-5 shadow-sm backdrop-blur-sm">
                <p className="text-3xl font-semibold text-slate-950">Realistic</p>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Practice situations that feel close to the conversations you actually want to have.
                </p>
              </div>
              <div className="rounded-3xl border border-white/70 bg-white/75 p-5 shadow-sm backdrop-blur-sm">
                <p className="text-3xl font-semibold text-slate-950">Guided</p>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Learn with clear prompts and feedback instead of staring at a blank page.
                </p>
              </div>
              <div className="rounded-3xl border border-white/70 bg-white/75 p-5 shadow-sm backdrop-blur-sm">
                <p className="text-3xl font-semibold text-slate-950">Consistent</p>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Keep a repeatable speaking habit with a system that makes daily progress visible.
                </p>
              </div>
            </div>
          </div>

          <div className="relative">
            <div className="absolute -right-8 top-10 -z-10 h-40 w-40 rounded-full bg-amber-200/40 blur-3xl" />
            <div className="absolute -left-8 bottom-12 -z-10 h-40 w-40 rounded-full bg-sky-300/30 blur-3xl" />
            <div className="rounded-[2rem] border border-stone-200/80 bg-slate-950 p-6 text-slate-50 shadow-2xl shadow-slate-900/15">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-300">Today’s focus</p>
                  <h2 className="mt-2 text-2xl font-semibold">Speak with clarity in everyday situations</h2>
                </div>
                <Sparkles className="size-8 text-amber-300" />
              </div>
              <div className="mt-8 space-y-4">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="flex items-start gap-3">
                    <BookOpen className="mt-0.5 size-5 text-sky-300" />
                    <div>
                      <p className="font-medium text-white">Scenario-based practice</p>
                      <p className="mt-1 text-sm leading-6 text-slate-300">
                        Rehearse common situations like introductions, meetings, travel, and daily small talk.
                      </p>
                    </div>
                  </div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="flex items-start gap-3">
                    <ClipboardList className="mt-0.5 size-5 text-amber-300" />
                    <div>
                      <p className="font-medium text-white">Structured feedback loops</p>
                      <p className="mt-1 text-sm leading-6 text-slate-300">
                        Understand what to improve next instead of repeating the same mistakes without direction.
                      </p>
                    </div>
                  </div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <p className="text-sm uppercase tracking-[0.24em] text-slate-400">Momentum</p>
                  <div className="mt-4 grid grid-cols-3 gap-3 text-center">
                    <div className="rounded-2xl bg-white/5 px-3 py-4">
                      <p className="text-2xl font-semibold text-white">10m</p>
                      <p className="mt-1 text-xs text-slate-400">daily practice</p>
                    </div>
                    <div className="rounded-2xl bg-white/5 px-3 py-4">
                      <p className="text-2xl font-semibold text-white">1</p>
                      <p className="mt-1 text-xs text-slate-400">clear next step</p>
                    </div>
                    <div className="rounded-2xl bg-white/5 px-3 py-4">
                      <p className="text-2xl font-semibold text-white">100%</p>
                      <p className="mt-1 text-xs text-slate-400">focused on speaking</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-20 lg:px-6">
        <div className="grid gap-6 lg:grid-cols-3">
          <article className="rounded-[2rem] border border-stone-200 bg-white/85 p-8 shadow-sm">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-stone-500">Why it works</p>
            <h2 className="mt-4 text-2xl font-semibold text-slate-950">Built to reduce hesitation</h2>
            <p className="mt-3 text-sm leading-7 text-slate-600">
              Good practice feels specific. The app helps you prepare for real speaking moments instead of collecting
              random vocabulary without context.
            </p>
          </article>
          <article className="rounded-[2rem] border border-stone-200 bg-white/85 p-8 shadow-sm">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-stone-500">For busy learners</p>
            <h2 className="mt-4 text-2xl font-semibold text-slate-950">Short sessions still compound</h2>
            <p className="mt-3 text-sm leading-7 text-slate-600">
              You do not need huge study blocks. A focused routine with the right prompts can create steady confidence
              over time.
            </p>
          </article>
          <article className="rounded-[2rem] border border-stone-200 bg-white/85 p-8 shadow-sm">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-stone-500">Next step</p>
            <h2 className="mt-4 text-2xl font-semibold text-slate-950">Create an account and start practicing</h2>
            <p className="mt-3 text-sm leading-7 text-slate-600">
              Join now to move from passive studying to active, repeatable speaking practice with clear direction.
            </p>
            <Button asChild className="mt-6 rounded-full px-5">
              <Link to="/signup">
                Create your account
                <ArrowUpRight />
              </Link>
            </Button>
          </article>
        </div>
      </section>
    </main>
  );
}
