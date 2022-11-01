import { useEffect } from "react";
import { AppReducer, Match, MatchRow, ProcessingState } from "../state";
import { newEditDistance } from "../utils/match";
import { filterByValue, joinNorm, uniq } from "../utils/uniq";

export function Progress({ progress }: { progress: number }) {
  const numBars = 40;
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

export function Matcher({
  app,
  reducer,
}: AppReducer & {
  app: ProcessingState;
}) {
  useEffect(() => {
    const timeouts: ReturnType<typeof setTimeout>[] = [];
    const [leftValues, rightValues] = (["left", "right"] as const).map((side) =>
      app.tables[app.columnSelections[side].tableIndex].rows.map(
        (row) => row[app.columnSelections[side].column]
      )
    );
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

    const joins: [string, string[], string[]][] = hasJoin
      ? uniqueJoinValues
          .map<[string, string[], string[]]>((joiner) => [
            joiner,
            filterByValue(leftJoins, joiner, leftValues),
            filterByValue(rightJoins, joiner, rightValues),
          ])
          .filter(
            (x: [string, string[], string[]]) =>
              x[1].length > 0 && x[2].length > 0
          )
      : // Default join of just left and right values
        [["default", leftValues, rightValues]];
    console.log(joins);

    const overallResults: [string, MatchRow[]][] = [];

    for (let joinIndex = 0; joinIndex < joins.length; joinIndex++) {
      console.log("JOIN INDEXX", joinIndex);
      const [joiner, leftValues, rightValues] = joins[joinIndex];
      const results: MatchRow[] = [];
      for (let i = 0; i < leftValues.length; i++) {
        timeouts.push(
          setTimeout(() => {
            // Rank everything
            const matches: Match[] = [];
            const row = results.length;
            for (let j = 0; j < rightValues.length; j++) {
              const score = newEditDistance(leftValues[i], rightValues[j]);
              matches.push({
                score,
                value: rightValues[j],
                meta: rightMetas[j],
                index: j,
                col: 0,
                row,
              });
            }
            matches.sort((a, b) => a.score - b.score);
            for (let z = 0; z < matches.length; z++) {
              // Assign match cols
              matches[z].col = z;
            }
            results.push({
              value: leftValues[i],
              meta: leftMetas[i],
              index: i,
              rankedMatches: matches,
              row,
            });

            // Finalize results
            if (i === leftValues.length - 1) {
              overallResults.push([joiner, results]);
            }

            // Update progress
            console.log({
              i,
              joinIndex,
              iL: leftValues.length,
              jL: joins.length,
            });
            if (i === leftValues.length - 1 && joinIndex === joins.length - 1) {
              console.log("DONE", overallResults);
              reducer({
                type: "FinishProcessing",
                results: overallResults,
              });
            } else {
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

  return <Progress progress={app.progress} />;
}
