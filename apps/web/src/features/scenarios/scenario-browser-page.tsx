import { Button, Input } from "@english-coach/ui";
import { Link } from "@tanstack/react-router";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useEffect, useMemo, useRef, useState } from "react";
import { ellipsize, useInfiniteLearnerScenarios } from "../../lib/app-data";
import { AuthGate, Card, LoadingPanel, PageIntro, PageState } from "../../lib/app-shell";
import { useScenarioBrowserQueryState } from "./scenario-browser-query-state";

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
