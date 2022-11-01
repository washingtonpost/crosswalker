import { AppReducer, Match, MatchingState, MatchRow, UndoRedo } from "../state";
import DataEditor, {
  GridCellKind,
  GridColumn,
  GridSelection,
} from "@glideapps/glide-data-grid";
import { useState } from "react";
import { colors } from "../utils/color";
import tinycolor from "tinycolor2";
import { Button } from "./Button";
import { extractParts, FilteredMatchRows } from "../utils/match";
import { ResetButton } from "./ResetButton";
import { Header } from "./Header";
import downloadIcon from "../assets/downloadIcon.svg";
import { download } from "../utils/download";

const COL_WIDTH = 200;

const partSplit = /([^a-zA-Z0-9]+)/g;

export function MatchingTable({
  app,
  reducer,
  useUndoRedo,
}: AppReducer & {
  app: MatchingState;
  useUndoRedo: () => [undo: UndoRedo, redo: UndoRedo];
}) {
  const [colWidths, setColWidths] = useState<{ [key: number]: number }>({});
  const [gridSelection, setGridSelection] = useState<GridSelection>();
  const [undo, redo] = useUndoRedo();
  const [rowFilter, setRowFilter] = useState<"all" | "complete" | "incomplete">(
    "all"
  );
  const [colFilter, setColFilter] = useState<"all" | "hideMatched">(
    "hideMatched"
  );
  const [showMeta, setShowMeta] = useState<"show" | "hide">("show");

  const allJoins = Object.keys(app.matches);
  const [join, setJoin] = useState(allJoins[0] || "");

  if (allJoins.length === 0) return null;

  const numColumns = app.matches[join][0].rankedMatches.length + 1;
  const columns: GridColumn[] = [
    {
      title: `SOURCE — ${app.columnSelections.left.column} (${app.columnSelections.left.tableName})`,
      width: colWidths[0] || COL_WIDTH,
      themeOverride: {
        textDark: colors.fgColor,
        bgCell: colors.primary,
        accentColor: tinycolor(colors.primary).lighten(10).toHexString(),
        accentLight: tinycolor(colors.primary).darken(10).toHexString(),
      },
    },
  ];
  for (let i = 0; i < numColumns - 1; i++) {
    columns.push({
      title: `P${i + 1} — ${app.columnSelections.right.column} (${
        app.columnSelections.right.tableName
      })`,
      width: colWidths[i + 1] || COL_WIDTH,
    });
  }

  // function isUserMatched(text: string): boolean {
  //   const entries = Object.entries(app.userMatches);
  //   for (const [key, value] of entries) {
  //     if (!value) continue;
  //     const parts = key.split(",");
  //     const x = parseInt(parts[0]);
  //     const y = parseInt(parts[1]);
  //     if (app.matches[y].rankedMatches[x].value === text) return true;
  //   }
  //   return false;
  // }

  function getUserMatched(matchCell: Match): boolean {
    return app.userMatches[join][`${matchCell.col},${matchCell.row}`];
  }

  function getUserMatches(joinKey = join): Match[] {
    const entries = Object.entries(app.userMatches[joinKey]);
    const results: Match[] = [];
    for (const [key, value] of entries) {
      if (!value) continue;
      const parts = key.split(",");
      const x = parseInt(parts[0]);
      const y = parseInt(parts[1]);
      results.push(app.matches[joinKey][y].rankedMatches[x]);
    }
    return results;
  }

  function getAllUserMatches(): [string, MatchRow, Match][] {
    const results: [string, MatchRow, Match][] = [];
    for (const join of allJoins) {
      for (const match of getUserMatches(join)) {
        results.push([join, app.matches[join][match.row], match]);
      }
    }
    return results;
  }

  const userMatches = getUserMatches();
  const userMatchTexts = userMatches.map((x) => x.value);

  const allUserMatches = getAllUserMatches();

  function isMatchedElsewhere(match: Match): boolean {
    return userMatchTexts.includes(match.value);
  }

  const matchEntries: [string, [string, boolean][]][] = Object.entries(
    app.userMatches
  ).map(([k, v]) => [k, Object.entries(v)]);
  const rowsWithMatches: { [join: string]: { [row: number]: boolean } } = {};
  for (const [join, subEntries] of matchEntries) {
    for (const [key, value] of subEntries) {
      if (value) {
        const row = parseInt(key.split(",")[1]);
        if (rowsWithMatches[join] == null) {
          rowsWithMatches[join] = {};
        }
        rowsWithMatches[join][row] = true;
      }
    }
  }

  function rowHasMatch(row: number, subJoin = join): boolean {
    return rowsWithMatches[subJoin]?.[row];
  }

  function drawTextWithMatches(
    ctx: CanvasRenderingContext2D,
    method: "fill" | "stroke",
    targetText: string,
    sourceText: string,
    x: number,
    y: number,
    sizeOffset: number
  ) {
    const drawText =
      method === "fill" ? ctx.fillText.bind(ctx) : ctx.strokeText.bind(ctx);

    const targetParts = targetText.split(partSplit);
    const sourceParts = extractParts(sourceText).map((x) => x.toLowerCase());

    for (let i = 0; i < targetParts.length; i++) {
      const isPart = i % 2 === 0;
      const str = targetParts[i];
      const isBold = isPart && sourceParts.includes(str.toLowerCase());

      const measurements = ctx.measureText(str);
      ctx.save();
      if (isBold) {
        x += 3;
        // ctx.strokeStyle = colors.fgColor;
        // ctx.lineWidth = 3;
        // ctx.lineJoin = "round";
        // ctx.miterLimit = 2;
        ctx.font = `bold ${ctx.font}`;
        // ctx.strokeText(str, x, y);
        ctx.fillStyle = colors.primary;
        ctx.fillRect(
          x - 2,
          y - 10 - sizeOffset / 2,
          measurements.width + 4,
          20 + sizeOffset
        );
        ctx.fillStyle = colors.fgColor;

        ctx.strokeStyle = colors.fgColor;
        ctx.lineWidth = 0.2;
        ctx.lineJoin = "round";
        ctx.miterLimit = 2;
        // ctx.font = `bold ${ctx.font}`;
        ctx.strokeText(str, x, y);
      }
      drawText(str, x, y);
      ctx.restore();
      x += measurements.width + (isBold ? 3 : 0);
    }
  }

  const filters = {
    all: () => true,
    complete: (matchRow: MatchRow) => rowHasMatch(matchRow.row),
    incomplete: (matchRow: MatchRow) => !rowHasMatch(matchRow.row),
  };

  function isMatchCell(match: Match | MatchRow): match is Match {
    return "col" in match;
  }

  const filteredMatchRows = new FilteredMatchRows(
    app.matches[join],
    (cell) =>
      colFilter === "all"
        ? true
        : getUserMatched(cell) || !isMatchedElsewhere(cell),
    (a, b) => {
      const userMatchedA = getUserMatched(a);
      const userMatchedB = getUserMatched(b);
      if (userMatchedA && !userMatchedB) return -1;
      if (!userMatchedA && userMatchedB) return 1;
      return 0;
    },
    filters[rowFilter]
  );

  return (
    <>
      <Header>
        <div className="upper-section">
          <ResetButton slim={true} app={app} reducer={reducer} />

          <Button
            slim={true}
            disabled={!undo.isPossible || !app.canUndo}
            onClick={() => undo()}
          >
            Undo
          </Button>

          <Button
            slim={true}
            disabled={!redo.isPossible}
            onClick={() => redo()}
          >
            Redo
          </Button>

          {/* <Button
            slim={true}
            // onClick={() => redo()}
          >
            Save
          </Button>
          <Button
            slim={true}
            // onClick={() => redo()}
          >
            Load
          </Button> */}

          <Button
            slim={true}
            icon={{
              url: downloadIcon,
              alt: "Download",
            }}
            onClick={() => {
              const getRow = (
                join: string,
                match: Match | MatchRow
              ): [string, string] | [string, string, string] => {
                if (match.meta) {
                  return [join, match.value, match.meta];
                }
                return [join, match.value];
              };

              // Aggregate matches
              const p1s: {
                [key: string]: ([string, string] | [string, string, string])[];
              } = {};
              for (const [join, matchRow, match] of allUserMatches) {
                const p1 = getRow(join, matchRow);
                const p1Key = JSON.stringify(p1);
                const p2 = getRow(join, match);
                if (p1s[p1Key] == null) {
                  p1s[p1Key] = [];
                }
                p1s[p1Key].push(p2);
              }

              // Assemble matches
              const results: {
                precincts1: ([string, string] | [string, string, string])[];
                precincts2: ([string, string] | [string, string, string])[];
              }[] = [];
              for (const [p1Key, p2s] of Object.entries(p1s)) {
                const p1 = JSON.parse(p1Key) as
                  | [string, string]
                  | [string, string, string];
                results.push({
                  precincts1: [p1],
                  precincts2: p2s,
                });
              }

              // Download results
              download("crosswalk.json", results);
            }}
          >
            Download matches ({allUserMatches.length.toLocaleString()})
          </Button>
        </div>
      </Header>
      <DataEditor
        width={"calc(100vw - 64px)"}
        height={"calc(100vh - 190px)"}
        rowMarkers="both"
        rangeSelect="multi-rect"
        freezeColumns={1}
        smoothScrollX={true}
        smoothScrollY={true}
        theme={{
          accentColor: colors.accent,
          accentLight: tinycolor(colors.bgColor).lighten(20).toHexString(),

          textDark: colors.fgColor,
          textMedium: "#b8b8b8",
          textLight: "#a0a0a0",
          textBubble: "#ffffff",

          bgIconHeader: "#b8b8b8",
          fgIconHeader: "#000000",
          textHeader: colors.fgColor,
          textHeaderSelected: "#000000",

          bgCell: colors.bgColor,
          bgCellMedium: "#202027",
          bgHeader: colors.primary,
          bgHeaderHasFocus: tinycolor(colors.primary).lighten(10).toHexString(),
          bgHeaderHovered: "#404040",

          bgBubble: "#212121",
          bgBubbleSelected: "#000000",

          bgSearchResult: "#423c24",

          borderColor: "rgba(225,225,225,0.2)",
          drilldownBorder: "rgba(225,225,225,0.4)",

          linkColor: "#4F5DFF",

          headerFontStyle: "bold 18px",
          baseFontStyle: "18px",
          fontFamily:
            "Franklin ITC, Inter, Roboto, -apple-system, BlinkMacSystemFont, avenir next, avenir, segoe ui, helvetica neue, helvetica, Ubuntu, noto, arial, sans-serif",
        }}
        onKeyDown={(e) => {
          if (
            e.keyCode === 13 &&
            gridSelection != null &&
            gridSelection.current != null
          ) {
            // Press "Enter"
            reducer({
              type: "ToggleUserMatches",
              data: filteredMatchRows,
              selections: [
                gridSelection.current.range,
                ...gridSelection.current.rangeStack,
              ],
              join,
            });
            if (
              gridSelection.current.range.width === 1 &&
              gridSelection.current.range.height === 1 &&
              gridSelection.current.rangeStack.length === 0 &&
              gridSelection.current.range.y < filteredMatchRows.numRows - 1
            ) {
              // Advance to the next row
              setGridSelection({
                ...gridSelection,
                current: {
                  ...gridSelection.current,
                  cell: [
                    gridSelection.current.cell[0],
                    gridSelection.current.cell[1] + 1,
                  ],
                  range: {
                    ...gridSelection.current.range,
                    y: gridSelection.current.range.y + 1,
                  },
                },
              });
            }
          } else if (e.metaKey || e.ctrlKey) {
            if (
              e.key === "z" &&
              !e.shiftKey &&
              undo.isPossible &&
              app.canUndo
            ) {
              undo();
            } else if (e.key === "z" && e.shiftKey && redo.isPossible) {
              redo();
            }
          } else if (
            e.key === "Backspace" &&
            gridSelection != null &&
            gridSelection.current != null
          ) {
            reducer({
              type: "ToggleUserMatches",
              selections: [
                gridSelection.current.range,
                ...gridSelection.current.rangeStack,
              ],
              data: filteredMatchRows,
              join,
              forceState: false,
            });
          }
        }}
        onGridSelectionChange={(gridSelection) => {
          if (gridSelection.current && gridSelection.current.range.x === 0) {
            // Push grid selection to ensure col 0 (source) isn't selected
            setGridSelection({
              ...gridSelection,
              current: {
                ...gridSelection.current,
                range: {
                  ...gridSelection.current.range,
                  x: 1,
                  width: gridSelection.current.range.width - 1,
                },
              },
            });
          } else {
            setGridSelection(gridSelection);
          }
        }}
        gridSelection={gridSelection}
        onColumnResize={(_, newSize, colIndex) => {
          setColWidths({ ...colWidths, [colIndex]: newSize });
        }}
        drawCell={({ ctx, rect, cell, row, col }) => {
          if (cell.kind !== GridCellKind.Custom) {
            return false;
          }

          const matchCell = cell.data as Match | MatchRow;
          const isBold = col === 1 && rowHasMatch(matchCell.row);
          const isUserMatch =
            isMatchCell(matchCell) && getUserMatched(matchCell);

          ctx.save();
          if (isBold) {
            ctx.fillStyle = colors.accent;
            ctx.fillRect(
              rect.x + 1,
              rect.y + 1,
              rect.width - 2,
              rect.height - 2
            );
          }
          ctx.restore();

          const draw = (
            text: string,
            yOffset = 0,
            sizeOffset = 0,
            stroked = true
          ) => {
            ctx.save();
            ctx.translate(0, yOffset);
            ctx.fillStyle = "white";
            ctx.font = `${isBold ? "bold" : ""} ${
              18 + sizeOffset
            }px Franklin ITC`;
            if (isBold || isUserMatch) {
              ctx.strokeStyle = colors.primary;
              ctx.lineWidth = stroked ? 4 : 2;
              ctx.lineJoin = "round";
              ctx.miterLimit = 2;
              drawTextWithMatches(
                ctx,
                "stroke",
                text,
                col === 1 || isUserMatch
                  ? ""
                  : app.matches[join][matchCell.row].value,
                rect.x + 5,
                rect.y + rect.height / 2 + 1,
                sizeOffset
              );
            }
            drawTextWithMatches(
              ctx,
              "fill",
              text,
              col === 1 || isUserMatch
                ? ""
                : app.matches[join][matchCell.row].value,
              rect.x + 5,
              rect.y + rect.height / 2 + 1,
              sizeOffset
            );
            ctx.restore();
          };

          if (showMeta === "show" && matchCell.meta) {
            draw(matchCell.value, -7, -1, isMatchCell(matchCell));
            draw(matchCell.meta, 8, -6, isMatchCell(matchCell));
          } else {
            draw(matchCell.value, 0, 0, isMatchCell(matchCell));
          }

          return true;
        }}
        getCellContent={(cell) => {
          const [column, row] = cell;
          let filteredMatches;
          try {
            filteredMatches = filteredMatchRows.getRow(row);
          } catch (e) {
            // This happens when the render is called while data changes
            return {
              kind: GridCellKind.Text,
              data: "",
              allowOverlay: false,
              displayData: "",
            };
          }

          if (column === 0) {
            return {
              kind: GridCellKind.Custom,
              data: filteredMatches,
              allowOverlay: false,
              copyData: filteredMatches.value,
            };
          } else {
            const match = filteredMatches.rankedMatches[column - 1];
            if (!match) {
              return {
                kind: GridCellKind.Text,
                data: "",
                allowOverlay: false,
                displayData: "",
              };
            }
            return {
              kind: GridCellKind.Custom,
              data: match,
              allowOverlay: false,
              copyData: match.value,
              themeOverride:
                match && getUserMatched(match)
                  ? {
                      bgCell: colors.accent,
                      textDark: "black",
                      accentColor: tinycolor(colors.accent)
                        .lighten(10)
                        .toHexString(),
                      accentLight: tinycolor(colors.accent)
                        .darken(10)
                        .toHexString(),
                    }
                  : isMatchedElsewhere(match)
                  ? {
                      bgCell: tinycolor("red").darken(15).toHexString(),
                      accentLight: tinycolor("red").darken(30).toHexString(),
                    }
                  : undefined,
            };
          }
        }}
        columns={columns}
        rows={filteredMatchRows.numRows}
      />
      <div className="button-section">
        <select onInput={(e) => setJoin((e.target as HTMLSelectElement).value)}>
          {allJoins.map((join) => (
            <option key={join} value={join}>
              {join} (
              {app.matches[join]
                .filter((matchRow: MatchRow) => rowHasMatch(matchRow.row, join))
                .length.toLocaleString()}{" "}
              / {app.matches[join].length.toLocaleString()})
            </option>
          ))}
        </select>

        <select
          onInput={(e) =>
            setRowFilter(
              (e.target as HTMLSelectElement).value as
                | "all"
                | "complete"
                | "incomplete"
            )
          }
        >
          <option value="all">
            Show all rows ({app.matches[join].length.toLocaleString()})
          </option>
          <option value="incomplete">
            Show incomplete rows (
            {app.matches[join]
              .filter((matchRow: MatchRow) => !rowHasMatch(matchRow.row))
              .length.toLocaleString()}
            )
          </option>
          <option value="complete">
            Show complete rows (
            {app.matches[join]
              .filter((matchRow: MatchRow) => rowHasMatch(matchRow.row))
              .length.toLocaleString()}
            )
          </option>
        </select>
        <select
          onInput={(e) =>
            setColFilter(
              (e.target as HTMLSelectElement).value as "all" | "hideMatched"
            )
          }
        >
          <option value="hideMatched">Hide matched predictions</option>
          <option value="all">Show matched predictions</option>
        </select>
        <select
          onInput={(e) =>
            setShowMeta(
              (e.target as HTMLSelectElement).value as "show" | "hide"
            )
          }
        >
          <option value="show">Show metadata</option>
          <option value="hide">Hide metadata</option>
        </select>
      </div>
    </>
  );
}
