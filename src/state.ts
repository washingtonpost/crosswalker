import React from "react";
import { fileToTable, Table } from "./utils/extractTable";
import { createUndoRedo } from "react-undo-redo";
import { automatchFullResults } from "./utils/match";
import localforage from "localforage";
import { FilteredMatchRows } from "./utils/helpers";

// UPDATE THIS WHENEVER THIS FILE IS CHANGED
// OTHERWISE YOU MAY DESERIALIZE TO AN UNSTABLE STATE
export const VERSION = 1;

/** The application state */
export type State =
  | WelcomeState
  | TablesAddedState
  | ProcessingState
  | MatchingState;

/** The welcome state at the beginning of the application */
export interface WelcomeState {
  type: "WelcomeState";
}

/**
 * The state after tables have been added and when the user is configuring
 * columns
 */
export interface TablesAddedState {
  type: "TablesAddedState";
  /** The selected table index */
  selectedTable: number;
  /** The uploaded tables */
  tables: Table[];
  /** The column currently being hovered */
  hoverColumn: number | null;
  /** The column selection currently active */
  setColumnSelection: ColumnSelectionType | null;
  /** Columns that have been selected */
  columnSelections: {
    /** The left, or source, column */
    leftColumn: TableIndex | null;
    /** The right, or match, column */
    rightColumn: TableIndex | null;
    /** The left, or source, join column */
    leftJoin: TableIndex | null;
    /** The right, or match, join column */
    rightJoin: TableIndex | null;
    /** The left, or source, metadata column */
    leftMeta: TableIndex | null;
    /** The right, or match, metadata column */
    rightMeta: TableIndex | null;
  };
}

/**
 * The state after column selection where the matching algorithm is running and a progress bar is displayed
 */
export interface ProcessingState {
  type: "ProcessingState";
  /** The tables originally used */
  tables: Table[];
  /** The column selections */
  columnSelections: ColumnSelections;
  /** The matching progress */
  progress: number;
}

/** The state where the user matches with a spreadsheet interface */
export interface MatchingState {
  type: "MatchingState";
  /** The tables originally used */
  tables: Table[];
  /** All the rows to show, segmented by join value */
  matches: {
    [join: string]: MatchRow[];
  };
  /** The matches created by the user */
  userMatches: {
    [join: string]: {
      [index: string]: boolean;
    };
  };
  /** The original column selections */
  columnSelections: ColumnSelections;
  /** Whether the user can undo */
  canUndo: boolean;
}

/** An action that modifies application state */
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
  | Reset
  | LoadState;

/** Add tables from files */
export interface AddTablesFromFiles {
  type: "AddTablesFromFiles";
  /** The files as [filename, array buffer] tuples */
  nameBuffers: [string, ArrayBuffer][];
}

/** Remove a table */
export interface RemoveTable {
  type: "RemoveTable";
  /** The table index to remove */
  index: number;
}

/** Select a table */
export interface SelectTable {
  type: "SelectTable";
  /** The table index to select */
  index: number;
}

/** Hover over a table column */
export interface HoverColumn {
  type: "HoverColumn";
  /** The column index to hover over */
  index: number | null;
}

/** Set a currently active column selection */
export interface SetColumnSelection {
  type: "SetColumnSelection";
  /** The column selection */
  value: ColumnSelectionType | null;
}

/** Clear the value of a column selection */
export interface ClearColumnSelection {
  type: "ClearColumnSelection";
  /** The column selection to clear */
  value: ColumnSelectionType;
}

/** Select a column to be selected */
export interface SelectColumnForSelection {
  type: "SelectColumnForSelection";
  /** The column index to select */
  index: number;
}

/** Transition to the processing state */
export interface StartProcessing {
  type: "StartProcessing";
}

/** Update progress in the processing state */
export interface UpdateProgress {
  type: "UpdateProgress";
  /** The new progress number */
  progress: number;
}

/** Finish processing and move to the matching state */
export interface FinishProcessing {
  type: "FinishProcessing";
  /** The processing results spreadsheet */
  results: [string, MatchRow[]][];
}

/** Toggle user matches on the spreadsheet */
export interface ToggleUserMatches {
  type: "ToggleUserMatches";
  /** The join value */
  join: string;
  /** The data being operated on */
  data: FilteredMatchRows;
  /** The selected cells */
  selections: Selection[];
  /**
   * By default, toggles. If this is set, it will force a certain state (true =
   * match, false = unmatch)
   */
  forceState?: boolean;
}

/** Reset the entire application (new button) */
export interface Reset {
  type: "Reset";
}

/** Load an entire application state */
export interface LoadState {
  type: "LoadState";
  /** The state to load (must be a matching state) */
  state: MatchingState;
}

/** The default application state */
export const defaultState: State = {
  type: "WelcomeState",
};

/**
 * The main reducer for the application state
 * @param state The current state
 * @param action The action to apply to the state
 * @returns A new state for after the action is applied
 */
export function appReducer(state: State, action: Action): State {
  switch (action.type) {
    case "AddTablesFromFiles":
      // Convert files to tables
      const initialTables: [string, Table | null][] = action.nameBuffers.map(
        (buffer) => [buffer[0], fileToTable(buffer[0], buffer[1])]
      );

      // Identify any invalid tables and alert the user
      const invalidTables = initialTables.filter((table) => table[1] == null);
      if (invalidTables.length > 0) {
        alert(
          `Some invalid tables were passed: ${invalidTables.map((x) => x[0])}`
        );
      }

      // Extract correct tables
      const tables: Table[] = initialTables
        .map((x) => x[1])
        .filter((table) => table != null) as Table[];

      return resolveTableFlow({
        ...state,
        ...(state.type === "TablesAddedState"
          ? // If state is already TablesAddedState, don't lose column selections
            state
          : {
              // Initial column selection state
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
            }),
        type: "TablesAddedState",
        selectedTable:
          // If state is already TablesAddedState, don't lose currently selected table
          state.type === "TablesAddedState" ? state.selectedTable : 0,
        tables: [
          // Add to the tables
          ...(state.type === "TablesAddedState" ? state.tables : []),
          ...tables,
        ],
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
            // Update the specified column selection
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
        // Don't do anything if nothing is selected
        return state;
      }
    case "ClearColumnSelection":
      if (state.type === "TablesAddedState") {
        return {
          ...state,
          columnSelections: {
            ...state.columnSelections,
            // Clear the specified column selection
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
          // Only process if valid / possible
          return state;
        }

        // Extract meta and join info
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
          // Join can only happen if both are specified
          join = {
            left: state.columnSelections.leftJoin,
            right: state.columnSelections.rightJoin,
          };
        }

        return {
          // Begin processing
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
          // Construct initial matching state
          matches: Object.fromEntries(action.results),
          tables: state.tables,
          // Automatch entries that are pretty obvious matches
          userMatches: automatchFullResults(action.results),
          columnSelections: state.columnSelections,
          // Cannot undo until an action is applied
          canUndo: false,
        };
      } else {
        return state;
      }
    case "ToggleUserMatches":
      if (state.type === "MatchingState") {
        // Fix selection to not include source column
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
              // Update the user matches
              const matchCell = action.data.getRow(y).rankedMatches[x];
              newMatches[action.join][`${matchCell.col},${matchCell.row}`] =
                selectState;
            }
          }
        }
        // Inject the new matches into the state (and make it undoable)
        return { ...state, userMatches: newMatches, canUndo: true };
      } else {
        return state;
      }
    case "Reset":
      return defaultState;
    case "LoadState":
      return action.state;
  }
}

/** The key for local storage */
export const LOCAL_STORAGE_KEY = "crosswalker_storage";

/**
 * A wrapper to persist a reducer's outputs to local storage
 * @param reducer The reducer to extend
 * @param saveCondition A condition which must be true to save to local storage
 * @param localStorageKey The local storage key to use
 * @returns A reducer with the ability to conditionally save to local storage
 */
export function localStorageReducer<T, TArgs extends Array<any>>(
  reducer: (...args: TArgs) => T,
  saveCondition: (state: T) => boolean = () => true,
  localStorageKey = LOCAL_STORAGE_KEY
): (...args: TArgs) => T {
  return (...args: TArgs) => {
    const newState = reducer(...args);

    // Update the item in local forage
    if (saveCondition(newState)) {
      localforage.setItem(localStorageKey, [VERSION, newState]);
    }

    return newState;
  };
}

/** A hook to create the main reducer for the application */
export function useAppReducer() {
  // Inject undo/redo capabilities and local storage persistence
  return createUndoRedo(
    localStorageReducer(appReducer, (state) => state.type === "MatchingState")
  );
}

// Helper types

/** A commonly used property type to pass in the app state and reducer */
export interface AppReducer {
  app: State;
  reducer: React.Dispatch<Action>;
}

/** A match row */
export interface MatchRow {
  /** The source value text of the row */
  value: string;
  /** Optional metadata attached to the source value */
  meta?: string;
  /** The original row number in the source file */
  index: number;
  /** The row number */
  row: number;
  /** A list of all possible matches ranked by score */
  rankedMatches: Match[];
}

/** A match cell */
export interface Match {
  /** The match score */
  score: number;
  /** The match value text for the cell */
  value: string;
  /** Optional metadata attached to the match value */
  meta?: string;
  /** The original column number in the source file */
  index: number;
  /** The sorted, ranked column number in match row's rankedMatches */
  col: number;
  /** The row number */
  row: number;
}

/** A rectangular selection of cells */
export interface Selection {
  /** The leftmost x-coordinate of the selection */
  x: number;
  /** The topmost y-coordinate of the selection */
  y: number;
  /** The width of the selection in cells */
  width: number;
  /** The height of the selection in rows */
  height: number;
}

/** A helper type to match the undo/redo reducer type */
export type UndoRedo = {
  (): void;
  isPossible: boolean;
};

/** User configuration for which columns to use in the application */
export interface ColumnSelections {
  /** The left, or source, column index */
  left: TableIndex;
  /** The right, or match, column index */
  right: TableIndex;
  /** Optional join column info */
  join?: {
    /** The left, or source, join column index */
    left: TableIndex;
    /** The right, or match, join column index */
    right: TableIndex;
  };
  /** Metadata */
  meta: {
    /** The optional left, or source, metadata column index */
    left: TableIndex | null;
    /** The optional right, or match, metadata column index */
    right: TableIndex | null;
  };
}

/** A column selection */
export type ColumnSelectionType =
  | "leftColumn"
  | "rightColumn"
  | "leftJoin"
  | "rightJoin"
  | "leftMeta"
  | "rightMeta";

/** An index into a column in added tables */
export interface TableIndex {
  tableIndex: number;
  tableName: string;
  column: string;
}

/**
 * A helper utility to remove a specified index from an array
 * @param array The array
 * @param index The index of the array to remove
 * @returns The array with the specified index removed
 */
export function removeIndex<T>(array: T[], index: number): T[] {
  return array.filter((_, i) => i !== index);
}

/**
 * A helper to resolve a TablesAddedState. If the number of tables after an
 * action is 0, go back to the welcome state
 */
export function resolveTableFlow(state: State): State {
  if (state.type === "TablesAddedState" && state.tables.length === 0) {
    return defaultState;
  }
  return state;
}
