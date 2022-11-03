import { useEffect } from "react";
import { AppReducer, Match, MatchRow, ProcessingState } from "../state";
import { newEditDistance } from "../utils/match";
import { filterByValue, joinNorm, uniq, zip } from "../utils/helpers";

/**
 * The matcher figures out joins, runs the auto-matching on each join
 * with progress information, and transitions to the matching table
 */
export function Matcher({
  app,
  reducer,
}: AppReducer & {
  app: ProcessingState;
}) {
  useEffect(() => {
    // Collect timeouts to clear with the effect clean-up at the end
    const timeouts: ReturnType<typeof setTimeout>[] = [];

    // Grab left and right values
    const [leftValues, rightValues] = (["left", "right"] as const).map((side) =>
      app.tables[app.columnSelections[side].tableIndex].rows.map(
        (row) => row[app.columnSelections[side].column]
      )
    );
    // Grab left and right meta information
    const [leftMetas, rightMetas] = (["left", "right"] as const).map((side) => {
      const meta = app.columnSelections.meta[side];
      if (meta != null) {
        return app.tables[meta.tableIndex].rows.map((row) => row[meta.column]);
      } else {
        return app.tables[app.columnSelections[side].tableIndex].rows.map(
          (_) => undefined
        );
      }
    }) as [(string | undefined)[], (string | undefined)[]];

    // Zip the value and meta together into an info object for left and right
    const [leftInfo, rightInfo] = [
      zip(leftValues, leftMetas),
      zip(rightValues, rightMetas),
    ];

    // Collect the join column values for left and right
    const [leftJoins, rightJoins] = (["left", "right"] as const).map((side) => {
      const join = app.columnSelections.join;
      return join
        ? app.tables[join[side].tableIndex].rows.map((row) =>
            joinNorm(row[join[side].column])
          )
        : null;
    });
    const hasJoin = leftJoins != null && rightJoins != null;
    const uniqueJoinValues = uniq([
      ...(leftJoins || []),
      ...(rightJoins || []),
    ]);

    // Perform joining
    const joins: [
      string,
      [string, string | undefined][],
      [string, string | undefined][]
    ][] = hasJoin
      ? uniqueJoinValues
          .map<
            [
              string,
              [string, string | undefined][],
              [string, string | undefined][]
            ]
          >((joiner) => [
            joiner,
            filterByValue(leftJoins, joiner, leftInfo),
            filterByValue(rightJoins, joiner, rightInfo),
          ])
          .filter(
            (
              x: [
                string,
                [string, string | undefined][],
                [string, string | undefined][]
              ]
            ) => x[1].length > 0 && x[2].length > 0
          )
      : // Default join of just left and right values
        [["default", leftInfo, rightInfo]];

    // Prepare matching
    const overallResults: [string, MatchRow[]][] = [];
    for (let joinIndex = 0; joinIndex < joins.length; joinIndex++) {
      // Match within each join
      const [joiner, leftInfo, rightInfo] = joins[joinIndex];
      const leftValues = leftInfo.map((x) => x[0]);
      const rightValues = rightInfo.map((x) => x[0]);
      const leftMeta = leftInfo.map((x) => x[1]);
      const rightMeta = rightInfo.map((x) => x[1]);

      const results: MatchRow[] = [];
      for (let i = 0; i < leftValues.length; i++) {
        // For each left value, rank all matching right values
        timeouts.push(
          // Run matching asynchronously to not block UI
          setTimeout(() => {
            // Rank all the matches
            const matches: Match[] = [];
            const row = results.length;
            for (let j = 0; j < rightValues.length; j++) {
              // Use a custom modified edit distance algorithm for ranking
              const score = newEditDistance(leftValues[i], rightValues[j]);
              matches.push({
                score,
                value: rightValues[j],
                meta: rightMeta[j],
                index: j,
                col: 0,
                row,
              });
            }
            // Sort to favor strongest matches
            matches.sort((a, b) => a.score - b.score);
            for (let z = 0; z < matches.length; z++) {
              // Assign match cols
              matches[z].col = z;
            }
            results.push({
              value: leftValues[i],
              meta: leftMeta[i],
              index: i,
              rankedMatches: matches,
              row,
            });

            // Finalize results
            if (i === leftValues.length - 1) {
              overallResults.push([joiner, results]);
            }

            if (i === leftValues.length - 1 && joinIndex === joins.length - 1) {
              // Done processing everything; move to matching table
              reducer({
                type: "FinishProcessing",
                results: overallResults,
              });
            } else {
              // Update progress
              reducer({
                type: "UpdateProgress",
                progress:
                  (joinIndex + (i + 1) / leftValues.length) / joins.length,
              });
            }
          }, 16)
        );
      }
    }

    return () => {
      timeouts.forEach((timeout) => clearTimeout(timeout));
    };
  }, [app.columnSelections, app.tables, reducer]);

  return <MatcherProgress progress={app.progress} />;
}

/** A progress bar for the automatching */
export function MatcherProgress({ progress }: { progress: number }) {
  // Number of thin ticks to show
  const numBars = 40;
  // Number of ticks that should be highlighted at one time
  const highlightBars = 2;

  const startBarIndex = Math.floor(progress * (numBars - highlightBars));
  const endBarIndex = startBarIndex + highlightBars - 1;

  return (
    <>
      {[...Array(numBars).keys()].map((_, i) => (
        <div
          key={i}
          className={`tick ${
            i >= startBarIndex && i <= endBarIndex ? "lit" : ""
          }`}
        ></div>
      ))}
    </>
  );
}
