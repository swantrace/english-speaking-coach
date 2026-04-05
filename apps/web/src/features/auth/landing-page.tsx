import { Button } from "@english-coach/ui";
import { Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { getAuthenticatedHomePath, useViewer } from "../../lib/app-data";
import { Card, LoadingPanel, PageIntro } from "../../lib/app-shell";

export function LandingPage() {
  const navigate = useNavigate();
  const viewer = useViewer();

  useEffect(() => {
    if (viewer.isPending) {
      return;
    }

    if (viewer.data?.user) {
      void navigate({ replace: true, to: getAuthenticatedHomePath(viewer.data.user) });
    }
  }, [navigate, viewer.data?.user, viewer.isPending]);

  if (viewer.isPending) {
    return <LoadingPanel label="Checking session..." />;
  }

  if (viewer.data?.user) {
    return null;
  }

  return (
    <div className="grid gap-6">
      <PageIntro
        badge="Speak With Intent"
        description="English Coach combines guided role-play, open-ended practice, and reviewable session history so learners can move from scripted comfort to real conversational range without losing structure."
        title="Practice live spoken English with clear missions, real-time coaching, and review that keeps up with you."
        aside={
          <div className="grid gap-4 rounded-[24px] border border-white/10 bg-slate-950/55 p-5 shadow-[0_20px_80px_rgba(0,0,0,0.24)]">
            <div className="grid gap-2">
              <span className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-100/80">
                What changes here
              </span>
              <p className="text-sm leading-7 text-slate-300">
                Learners launch focused speaking sessions, track progress through transcript-first feedback, and return
                to previous conversations with concrete review cues instead of generic summaries.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button asChild className="min-w-[10rem]">
                <Link to="/login">Start practicing</Link>
              </Button>
              <Button asChild variant="outline">
                <a href="#how-it-works">See how it works</a>
              </Button>
            </div>
          </div>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="grid gap-3">
          <span className="text-xs font-semibold uppercase tracking-[0.24em] text-orange-100/80">Role-play</span>
          <h2 className="text-2xl text-white">Mission-based speaking practice</h2>
          <p className="text-sm leading-7 text-slate-300">
            Learners enter practical scenes with goals, characters, and lightweight progress tracking so each
            conversation has a clear outcome instead of vague practice time.
          </p>
        </Card>
        <Card className="grid gap-3">
          <span className="text-xs font-semibold uppercase tracking-[0.24em] text-emerald-100/80">Free-form</span>
          <h2 className="text-2xl text-white">Coach-led conversation without losing context</h2>
          <p className="text-sm leading-7 text-slate-300">
            Open practice stays grounded in a learner topic, then feeds short transcript-level hints that invite
            follow-up questions instead of interrupting the conversation.
          </p>
        </Card>
        <Card className="grid gap-3">
          <span className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-100/80">Review</span>
          <h2 className="text-2xl text-white">History that stays useful</h2>
          <p className="text-sm leading-7 text-slate-300">
            Completed sessions remain visible with transcripts, review notes, and knowledge traces, making it easier to
            revisit what actually happened in the conversation.
          </p>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]" id="how-it-works">
        <Card className="grid gap-5">
          <div className="grid gap-2">
            <span className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-300">How it works</span>
            <h2 className="text-3xl text-white">A practice loop built around speaking, not form fields</h2>
          </div>
          <div className="grid gap-4">
            {[
              {
                step: "01",
                title: "Pick a scenario or a context",
                description:
                  "Choose a role-play mission or jump into a free-form prompt that matches the learner’s current need.",
              },
              {
                step: "02",
                title: "Speak through the session live",
                description:
                  "The transcript stays primary while the interface surfaces light-touch cues beneath the turns that matter.",
              },
              {
                step: "03",
                title: "Review what actually happened",
                description:
                  "Learners can revisit ended sessions and connect errors, knowledge points, and coaching notes back to the conversation itself.",
              },
            ].map((item) => (
              <div className="grid gap-2 rounded-[22px] border border-white/10 bg-white/[0.03] p-4" key={item.step}>
                <div className="flex items-center gap-3">
                  <span className="rounded-full border border-white/10 bg-white/[0.06] px-3 py-1 text-xs font-semibold tracking-[0.2em] text-slate-200">
                    {item.step}
                  </span>
                  <h3 className="text-lg text-white">{item.title}</h3>
                </div>
                <p className="text-sm leading-7 text-slate-300">{item.description}</p>
              </div>
            ))}
          </div>
        </Card>

        <Card className="grid gap-5">
          <div className="grid gap-2">
            <span className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-300">For teams</span>
            <h2 className="text-3xl text-white">Admins review and shape the practice surface</h2>
          </div>
          <p className="text-sm leading-7 text-slate-300">
            Scenario and knowledge management stay behind the authenticated admin flow, with review-driven curation so
            learner-facing content can grow without turning into an unmoderated dump of generated material.
          </p>
          <div className="grid gap-3">
            <div className="rounded-[20px] border border-amber-300/20 bg-amber-300/10 p-4 text-sm leading-7 text-amber-50">
              Admins land in scenario management after login, keeping publishing and review work separate from the
              learner browsing surface.
            </div>
            <div className="rounded-[20px] border border-cyan-300/20 bg-cyan-300/10 p-4 text-sm leading-7 text-cyan-50">
              Learners land directly in the scenario catalog, where practice starts quickly and session history remains
              review-first.
            </div>
          </div>
          <Button asChild className="w-full sm:w-fit">
            <Link to="/login">Open the auth screen</Link>
          </Button>
        </Card>
      </div>
    </div>
  );
}
