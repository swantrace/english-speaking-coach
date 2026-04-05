import { Button } from "@english-coach/ui";
import { Link, useNavigate, useParams, useSearch } from "@tanstack/react-router";
import { useScenario, useSessionLauncher } from "../../lib/app-data";
import { AuthGate, Card, LoadingPanel, PageIntro, PageState } from "../../lib/app-shell";

export function ScenarioDetailPage() {
  const { scenarioId } = useParams({ from: "/scenarios/$scenarioId/" });
  const { character } = useSearch({ from: "/scenarios/$scenarioId/" });
  const navigate = useNavigate({ from: "/scenarios/$scenarioId/" });
  const scenario = useScenario(scenarioId);
  const { rolePlayLaunch } = useSessionLauncher();
  const selectedCharacterIndex = character ?? 0;

  return (
    <AuthGate>
      {scenario.isPending ? <LoadingPanel label="Loading scenario..." /> : null}
      {scenario.error ? <PageState description={scenario.error.message} title="Could not load scenario" /> : null}
      {scenario.data ? (
        <div className="grid gap-8">
          <PageIntro
            badge="Study First"
            description={scenario.data.setting}
            title={scenario.data.title}
            aside={
              <div className="grid gap-3 rounded-[24px] border border-white/10 bg-white/[0.04] p-5 text-sm text-slate-200">
                <div className="flex items-center justify-between gap-4">
                  <span className="text-slate-400">Characters</span>
                  <span>2</span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span className="text-slate-400">Required goals</span>
                  <span>{scenario.data.goals.goals.filter((goal) => !goal.optional).length}</span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span className="text-slate-400">Optional goals</span>
                  <span>{scenario.data.goals.goals.filter((goal) => goal.optional).length}</span>
                </div>
              </div>
            }
          />

          <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
            <Card className="grid gap-5">
              <div className="grid gap-2">
                <h2 className="text-2xl text-white">Example dialogue</h2>
                <p className="text-sm leading-7 text-slate-300">
                  Study the target exchange before you practise the scene out loud.
                </p>
              </div>

              <div className="grid gap-4">
                {scenario.data.exampleDialogue.map((turn) => (
                  <div
                    className={`grid gap-2 rounded-[22px] border px-4 py-4 ${
                      turn.speaker === "user" ? "border-cyan-300/20 bg-cyan-300/10" : "border-white/10 bg-white/[0.03]"
                    }`}
                    key={`${turn.speaker}:${turn.text}`}
                  >
                    <span className="text-xs uppercase tracking-[0.22em] text-slate-400">{turn.speaker}</span>
                    <p className="text-sm leading-7 text-slate-100">{turn.text}</p>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="grid content-start gap-5">
              <div className="grid gap-2">
                <h2 className="text-2xl text-white">Choose your role and launch</h2>
                <p className="text-sm leading-7 text-slate-300">
                  Pick the character you will play, review the mission, then enter the live room from this page.
                </p>
              </div>

              <div className="grid gap-4">
                {scenario.data.characters.map((characterOption, index) => (
                  <button
                    className={`grid gap-4 rounded-[22px] border px-5 py-5 text-left transition ${
                      selectedCharacterIndex === index
                        ? "border-cyan-300/40 bg-cyan-300/10"
                        : "border-white/10 bg-white/[0.03] hover:border-white/20"
                    }`}
                    key={characterOption.name}
                    onClick={() => {
                      void navigate({
                        replace: true,
                        search: { character: index },
                        to: "/scenarios/$scenarioId",
                      });
                    }}
                    type="button"
                  >
                    <div className="grid gap-2">
                      <span className="text-xs uppercase tracking-[0.18em] text-slate-500">Character {index + 1}</span>
                      <h3 className="text-xl text-white">{characterOption.name}</h3>
                      <p className="text-sm leading-7 text-slate-300">{characterOption.description}</p>
                    </div>
                    <span className="text-sm font-medium text-cyan-100">
                      {selectedCharacterIndex === index ? "Selected for launch" : `Play as ${characterOption.name}`}
                    </span>
                  </button>
                ))}
              </div>

              <div className="grid gap-3 rounded-[22px] border border-white/10 bg-white/[0.03] p-5 text-sm text-slate-200">
                <div className="grid gap-2">
                  <h3 className="text-lg text-white">Mission preview</h3>
                  <p className="leading-7 text-slate-300">
                    Goals stay visible during the call and update from room data packets while you work through the
                    scene.
                  </p>
                </div>
                {scenario.data.goals.goals.map((goal) => (
                  <div className="flex items-center justify-between gap-4" key={goal.id}>
                    <span>{goal.description}</span>
                    <span className="text-xs uppercase tracking-[0.18em] text-slate-500">
                      {goal.optional ? "optional" : "required"}
                    </span>
                  </div>
                ))}
              </div>

              <Button
                disabled={rolePlayLaunch.isPending}
                onClick={() => {
                  void rolePlayLaunch.mutateAsync({
                    scenario: scenario.data,
                    selectedCharacterIndex,
                  });
                }}
                size="lg"
              >
                {rolePlayLaunch.isPending
                  ? "Starting session..."
                  : `Enter Voice Session as ${scenario.data.characters[selectedCharacterIndex]?.name ?? "this role"}`}
              </Button>
              {rolePlayLaunch.error ? (
                <div className="rounded-2xl border border-rose-400/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-100">
                  {rolePlayLaunch.error.message}
                </div>
              ) : null}

              <div className="rounded-[22px] border border-emerald-300/15 bg-emerald-300/10 p-5">
                <div className="grid gap-3">
                  <h3 className="text-lg text-white">Prefer a free-form coaching session?</h3>
                  <p className="text-sm leading-7 text-emerald-50/90">
                    Paste any context document and let the agent coach your speaking without a fixed mission flow.
                  </p>
                  <Button asChild variant="outline">
                    <Link search={{ scenarioId: scenario.data.id }} to="/free-form">
                      Open Free-form Setup
                    </Link>
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        </div>
      ) : null}
    </AuthGate>
  );
}
