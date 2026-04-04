import type { Scenario } from "@english-coach/contract";
import { Button, Input } from "@english-coach/ui";
import { Link, useLocation, useNavigate, useParams, useSearch } from "@tanstack/react-router";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import {
  createScenarioContextDocument,
  ellipsize,
  useInfiniteLearnerScenarios,
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
      pageSize: currentSearch.pageSize,
      search: currentSearch.search,
    },
    searchInput,
    setSearchInput,
  };
}

export function ScenarioBrowserPage() {
  const queryState = useScenarioBrowserQueryState();
  const scenarios = useInfiniteLearnerScenarios(queryState.query);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const [columnCount, setColumnCount] = useState(1);
  const scenarioItems = useMemo(
    () => scenarios.data?.pages.flatMap((page) => page.items) ?? [],
    [scenarios.data?.pages],
  );
  const totalScenarios = scenarios.data?.pages[0]?.total ?? scenarioItems.length;
  const loadedRows = Math.ceil(scenarioItems.length / columnCount);
  const totalRowCount = loadedRows + (scenarios.hasNextPage ? 1 : 0);

  useEffect(() => {
    const resolveColumnCount = (width: number) => {
      if (width >= 1280) {
        return 4;
      }

      if (width >= 900) {
        return 2;
      }

      return 1;
    };

    const updateColumnCount = () => {
      const scrollContainer = scrollContainerRef.current;
      const measuredWidth = scrollContainer?.clientWidth ?? window.innerWidth;

      setColumnCount(resolveColumnCount(measuredWidth));
    };

    updateColumnCount();

    window.addEventListener("resize", updateColumnCount);

    const scrollContainer = scrollContainerRef.current;
    const resizeObserver =
      scrollContainer && typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(() => {
            updateColumnCount();
          })
        : null;

    if (scrollContainer && resizeObserver) {
      resizeObserver.observe(scrollContainer);
    }

    return () => {
      window.removeEventListener("resize", updateColumnCount);
      resizeObserver?.disconnect();
    };
  }, []);

  const rowVirtualizer = useVirtualizer({
    count: totalRowCount,
    estimateSize: () => (columnCount === 1 ? 340 : 320),
    getScrollElement: () => scrollContainerRef.current,
    overscan: 4,
  });

  const virtualRows = rowVirtualizer.getVirtualItems();

  useEffect(() => {
    const lastRow = virtualRows[virtualRows.length - 1];

    if (!lastRow || !scenarios.hasNextPage || scenarios.isFetchingNextPage) {
      return;
    }

    if (lastRow.index >= Math.max(loadedRows - 1, 0)) {
      void scenarios.fetchNextPage();
    }
  }, [loadedRows, scenarios, virtualRows]);

  return (
    <AuthGate>
      <div className="grid gap-8">
        <PageIntro
          badge="Scenario Browser"
          description="Browse finished practice scenarios, open one detail page, and launch a mission-driven voice session once the role and goal preview feel right."
          title="Choose a scene that pushes the exact speaking behavior you want to improve."
          aside={
            <div className="grid gap-4">
              <dl className="grid gap-3 rounded-[24px] border border-white/10 bg-white/[0.04] p-5 text-sm text-slate-200">
                <div className="flex items-center justify-between gap-4">
                  <dt className="text-slate-400">Available scenarios</dt>
                  <dd>{totalScenarios}</dd>
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

        <Card className="mx-auto grid w-full max-w-2xl gap-4 text-center">
          <div className="grid gap-2">
            <span className="text-sm uppercase tracking-[0.18em] text-slate-400">Find a scenario fast</span>
            <h2 className="text-2xl text-white">Search the mission library</h2>
            <p className="text-sm leading-7 text-slate-300">
              Search is debounced and the list keeps loading in the background as you scroll.
            </p>
          </div>
          <Input
            aria-label="Search scenarios"
            className="mx-auto h-12 max-w-xl border-white/10 bg-slate-950/60 text-center text-base text-slate-50"
            onChange={(event) => queryState.setSearchInput(event.target.value)}
            placeholder="Search by title, setting, or character"
            value={queryState.searchInput}
          />
        </Card>

        {scenarios.isPending ? <LoadingPanel label="Loading scenarios..." /> : null}
        {scenarios.error ? <PageState description={scenarios.error.message} title="Could not load scenarios" /> : null}
        {!scenarios.isPending && !scenarios.error && scenarioItems.length === 0 ? (
          <PageState
            description="No scenarios exist yet. An admin can generate them from the admin scenario page."
            title="No scenarios yet"
          />
        ) : null}

        {scenarioItems.length ? (
          <Card className="grid gap-4 p-3 sm:p-4">
            <div className="flex flex-wrap items-center justify-between gap-3 px-2 text-sm text-slate-300">
              <span>
                Showing {scenarioItems.length} of {totalScenarios} scenarios
              </span>
              <span>{scenarios.isFetchingNextPage ? "Loading more..." : "Scroll to keep exploring"}</span>
            </div>

            <div
              className="h-[68vh] overflow-auto rounded-[24px] border border-white/10 bg-slate-950/35"
              ref={scrollContainerRef}
            >
              <div className="relative w-full" style={{ height: `${rowVirtualizer.getTotalSize()}px` }}>
                {virtualRows.map((virtualRow) => {
                  if (virtualRow.index >= loadedRows) {
                    return (
                      <div
                        className="absolute left-0 top-0 flex w-full items-center justify-center px-4 py-6 text-sm text-slate-400"
                        data-index={virtualRow.index}
                        key={virtualRow.key}
                        ref={rowVirtualizer.measureElement}
                        style={{ transform: `translateY(${virtualRow.start}px)` }}
                      >
                        {scenarios.hasNextPage ? "Loading more scenarios..." : "You reached the end of the library."}
                      </div>
                    );
                  }

                  const rowStart = virtualRow.index * columnCount;
                  const rowItems = scenarioItems.slice(rowStart, rowStart + columnCount);

                  return (
                    <div
                      className="absolute left-0 top-0 w-full px-3 py-3"
                      data-index={virtualRow.index}
                      key={virtualRow.key}
                      ref={rowVirtualizer.measureElement}
                      style={{ transform: `translateY(${virtualRow.start}px)` }}
                    >
                      <div
                        className="grid gap-5"
                        style={{ gridTemplateColumns: `repeat(${columnCount}, minmax(0, 1fr))` }}
                      >
                        {rowItems.map((scenario) => (
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
                                Open Scenario
                              </Link>
                            </Button>
                          </Card>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </Card>
        ) : null}
        {scenarios.isFetching && !scenarios.isFetchingNextPage && !scenarios.isPending ? (
          <div className="rounded-[24px] border border-white/10 bg-white/[0.03] px-5 py-4 text-sm text-slate-300">
            Refreshing scenario results...
          </div>
        ) : null}
      </div>
    </AuthGate>
  );
}

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
                {scenario.data.characters.map((character, index) => (
                  <button
                    className={`grid gap-4 rounded-[22px] border px-5 py-5 text-left transition ${
                      selectedCharacterIndex === index
                        ? "border-cyan-300/40 bg-cyan-300/10"
                        : "border-white/10 bg-white/[0.03] hover:border-white/20"
                    }`}
                    key={character.name}
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
                      <h3 className="text-xl text-white">{character.name}</h3>
                      <p className="text-sm leading-7 text-slate-300">{character.description}</p>
                    </div>
                    <span className="text-sm font-medium text-cyan-100">
                      {selectedCharacterIndex === index ? "Selected for launch" : `Play as ${character.name}`}
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
