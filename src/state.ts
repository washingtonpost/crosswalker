import React from "react";
import { fileToTable, Table } from "./utils/extractTable";
import { createUndoRedo } from "react-undo-redo";
import { automatchFullResults, FilteredMatchRows } from "./utils/match";

export type State =
  | WelcomeState
  | TablesAddedState
  | ProcessingState
  | MatchingState;

export interface MatchRow {
  value: string;
  meta?: string;
  index: number;
  row: number;
  rankedMatches: Match[];
}

export interface Match {
  score: number;
  value: string;
  meta?: string;
  index: number;
  col: number;
  row: number;
}

export interface Selection {
  x: number;
  y: number;
  width: number;
  height: number;
}

export type UndoRedo = {
  (): void;
  isPossible: boolean;
};

export interface ColumnSelections {
  left: TableIndex;
  right: TableIndex;
  join?: {
    left: TableIndex;
    right: TableIndex;
  };
  meta: {
    left: TableIndex | null;
    right: TableIndex | null;
  };
}

export interface WelcomeState {
  type: "WelcomeState";
}

export type ColumnSelectionType =
  | "leftColumn"
  | "rightColumn"
  | "leftJoin"
  | "rightJoin"
  | "leftMeta"
  | "rightMeta";

export interface TableIndex {
  tableIndex: number;
  tableName: string;
  column: string;
}

export interface TablesAddedState {
  type: "TablesAddedState";
  selectedTable: number;
  tables: Table[];
  hoverColumn: number | null;
  setColumnSelection: ColumnSelectionType | null;
  columnSelections: {
    leftColumn: TableIndex | null;
    rightColumn: TableIndex | null;
    leftJoin: TableIndex | null;
    rightJoin: TableIndex | null;
    leftMeta: TableIndex | null;
    rightMeta: TableIndex | null;
  };
}

export interface ProcessingState {
  type: "ProcessingState";
  tables: Table[];
  columnSelections: ColumnSelections;
  progress: number;
}

export interface MatchingState {
  type: "MatchingState";
  tables: Table[];
  matches: {
    [join: string]: MatchRow[];
  };
  userMatches: {
    [join: string]: {
      [index: string]: boolean;
    };
  };
  columnSelections: ColumnSelections;
  canUndo: boolean;
}

export type Action =
  | AddTablesFromFiles
  | RemoveTable
  | SelectTable
  | HoverColumn
  | SetColumnSelection
  | SelectColumnForSelection
  | ClearColumnSelection
  | StartProcessing
  | UpdateProgress
  | FinishProcessing
  | ToggleUserMatches
  | Reset;

export interface AddTablesFromFiles {
  type: "AddTablesFromFiles";
  nameBuffers: [string, ArrayBuffer][];
}

export interface RemoveTable {
  type: "RemoveTable";
  index: number;
}

export interface SelectTable {
  type: "SelectTable";
  index: number;
}

export interface HoverColumn {
  type: "HoverColumn";
  index: number | null;
}

export interface SetColumnSelection {
  type: "SetColumnSelection";
  value: ColumnSelectionType | null;
}

export interface ClearColumnSelection {
  type: "ClearColumnSelection";
  value: ColumnSelectionType;
}

export interface SelectColumnForSelection {
  type: "SelectColumnForSelection";
  index: number;
}

export interface StartProcessing {
  type: "StartProcessing";
}

export interface UpdateProgress {
  type: "UpdateProgress";
  progress: number;
}

export interface FinishProcessing {
  type: "FinishProcessing";
  results: [string, MatchRow[]][];
}

export interface ToggleUserMatches {
  type: "ToggleUserMatches";
  join: string;
  data: FilteredMatchRows;
  selections: Selection[];
  forceState?: boolean;
}

export interface Reset {
  type: "Reset";
}

export const defaultState: State = {
  type: "WelcomeState",
};

export function removeIndex<T>(array: T[], index: number): T[] {
  return array.filter((_, i) => i !== index);
}

export function resolveTableFlow(state: State): State {
  if (state.type === "TablesAddedState" && state.tables.length === 0) {
    return defaultState;
  }
  return state;
}

export function appReducer(state: State, action: Action): State {
  switch (action.type) {
    case "AddTablesFromFiles":
      const tables: Table[] = action.nameBuffers
        .map((buffer) => fileToTable(buffer[0], buffer[1]))
        .filter((table) => table != null) as Table[];

      return resolveTableFlow({
        ...state,
        type: "TablesAddedState",
        selectedTable:
          state.type === "TablesAddedState" ? state.selectedTable : 0,
        tables: [
          ...(state.type === "TablesAddedState" ? state.tables : []),
          ...tables,
        ],
        hoverColumn: null,
        setColumnSelection: null,
        columnSelections: {
          leftColumn: null,
          rightColumn: null,
          leftJoin: null,
          rightJoin: null,
          leftMeta: null,
          rightMeta: null,
        },
      });
    case "RemoveTable":
      if (state.type === "TablesAddedState") {
        return resolveTableFlow({
          ...state,
          tables: removeIndex(state.tables, action.index),
        });
      } else {
        return state;
      }
    case "SelectTable":
      if (state.type === "TablesAddedState") {
        return {
          ...state,
          selectedTable: action.index,
        };
      } else {
        return state;
      }
    case "HoverColumn":
      if (
        state.type === "TablesAddedState" &&
        state.setColumnSelection != null
      ) {
        return {
          ...state,
          hoverColumn: action.index,
        };
      } else {
        return state;
      }
    case "SetColumnSelection":
      if (state.type === "TablesAddedState") {
        return {
          ...state,
          setColumnSelection:
            state.setColumnSelection === action.value ? null : action.value,
        };
      } else {
        return state;
      }
    case "SelectColumnForSelection":
      if (
        state.type === "TablesAddedState" &&
        state.setColumnSelection != null
      ) {
        return {
          ...state,
          columnSelections: {
            ...state.columnSelections,
            [state.setColumnSelection]: {
              tableIndex: state.selectedTable,
              tableName: state.tables[state.selectedTable].name,
              column: state.tables[state.selectedTable].headers[action.index],
            },
          },
          setColumnSelection: null,
          hoverColumn: null,
        };
      } else {
        return state;
      }
    case "ClearColumnSelection":
      if (state.type === "TablesAddedState") {
        return {
          ...state,
          columnSelections: {
            ...state.columnSelections,
            [action.value]: null,
          },
        };
      } else {
        return state;
      }
    case "StartProcessing":
      if (state.type === "TablesAddedState") {
        if (
          !state.columnSelections.leftColumn ||
          !state.columnSelections.rightColumn
        ) {
          return state;
        }

        let join: { left: TableIndex; right: TableIndex } | undefined =
          undefined;

        const meta: { left: TableIndex | null; right: TableIndex | null } = {
          left: state.columnSelections.leftMeta,
          right: state.columnSelections.rightMeta,
        };

        if (
          state.columnSelections.leftJoin &&
          state.columnSelections.rightJoin
        ) {
          join = {
            left: state.columnSelections.leftJoin,
            right: state.columnSelections.rightJoin,
          };
        }

        return {
          type: "ProcessingState",
          tables: state.tables,
          columnSelections: {
            left: state.columnSelections.leftColumn,
            right: state.columnSelections.rightColumn,
            join,
            meta,
          },
          progress: 0,
        };
      } else {
        return state;
      }
    case "UpdateProgress":
      if (state.type === "ProcessingState") {
        return {
          ...state,
          progress: action.progress,
        };
      } else {
        return state;
      }
    case "FinishProcessing":
      if (state.type === "ProcessingState") {
        return {
          type: "MatchingState",
          matches: Object.fromEntries(action.results),
          tables: state.tables,
          userMatches: automatchFullResults(action.results),
          columnSelections: state.columnSelections,
          canUndo: false,
        };
      } else {
        return state;
      }
    case "ToggleUserMatches":
      if (state.type === "MatchingState") {
        // Fix selection
        const newSelections: Selection[] = [];
        for (const selection of action.selections) {
          let newSelection = { ...selection };
          if (newSelection.x === 0) {
            newSelection.x++;
            newSelection.width--;
          }
          newSelections.push(newSelection);
        }

        // Check selection status
        let allTrue = true;
        let allFalse = true;
        for (const selection of newSelections) {
          for (let y = selection.y; y < selection.y + selection.height; y++) {
            for (
              let x = selection.x - 1;
              x < selection.x + selection.width - 1;
              x++
            ) {
              const matchCell = action.data.getRow(y).rankedMatches[x];
              if (
                state.userMatches[action.join][
                  `${matchCell.col},${matchCell.row}`
                ]
              ) {
                allFalse = false;
              } else {
                allTrue = false;
              }
            }
          }
        }
        // Apply selection
        const selectState =
          action.forceState != null
            ? action.forceState
            : allFalse
            ? true
            : allTrue
            ? false
            : true;
        const newMatches = {
          ...state.userMatches,
          [action.join]: { ...(state.userMatches[action.join] || {}) },
        };
        for (const selection of newSelections) {
          for (let y = selection.y; y < selection.y + selection.height; y++) {
            for (
              let x = selection.x - 1;
              x < selection.x + selection.width - 1;
              x++
            ) {
              const matchCell = action.data.getRow(y).rankedMatches[x];
              newMatches[action.join][`${matchCell.col},${matchCell.row}`] =
                selectState;
            }
          }
        }
        return { ...state, userMatches: newMatches, canUndo: true };
      } else {
        return state;
      }
    case "Reset":
      return defaultState;
  }
}

export function useAppReducer() {
  return createUndoRedo(appReducer);
}

export interface AppReducer {
  app: State;
  reducer: React.Dispatch<Action>;
}
