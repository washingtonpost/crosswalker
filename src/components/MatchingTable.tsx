import { AppReducer, MatchingState, UndoRedo } from "../state";
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

const COL_WIDTH = 200;

// function drawCell() {}

const partSplit = /([^a-zA-Z0-9]+)/g;

function drawTextWithMatches(
  ctx: CanvasRenderingContext2D,
  method: "fill" | "stroke",
  targetText: string,
  sourceText: string,
  x: number,
  y: number
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
      ctx.fillRect(x - 2, y - 10, measurements.width + 4, 20);
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

  if (app.matches.length === 0) return null;

  const numColumns = app.matches[0].rankedMatches.length + 1;
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

  function isUserMatched(text: string): boolean {
    const entries = Object.entries(app.userMatches);
    for (const [key, value] of entries) {
      if (!value) continue;
      const parts = key.split(",");
      const x = parseInt(parts[0]);
      const y = parseInt(parts[1]);
      if (app.matches[y].rankedMatches[x].value === text) return true;
    }
    return false;
  }

  return (
    <>
      <DataEditor
        width={"calc(100vw - 64px)"}
        height={"80vh"}
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
            reducer({
              type: "ToggleUserMatches",
              selections: [
                gridSelection.current.range,
                ...gridSelection.current.rangeStack,
              ],
            });
            if (
              gridSelection.current.range.width === 1 &&
              gridSelection.current.range.height === 1 &&
              gridSelection.current.rangeStack.length === 0 &&
              gridSelection.current.range.y < app.matches.length - 1
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
              forceState: false,
            });
          }
        }}
        onGridSelectionChange={(gridSelection) => {
          if (gridSelection.current && gridSelection.current.range.x === 0) {
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
          if (cell.kind !== GridCellKind.Text) {
            return false;
          }

          const isBold =
            col === 1 &&
            Object.entries(app.userMatches).some(
              ([key, value]) => value && key.endsWith(`,${row}`)
            );
          const isUserMatch = app.userMatches[`${col - 2},${row}`];

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
          ctx.fillStyle = "white";
          ctx.font = `${isBold ? "bold" : ""} 18px Franklin ITC`;
          if (isBold || isUserMatch) {
            ctx.strokeStyle = colors.primary;
            ctx.lineWidth = 4;
            ctx.lineJoin = "round";
            ctx.miterLimit = 2;
            drawTextWithMatches(
              ctx,
              "stroke",
              cell.data,
              col === 1 || isUserMatch ? "" : app.matches[row].value,
              rect.x + 5,
              rect.y + rect.height / 2 + 1
            );
          }
          drawTextWithMatches(
            ctx,
            "fill",
            cell.data,
            col === 1 || isUserMatch ? "" : app.matches[row].value,
            rect.x + 5,
            rect.y + rect.height / 2 + 1
          );
          ctx.restore();
          return true;
        }}
        getCellContent={(cell) => {
          const [column, row] = cell;
          const match = app.matches[row];
          if (column === 0) {
            return {
              kind: GridCellKind.Text,
              data: match.value,
              allowOverlay: false,
              displayData: match.value,
            };
          } else {
            return {
              kind: GridCellKind.Text,
              data: match.rankedMatches[column - 1].value,
              allowOverlay: false,
              displayData: match.rankedMatches[column - 1].value,
              themeOverride: app.userMatches[`${column - 1},${row}`]
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
                : isUserMatched(match.rankedMatches[column - 1].value)
                ? {
                    bgCell: tinycolor("red").darken(15).toHexString(),
                    accentLight: tinycolor("red").darken(30).toHexString(),
                  }
                : undefined,
            };
          }
        }}
        columns={columns}
        rows={app.matches.length}
      />
      <div className="button-section">
        <Button
          slim={true}
          disabled={!undo.isPossible || !app.canUndo}
          onClick={() => undo()}
        >
          Undo
        </Button>

        <Button slim={true} disabled={!redo.isPossible} onClick={() => redo()}>
          Redo
        </Button>

        <ResetButton slim={true} app={app} reducer={reducer} />
      </div>
    </>
  );
}
