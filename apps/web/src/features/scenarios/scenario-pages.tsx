import type { Scenario } from "@english-coach/contract";
import { Button, Input } from "@english-coach/ui";
import { Link, useLocation, useNavigate, useParams, useSearch } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import {
  createScenarioContextDocument,
  ellipsize,
  useLearnerScenarios,
  useScenario,
  useSessionLauncher,
} from "../../lib/app-data";
import { AuthGate, Card, LoadingPanel, PageIntro, PageState } from "../../lib/app-shell";

function useScenarioBrowserQueryState() {
  const currentSearch = useSearch({ from: "/scenarios/" });
  const navigate = useNavigate({ from: "/scenarios/" });
  const [searchInput, setSearchInput] = useState(currentSearch.search ?? "");

  useEffect(() => {
    setSearchInput(currentSearch.search ?? "");
  }, [currentSearch.search]);

  useEffect(() => {
    const nextSearch = searchInput.trim() || undefined;

    if (nextSearch === currentSearch.search) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      void navigate({
        replace: true,
        search: (previous) => ({
          ...previous,
          page: 1,
          search: nextSearch,
        }),
        to: "/scenarios",
      });
    }, 250);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [currentSearch.search, navigate, searchInput]);

  return {
    ...currentSearch,
    query: {
      page: currentSearch.page,
      pageSize: currentSearch.pageSize,
      search: currentSearch.search,
      sortBy: currentSearch.sortBy,
      sortDirection: currentSearch.sortDirection,
    },
    searchInput,
    setPage: (page: number) => void navigate({ search: (previous) => ({ ...previous, page }), to: "/scenarios" }),
    setPageSize: (pageSize: number) =>
      void navigate({ search: (previous) => ({ ...previous, page: 1, pageSize }), to: "/scenarios" }),
    setSearchInput,
    setSortBy: (sortBy: "updatedAt" | "createdAt" | "title") =>
      void navigate({ search: (previous) => ({ ...previous, page: 1, sortBy }), to: "/scenarios" }),
    setSortDirection: (sortDirection: "asc" | "desc") =>
      void navigate({ search: (previous) => ({ ...previous, page: 1, sortDirection }), to: "/scenarios" }),
  };
}

export function ScenarioBrowserPage() {
  const queryState = useScenarioBrowserQueryState();
  const scenarios = useLearnerScenarios(queryState.query);
  const canGoBack = queryState.page > 1;
  const totalPages = scenarios.data?.totalPages ?? 0;
  const canGoForward = totalPages === 0 ? false : queryState.page < totalPages;

  return (
    <AuthGate>
      <div className="grid gap-8">
        <PageIntro
          badge="Scenario Browser"
          description="Browse finished practice scenarios, study the example dialogue, then enter a voice session with a clear mission and real-time progress updates."
          title="Choose a scene that pushes the exact speaking behavior you want to improve."
          aside={
            <div className="grid gap-4">
              <dl className="grid gap-3 rounded-[24px] border border-white/10 bg-white/[0.04] p-5 text-sm text-slate-200">
                <div className="flex items-center justify-between gap-4">
                  <dt className="text-slate-400">Available scenarios</dt>
                  <dd>{scenarios.data?.total ?? 0}</dd>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <dt className="text-slate-400">Practice modes</dt>
                  <dd>Role-play + free-form</dd>
                </div>
              </dl>
              <Button asChild variant="outline">
                <Link to="/free-form">Open Free-form</Link>
              </Button>
            </div>
          }
        />

        <Card className="grid gap-4">
          <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_12rem_12rem_10rem]">
            <div className="grid gap-2 text-sm text-slate-300">
              <span>Search scenarios</span>
              <Input
                aria-label="Search scenarios"
                className="border-white/10 bg-slate-950/60 text-slate-50"
                onChange={(event) => queryState.setSearchInput(event.target.value)}
                placeholder="Search by title or setting"
                value={queryState.searchInput}
              />
            </div>
            <div className="grid gap-2 text-sm text-slate-300">
              <span>Sort by</span>
              <select
                aria-label="Sort scenarios by"
                className="h-10 rounded-md border border-white/10 bg-slate-950/60 px-3 text-sm text-slate-50 outline-none"
                onChange={(event) => queryState.setSortBy(event.target.value as typeof queryState.sortBy)}
                value={queryState.sortBy}
              >
                <option value="updatedAt">Recently updated</option>
                <option value="createdAt">Newest created</option>
                <option value="title">Title</option>
              </select>
            </div>
            <div className="grid gap-2 text-sm text-slate-300">
              <span>Direction</span>
              <select
                aria-label="Scenario sort direction"
                className="h-10 rounded-md border border-white/10 bg-slate-950/60 px-3 text-sm text-slate-50 outline-none"
                onChange={(event) => queryState.setSortDirection(event.target.value as typeof queryState.sortDirection)}
                value={queryState.sortDirection}
              >
                <option value="desc">Descending</option>
                <option value="asc">Ascending</option>
              </select>
            </div>
            <div className="grid gap-2 text-sm text-slate-300">
              <span>Page size</span>
              <select
                aria-label="Scenario page size"
                className="h-10 rounded-md border border-white/10 bg-slate-950/60 px-3 text-sm text-slate-50 outline-none"
                onChange={(event) => queryState.setPageSize(Number(event.target.value))}
                value={String(queryState.pageSize)}
              >
                {[12, 24, 48].map((size) => (
                  <option key={size} value={size}>
                    {size} per page
                  </option>
                ))}
              </select>
            </div>
          </div>
        </Card>

        {scenarios.isPending ? <LoadingPanel label="Loading scenarios..." /> : null}
        {scenarios.error ? <PageState description={scenarios.error.message} title="Could not load scenarios" /> : null}
        {!scenarios.isPending && !scenarios.error && (scenarios.data?.items.length ?? 0) === 0 ? (
          <PageState
            description="No scenarios exist yet. An admin can generate them from the admin scenario page."
            title="No scenarios yet"
          />
        ) : null}

        {scenarios.data?.items.length ? (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {scenarios.data.items.map((scenario) => (
              <Card className="grid gap-5" key={scenario.id}>
                <div className="grid gap-3">
                  <span className="w-fit rounded-full border border-orange-300/20 bg-orange-300/10 px-3 py-1 text-xs uppercase tracking-[0.24em] text-orange-100">
                    {scenario.characters[0].name} / {scenario.characters[1].name}
                  </span>
                  <h2 className="text-2xl text-white">{scenario.title}</h2>
                  <p className="text-sm leading-7 text-slate-300">{ellipsize(scenario.setting, 180)}</p>
                </div>
                <div className="flex items-center justify-between gap-4 text-xs uppercase tracking-[0.18em] text-slate-500">
                  <span>{scenario.goals.goals.length} goals</span>
                  <span>{scenario.exampleDialogue.length} dialogue turns</span>
                </div>
                <Button asChild size="lg">
                  <Link params={{ scenarioId: scenario.id }} to="/scenarios/$scenarioId">
                    Start Practice
                  </Link>
                </Button>
              </Card>
            ))}
          </div>
        ) : null}

        {scenarios.data?.items.length ? (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-[24px] border border-white/10 bg-white/[0.03] px-5 py-4 text-sm text-slate-300">
            <span>
              Page {queryState.page} of {Math.max(totalPages, 1)} · {scenarios.data.total} scenarios
            </span>
            <div className="flex items-center gap-3">
              <Button disabled={!canGoBack} onClick={() => queryState.setPage(queryState.page - 1)} variant="outline">
                Previous
              </Button>
              <Button disabled={!canGoForward} onClick={() => queryState.setPage(queryState.page + 1)}>
                Next
              </Button>
            </div>
          </div>
        ) : null}
      </div>
    </AuthGate>
  );
}

export function ScenarioDetailPage() {
  const { scenarioId } = useParams({ from: "/scenarios/$scenarioId/" });
  const scenario = useScenario(scenarioId);

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
                <h2 className="text-2xl text-white">Choose your role</h2>
                <p className="text-sm leading-7 text-slate-300">
                  Pick the character you will play. The agent automatically takes the other role.
                </p>
              </div>

              <div className="grid gap-4">
                {scenario.data.characters.map((character, index) => (
                  <Card className="grid gap-4 border-white/8 bg-white/[0.03] p-5" key={character.name}>
                    <div className="grid gap-2">
                      <span className="text-xs uppercase tracking-[0.18em] text-slate-500">Character {index + 1}</span>
                      <h3 className="text-xl text-white">{character.name}</h3>
                      <p className="text-sm leading-7 text-slate-300">{character.description}</p>
                    </div>
                    <Button asChild size="lg">
                      <Link
                        params={{ scenarioId: scenario.data.id }}
                        search={{ character: index }}
                        to="/scenarios/$scenarioId/practice/role-play"
                      >
                        Practice As {character.name}
                      </Link>
                    </Button>
                  </Card>
                ))}
              </div>

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

export function RolePlayPracticePage() {
  const { scenarioId } = useParams({ from: "/scenarios/$scenarioId/practice/role-play" });
  const { character } = useSearch({ from: "/scenarios/$scenarioId/practice/role-play" });
  const scenario = useScenario(scenarioId);
  const { rolePlayLaunch } = useSessionLauncher();
  const [selectedCharacterIndex, setSelectedCharacterIndex] = useState<number | undefined>(character);

  useEffect(() => {
    setSelectedCharacterIndex(character);
  }, [character]);

  return (
    <AuthGate>
      {scenario.isPending ? <LoadingPanel label="Preparing role-play setup..." /> : null}
      {scenario.error ? <PageState description={scenario.error.message} title="Could not load scenario" /> : null}
      {scenario.data ? (
        <div className="grid gap-8">
          <PageIntro
            badge="Role-play Setup"
            description="Confirm your role, then the backend will mint a LiveKit token and dispatch the agent into a private room for this session."
            title={`Practice ${scenario.data.title} as a live mission-driven conversation.`}
          />

          <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
            <Card className="grid gap-4">
              <h2 className="text-2xl text-white">Select your character</h2>
              <div className="grid gap-4">
                {scenario.data.characters.map((characterOption, index) => {
                  const isSelected = selectedCharacterIndex === index;

                  return (
                    <button
                      className={`grid gap-2 rounded-[22px] border px-4 py-4 text-left transition ${
                        isSelected
                          ? "border-cyan-300/40 bg-cyan-300/10"
                          : "border-white/10 bg-white/[0.03] hover:border-white/20"
                      }`}
                      key={characterOption.name}
                      onClick={() => setSelectedCharacterIndex(index)}
                      type="button"
                    >
                      <span className="text-xs uppercase tracking-[0.18em] text-slate-500">Character {index + 1}</span>
                      <span className="text-xl text-white">{characterOption.name}</span>
                      <span className="text-sm leading-7 text-slate-300">{characterOption.description}</span>
                    </button>
                  );
                })}
              </div>
            </Card>

            <Card className="grid gap-5">
              <div className="grid gap-2">
                <h2 className="text-2xl text-white">Mission preview</h2>
                <p className="text-sm leading-7 text-slate-300">
                  Goals stay visible during the call and update from room data packets.
                </p>
              </div>
              <div className="grid gap-3 rounded-[22px] border border-white/10 bg-white/[0.03] p-5 text-sm text-slate-200">
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
                disabled={selectedCharacterIndex === undefined || rolePlayLaunch.isPending}
                onClick={() => {
                  if (!scenario.data || selectedCharacterIndex === undefined) {
                    return;
                  }

                  void rolePlayLaunch.mutateAsync({
                    scenario: scenario.data,
                    selectedCharacterIndex,
                  });
                }}
                size="lg"
              >
                {rolePlayLaunch.isPending ? "Starting session..." : "Enter Voice Session"}
              </Button>
              {rolePlayLaunch.error ? (
                <div className="rounded-2xl border border-rose-400/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-100">
                  {rolePlayLaunch.error.message}
                </div>
              ) : null}
            </Card>
          </div>
        </div>
      ) : null}
    </AuthGate>
  );
}

function FreeFormPracticePageContent({
  scenario,
  isScenarioPending,
  scenarioError,
}: {
  scenario?: Scenario;
  isScenarioPending?: boolean;
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
                <div className="grid gap-3 rounded-[24px] border border-white/10 bg-white/[0.04] p-5 text-sm text-slate-200">
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-slate-400">Mode</span>
                    <span>Open coaching</span>
                  </div>
                  <p className="leading-7 text-slate-300">
                    Start from any notes, review summary, article, transcript, or prompt you want to practise around.
                  </p>
                </div>
              )
            }
          />

          <div className="grid gap-6 lg:grid-cols-[1fr_0.9fr]">
            <Card className="grid gap-4">
              <div className="grid gap-2">
                <h2 className="text-2xl text-white">Context document</h2>
                <p className="text-sm leading-7 text-slate-300">
                  The worker will turn this into live observations during the call.
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
                className="min-h-[24rem] rounded-[22px] border border-white/10 bg-slate-950/65 px-4 py-4 text-sm leading-7 text-slate-50 outline-none transition focus:border-cyan-300/40"
                onChange={(event) => setContextDocument(event.target.value)}
                placeholder="Paste context markdown here..."
                value={contextDocument}
              />
            </Card>

            <Card className="grid content-start gap-5">
              <div className="grid gap-2">
                <h2 className="text-2xl text-white">Preview</h2>
                <p className="text-sm leading-7 text-slate-300">
                  This is the coaching context the room session will receive.
                </p>
              </div>
              <div className="coach-prose max-h-[28rem] overflow-auto rounded-[22px] border border-white/10 bg-white/[0.03] p-5">
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
                <div className="rounded-2xl border border-rose-400/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-100">
                  {freeFormLaunch.error.message}
                </div>
              ) : null}
            </Card>
          </div>
        </div>
      ) : null}
    </AuthGate>
  );
}

export function FreeFormPracticePage() {
  const { scenarioId } = useParams({ from: "/scenarios/$scenarioId/practice/free-form" });
  const scenario = useScenario(scenarioId);

  return (
    <FreeFormPracticePageContent
      isScenarioPending={scenario.isPending}
      scenario={scenario.data}
      scenarioError={scenario.error}
    />
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
