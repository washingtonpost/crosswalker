import { useEffect } from "react";
import { AppReducer, Match, MatchRow, ProcessingState } from "../state";
import { newEditDistance } from "../utils/match";

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
    console.log([app.columnSelections, app.tables, reducer]);
    const timeouts: ReturnType<typeof setTimeout>[] = [];
    const [leftValues, rightValues] = (["left", "right"] as const).map((side) =>
      app.tables[app.columnSelections[side].table].rows.map(
        (row) => row[app.columnSelections[side].column]
      )
    );

    const results: MatchRow[] = [];
    for (let i = 0; i < leftValues.length; i++) {
      timeouts.push(
        setTimeout(() => {
          // Rank everything
          const matches: Match[] = [];
          for (let j = 0; j < rightValues.length; j++) {
            const score = newEditDistance(leftValues[i], rightValues[j]);
            matches.push({
              score,
              value: rightValues[j],
              index: j,
            });
          }
          matches.sort((a, b) => a.score - b.score);
          results.push({
            value: leftValues[i],
            index: i,
            rankedMatches: matches,
          });
          // Update progress
          if (i === leftValues.length - 1) {
            reducer({
              type: "FinishProcessing",
              results,
            });
          } else {
            reducer({
              type: "UpdateProgress",
              progress: (i + 1) / leftValues.length,
            });
          }
        }, 16)
      );
    }

    return () => {
      timeouts.forEach((timeout) => clearTimeout(timeout));
    };
  }, [app.columnSelections, app.tables, reducer]);

  return <Progress progress={app.progress} />;
}
