import React, { useReducer } from "react";
import { fileToTable, Table } from "./utils/extractTable";

export type State =
  | WelcomeState
  | TablesAddedState
  | ProcessingState
  | MatchingState;

export interface MatchRow {
  value: string;
  index: number;
  rankedMatches: Match[];
}

export interface Match {
  score: number;
  value: string;
  index: number;
}

export interface WelcomeState {
  type: "WelcomeState";
}

export type ColumnSelectionType =
  | "leftColumn"
  | "leftJoin"
  | "rightColumn"
  | "rightJoin";

export interface TableIndex {
  table: number;
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
    leftJoin: TableIndex | null;
    rightColumn: TableIndex | null;
    rightJoin: TableIndex | null;
  };
}

export interface ProcessingState {
  type: "ProcessingState";
  tables: Table[];
  columnSelections: {
    left: TableIndex;
    right: TableIndex;
    join?: {
      left: TableIndex;
      right: TableIndex;
    };
  };
  progress: number;
}

export interface MatchingState {
  type: "MatchingState";
  tables: Table[];
  matches: MatchRow[];
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
  | FinishProcessing;

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
  results: MatchRow[];
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
          leftJoin: null,
          rightColumn: null,
          rightJoin: null,
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
              table: state.selectedTable,
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
          matches: action.results,
          tables: state.tables,
        };
      } else {
        return state;
      }
  }
}

export function useAppReducer(initialState = defaultState) {
  return useReducer(appReducer, initialState);
}

export interface AppReducer {
  app: State;
  reducer: React.Dispatch<Action>;
}
