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
import { extractParts } from "../utils/match";
import { ResetButton } from "./ResetButton";
import { Header } from "./Header";
import downloadIcon from "../assets/downloadIcon.svg";
import { download } from "../utils/download";
import { FilteredMatchRows, joinNorm } from "../utils/helpers";
import { ProgressBar } from "./ProgressBar";

/** Default width of each table column */
const COL_WIDTH = 200;

/** Regex to collect alphanumeric parts of a string */
const partSplit = /([^a-zA-Z0-9]+)/g;

/** The matching table presents a spreadsheet interface */
export function MatchingTable({
  app,
  reducer,
  useUndoRedo,
}: AppReducer & {
  app: MatchingState;
  useUndoRedo: () => [undo: UndoRedo, redo: UndoRedo];
}) {
  // The column widths (updated by dragging columns in the table)
  const [colWidths, setColWidths] = useState<{ [key: number]: number }>({});
  // The current selected grid cells (updated by selecting cells in the table)
  const [gridSelection, setGridSelection] = useState<GridSelection>();
  // The undo/redo state
  const [undo, redo] = useUndoRedo();
  // The row filter control
  const [rowFilter, setRowFilter] = useState<"all" | "complete" | "incomplete">(
    "all"
  );
  // The column filter control
  const [colFilter, setColFilter] = useState<"all" | "hideMatched">(
    "hideMatched"
  );
  // The search filter type control
  const [searchFilterType, setSearchFilterType] = useState<
    "both" | "col" | "row"
  >("both");
  // The search query filter
  const [searchFilter, setSearchFilter] = useState("");
  // The meta display control
  const [showMeta, setShowMeta] = useState<"show" | "hide">("show");

  // Grab all the join values
  const allJoins = Object.keys(app.matches);
  // The join filter (which defaults to showing the first join value)
  const [join, setJoin] = useState(allJoins[0] || "");

  if (allJoins.length === 0) return null;

  // The number of columns shown is based on unfiltered data
  const numColumns = app.matches[join][0].rankedMatches.length + 1;

  // Collect all the grid columns to be displayed in the table
  const columns: GridColumn[] = [
    {
      // Source title contains column / table name
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
    // Collect each prediction column
    // Prediction column title contains column / table name as well
    columns.push({
      title: `P${i + 1} — ${app.columnSelections.right.column} (${
        app.columnSelections.right.tableName
      })`,
      width: colWidths[i + 1] || COL_WIDTH,
    });
  }

  /**
   * Determines if a given cell is matched
   * @param matchCell A match cell
   * @returns Whether the user has marked this cell as a match
   */
  function getUserMatched(matchCell: Match): boolean {
    return app.userMatches[join][`${matchCell.col},${matchCell.row}`];
  }

  /**
   * Gets the user matches for the specified join value
   * @param joinKey The join value for which to get matches
   * @returns A list of each matched cell
   */
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

  /**
   * Gets the user matches for all possible join values
   * @returns A lsit of each matched cell for all the join values
   */
  function getAllUserMatches(): [string, MatchRow, Match][] {
    const results: [string, MatchRow, Match][] = [];
    for (const join of allJoins) {
      for (const match of getUserMatches(join)) {
        results.push([join, app.matches[join][match.row], match]);
      }
    }
    return results;
  }

  // Collect all match information ahead of time for performance reasons
  const userMatches = getUserMatches();
  const userMatchTexts = userMatches.map((x) => x.value);
  const allUserMatches = getAllUserMatches();

  /**
   * @param match A match cell
   * @returns Whether that match cell is matched in a different row
   */
  function isMatchedElsewhere(match: Match): boolean {
    return userMatchTexts.includes(match.value);
  }

  /** A list of all matched rows across all join values */
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

  /**
   * @param row A row index
   * @param subJoin The join value
   * @returns Whether the row has a match
   */
  function rowHasMatch(row: number, subJoin = join): boolean {
    return rowsWithMatches[subJoin]?.[row];
  }

  /** The total number of rows across all join values */
  let totalRows = 0;
  /** The total number of matched rows across all join values */
  let totalMatchedRows = 0;
  for (const [join, rows] of Object.entries(app.matches)) {
    for (let i = 0; i < rows.length; i++) {
      totalRows++;
      if (rowHasMatch(i, join)) totalMatchedRows++;
    }
  }

  /** Dictionary on match row filter algorithms */
  const filters = {
    all: () => true,
    complete: (matchRow: MatchRow) => rowHasMatch(matchRow.row),
    incomplete: (matchRow: MatchRow) => !rowHasMatch(matchRow.row),
  };

  /**
   * The filtered match rows. Uses a utility class to memoize filters
   * and speed up computation
   */
  const filteredMatchRows = new FilteredMatchRows(
    app.matches[join],
    // Cell filter
    (cell) =>
      // Column filter matches
      (colFilter === "all"
        ? true
        : getUserMatched(cell) || !isMatchedElsewhere(cell)) &&
      // Search query matches
      ((searchFilterType !== "both" && searchFilterType !== "col") ||
        searchFn(cell, searchFilter)),
    // Column sort
    (a, b) => {
      // Sift user matches to the first column
      const userMatchedA = getUserMatched(a);
      const userMatchedB = getUserMatched(b);
      if (userMatchedA && !userMatchedB) return -1;
      if (!userMatchedA && userMatchedB) return 1;
      return 0;
    },
    // The row filter
    (row) =>
      // Apply the row display filter
      filters[rowFilter](row) &&
      // And the row search filter
      ((searchFilterType !== "both" && searchFilterType !== "row") ||
        searchFn(row, searchFilter))
  );

  return (
    <>
      <Header lowBottom={true}>
        <div className="upper-section">
          {/* Overall matched progress bar */}
          <ProgressBar percent={totalMatchedRows / totalRows} />

          {/* Search filter */}
          <input
            className="filter"
            placeholder="Filter"
            value={searchFilter}
            onInput={(e) => {
              setSearchFilter((e.target as HTMLInputElement).value);
            }}
          />

          {/* New file button */}
          <ResetButton slim={true} app={app} reducer={reducer} />

          {/* Undo */}
          <Button
            slim={true}
            disabled={!undo.isPossible || !app.canUndo}
            onClick={() => undo()}
          >
            Undo
          </Button>

          {/* Redo */}
          <Button
            slim={true}
            disabled={!redo.isPossible}
            onClick={() => redo()}
          >
            Redo
          </Button>

          {/* Save state */}
          <Button
            slim={true}
            onClick={() => {
              download("crosswalk_savepoint.json", app);
            }}
          >
            Save
          </Button>

          {/* Load state */}
          <input
            type="file"
            id="file-load-button-upload"
            className="hidden"
            onInput={(e) =>
              (async () => {
                let loaded = false;
                const target = e.target as HTMLInputElement;
                const files = Array.from(target.files || []);

                if (files.length === 1) {
                  const rawContents = await files[0].text();
                  const json = JSON.parse(rawContents) as MatchingState;

                  if (json.type === "MatchingState") {
                    reducer({
                      type: "LoadState",
                      state: json,
                    });
                    loaded = true;
                  }
                }

                // Clear the file input
                target.value = "";

                if (!loaded) {
                  alert("Improper file specified");
                }
              })()
            }
          />
          <label htmlFor="file-load-button-upload" className="button-tweak">
            <Button slim={true}>Load</Button>
          </label>

          {/* Export results */}
          <Button
            slim={true}
            icon={{
              url: downloadIcon,
              alt: "Export",
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
            Export matches ({totalMatchedRows.toLocaleString()} /{" "}
            {totalRows.toLocaleString()})
          </Button>
        </div>
      </Header>

      {/* Spreadsheet */}
      <DataEditor
        width={"calc(100vw - 64px)"}
        height={"calc(100vh - 160px)"}
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
            // Undo/redo
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
            // Handle backspace
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
          // Update column widths
          setColWidths({ ...colWidths, [colIndex]: newSize });
        }}
        drawCell={({ ctx, rect, cell, col }) => {
          if (cell.kind !== GridCellKind.Custom) {
            // Only draw custom cells
            return false;
          }

          const matchCell = cell.data as Match | MatchRow;
          // Whether to use bold text
          const isBold = col === 1 && rowHasMatch(matchCell.row);
          const isUserMatch =
            isMatchCell(matchCell) && getUserMatched(matchCell);

          ctx.save();
          if (isBold) {
            // Draw matched accent background if the cell/row is matched
            ctx.fillStyle = colors.accent;
            ctx.fillRect(
              rect.x + 1,
              rect.y + 1,
              rect.width - 2,
              rect.height - 2
            );
          }
          ctx.restore();

          /**
           * Draw text
           * @param text The text to draw
           * @param yOffset The y offset
           * @param sizeOffset The size offset (0 is default sizes)
           * @param stroked Whether the text is thickly stroked
           */
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
              // Draw text outline
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
            // Draw text on top
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

          // Draw with metadata if available
          if (showMeta === "show" && matchCell.meta) {
            draw(matchCell.value, -7, -1, isMatchCell(matchCell));
            draw(matchCell.meta, 8, -6, isMatchCell(matchCell));
          } else {
            // Just draw plain text without metadata
            draw(matchCell.value, 0, 0, isMatchCell(matchCell));
          }

          return true;
        }}
        getCellContent={(cell) => {
          const [column, row] = cell;
          let filteredMatches;
          try {
            // Get the row data in a memoized, performant way
            filteredMatches = filteredMatchRows.getRow(row);
          } catch (e) {
            // This rarely fails when the render is called while data changes
            // Just show a blank cell
            return {
              kind: GridCellKind.Text,
              data: "",
              allowOverlay: false,
              displayData: "",
            };
          }

          if (column === 0) {
            // Draw the source column cell
            return {
              kind: GridCellKind.Custom,
              data: filteredMatches,
              allowOverlay: false,
              copyData: filteredMatches.value,
            };
          } else {
            // Draw the prediction column cell
            const match = filteredMatches.rankedMatches[column - 1];
            if (!match) {
              // Simple empty text if the cell is out of bounds
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
                      // Show accented bg if matched
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
                      // Show red if matched elsewhere and not hidden
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

      {/* Footer controls */}
      <div className="button-section">
        {/* Join value filter */}
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

        {/* Row display filter */}
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

        {/* Column display filter */}
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

        {/* Metadata display control */}
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

        {/* Search filter type control */}
        <select
          onInput={(e) =>
            setSearchFilterType(
              (e.target as HTMLSelectElement).value as "both" | "col" | "row"
            )
          }
        >
          <option value="both">Filter all</option>
          <option value="row">Filter source</option>
          <option value="col">Filter prediction</option>
        </select>
      </div>
    </>
  );
}

/**
 * Draws text for a cell with highlighted subpart matches
 * @param ctx The canvas drawing context
 * @param method Whether to draw filled or stroked text
 * @param targetText The target text to draw
 * @param sourceText Source text to be used to highlight subpart matches
 * @param x The x coordinate at which to begin drawing
 * @param y The y coordinate at which to begin drawing
 * @param sizeOffset Size offset for font sizes (0 is normal sizes)
 */
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

  // Extract target and source text parts
  // (a match is determined as a matching subpart for drawing purposes)
  const targetParts = targetText.split(partSplit);
  const sourceParts = extractParts(sourceText).map((x) => x.toLowerCase());

  for (let i = 0; i < targetParts.length; i++) {
    // The target split regex alternates returning parts and in-between text
    // (e.g. '-', '_', ' ', etc.)
    const isPart = i % 2 === 0;
    const str = targetParts[i];
    // Highlight the part if it is found in the source parts (case-insensitive)
    const isBold = isPart && sourceParts.includes(str.toLowerCase());

    // Measure the part to know how much to advance the x value by
    const measurements = ctx.measureText(str);
    ctx.save();
    if (isBold) {
      // Add padding around text if highlighted
      x += 3;
      // Make the font bold
      ctx.font = `bold ${ctx.font}`;
      ctx.fillStyle = colors.primary;
      // Highlight rectangle
      ctx.fillRect(
        x - 2,
        y - 10 - sizeOffset / 2,
        measurements.width + 4,
        20 + sizeOffset
      );
      ctx.fillStyle = colors.fgColor;

      // Stroke a text outline
      ctx.strokeStyle = colors.fgColor;
      ctx.lineWidth = 0.2;
      ctx.lineJoin = "round";
      ctx.miterLimit = 2;
      ctx.strokeText(str, x, y);
    }
    // Draw the text
    drawText(str, x, y);
    ctx.restore();
    // Advance the x for the next part
    x += measurements.width + (isBold ? 3 : 0);
  }
}

/**
 * @param match A match cell or match row
 * @returns Whether the match is a match cell
 */
function isMatchCell(match: Match | MatchRow): match is Match {
  return "col" in match;
}

/**
 * @param match A match cell or row
 * @param filter The search query filter
 * @returns Whether the match value matches the query (case-insensitive)
 */
const searchFn = (match: MatchRow | Match, filter: string): boolean => {
  const query = joinNorm(filter);
  if (query.length === 0) return true;
  const matched = joinNorm(match.value).includes(query);
  if (matched) return true;
  if (match.meta) {
    return joinNorm(match.meta).includes(query);
  }
  return false;
};
