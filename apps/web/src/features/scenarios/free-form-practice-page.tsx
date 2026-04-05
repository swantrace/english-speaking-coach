import type { Scenario } from "@english-coach/contract";
import { Button } from "@english-coach/ui";
import { Link, useLocation } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import { createScenarioContextDocument, ellipsize, useScenario, useSessionLauncher } from "../../lib/app-data";
import { AuthGate, Card, LoadingPanel, PageIntro, PageState } from "../../lib/app-shell";

function FreeFormPracticePageContent({
  isScenarioPending,
  scenario,
  scenarioError,
}: {
  isScenarioPending?: boolean;
  scenario?: Scenario;
  scenarioError?: Error | null;
}) {
  const { freeFormLaunch } = useSessionLauncher();
  const [contextDocument, setContextDocument] = useState("");

  useEffect(() => {
    if (scenario && !contextDocument) {
      setContextDocument(createScenarioContextDocument(scenario));
    }
  }, [contextDocument, scenario]);

  return (
    <AuthGate>
      {isScenarioPending ? <LoadingPanel label="Preparing free-form setup..." /> : null}
      {scenarioError ? <PageState description={scenarioError.message} title="Could not load scenario" /> : null}
      {!isScenarioPending && !scenarioError ? (
        <div className="grid gap-8">
          <PageIntro
            badge="Free-form Setup"
            description="Paste any context you want the coach to use: a review report, article, lesson notes, or a scenario brief."
            title={
              scenario
                ? `Start a free-form coaching call grounded in ${scenario.title}.`
                : "Start a free-form coaching call from your own context."
            }
            aside={
              scenario ? (
                <div className="grid gap-3 rounded-[24px] border border-emerald-300/15 bg-emerald-300/10 p-5 text-sm text-emerald-50/90">
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-emerald-100">Scenario seed</span>
                    <span className="rounded-full border border-emerald-200/20 bg-emerald-200/10 px-3 py-1 text-xs uppercase tracking-[0.18em] text-emerald-50">
                      optional
                    </span>
                  </div>
                  <div className="grid gap-2">
                    <h2 className="text-xl text-white">{scenario.title}</h2>
                    <p>{ellipsize(scenario.setting, 180)}</p>
                  </div>
                </div>
              ) : (
                <div className="grid gap-3 rounded-[24px] border border-slate-200 bg-slate-50/90 p-5 text-sm text-slate-700">
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-slate-500">Mode</span>
                    <span>Open coaching</span>
                  </div>
                  <p className="leading-7 text-slate-600">
                    Start from any notes, review summary, article, transcript, or prompt you want to practise around.
                  </p>
                </div>
              )
            }
          />

          <div className="grid gap-6 lg:grid-cols-[1fr_0.9fr]">
            <Card className="grid gap-4">
              <div className="grid gap-2">
                <h2 className="text-2xl text-slate-950">Context document</h2>
                <p className="text-sm leading-7 text-slate-600">
                  The worker will turn this into live transcript prompts during the call.
                </p>
              </div>
              {scenario ? (
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-[20px] border border-emerald-300/15 bg-emerald-300/10 px-4 py-3 text-sm text-emerald-50/90">
                  <span>Loaded from scenario seed. Edit it freely before you start.</span>
                  <button
                    className="rounded-full border border-emerald-100/20 px-3 py-1 text-xs uppercase tracking-[0.18em] transition hover:bg-emerald-100/10"
                    onClick={() => setContextDocument(createScenarioContextDocument(scenario))}
                    type="button"
                  >
                    Reset seed
                  </button>
                </div>
              ) : null}
              <textarea
                className="min-h-[24rem] rounded-[22px] border border-slate-200 bg-white px-4 py-4 text-sm leading-7 text-slate-900 outline-none transition focus:border-cyan-300/40"
                onChange={(event) => setContextDocument(event.target.value)}
                placeholder="Paste context markdown here..."
                value={contextDocument}
              />
            </Card>

            <Card className="grid content-start gap-5">
              <div className="grid gap-2">
                <h2 className="text-2xl text-slate-950">Preview</h2>
                <p className="text-sm leading-7 text-slate-600">
                  This is the coaching context the room session will receive.
                </p>
              </div>
              <div className="coach-prose max-h-[28rem] overflow-auto rounded-[22px] border border-slate-200 bg-slate-50 p-5">
                <ReactMarkdown>{contextDocument || "No context yet."}</ReactMarkdown>
              </div>
              <Button
                disabled={!contextDocument.trim() || freeFormLaunch.isPending}
                onClick={() => {
                  void freeFormLaunch.mutateAsync({
                    contextDocument: contextDocument.trim(),
                    scenario,
                  });
                }}
                size="lg"
              >
                {freeFormLaunch.isPending ? "Starting session..." : "Start Free-form Session"}
              </Button>
              {freeFormLaunch.error ? (
                <div className="rounded-2xl border border-rose-300 bg-rose-100 px-4 py-3 text-sm text-rose-900">
                  {freeFormLaunch.error.message}
                </div>
              ) : null}
              <Button asChild variant="outline">
                <Link to="/scenarios">Back to scenario browser</Link>
              </Button>
            </Card>
          </div>
        </div>
      ) : null}
    </AuthGate>
  );
}

export function FreeFormPage() {
  const location = useLocation();
  const scenarioId = useMemo(() => {
    const value = new URLSearchParams(location.searchStr).get("scenarioId");

    return value?.trim() ? value : undefined;
  }, [location.searchStr]);
  const scenario = useScenario(scenarioId);

  return (
    <FreeFormPracticePageContent
      isScenarioPending={Boolean(scenarioId) && scenario.isPending}
      scenario={scenario.data}
      scenarioError={scenarioId ? scenario.error : null}
    />
  );
}
