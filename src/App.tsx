// import React from 'react';
import uploadIcon from "./assets/uploadIcon.svg";
import fileIcon from "./assets/fileIcon.svg";
import continueIcon from "./assets/continueIcon.svg";
import "./App.css";
import "@glideapps/glide-data-grid/dist/index.css";

import { Button } from "./components/Button";
import {
  Action,
  AppReducer,
  ColumnSelectionType,
  defaultState,
  LOCAL_STORAGE_KEY,
  State,
  TableIndex,
  TablesAddedState,
  UndoRedo,
  useAppReducer,
  VERSION,
} from "./state";
import { Table } from "./utils/extractTable";
import { Matcher } from "./components/Matcher";
import { MatchingTable } from "./components/MatchingTable";
import { Dispatch, useEffect, useState } from "react";
import { ResetButton } from "./components/ResetButton";
import localforage from "localforage";
import { Header } from "./components/Header";

function Instructions({ app }: AppReducer) {
  return app.type === "WelcomeState" ? (
    <p>Welcome! Upload CSV and JSON files to get started.</p>
  ) : app.type === "TablesAddedState" ? (
    <p>
      Select columns corresponding to the data by clicking in the tables below.
    </p>
  ) : app.type === "ProcessingState" ? (
    <p>Auto-crosswalking...</p>
  ) : null;
}

function FileUploader({ app, reducer }: AppReducer) {
  return (
    <>
      <input
        type="file"
        id="file-upload"
        className="hidden"
        multiple
        onInput={(e) =>
          (async () => {
            const files = Array.from(
              (e.target as HTMLInputElement).files || []
            );
            const arrayBuffers = await Promise.all(
              files.map((file) => file.arrayBuffer())
            );
            const names = files.map((file) => file.name);
            const nameBuffers = names.map<[string, ArrayBuffer]>((name, i) => [
              name,
              arrayBuffers[i],
            ]);

            reducer({
              type: "AddTablesFromFiles",
              nameBuffers: nameBuffers,
            });
          })()
        }
      />
      {app.type === "TablesAddedState" &&
        app.tables.map((table, i) => (
          <Button
            icon={{
              url: fileIcon,
              alt: "File",
            }}
            slim={true}
            type={
              app.type === "TablesAddedState" && app.selectedTable === i
                ? "primary"
                : "secondary"
            }
            key={i}
            onClick={() => reducer({ type: "SelectTable", index: i })}
          >
            {table.name}
          </Button>
        ))}

      {(app.type === "WelcomeState" || app.type === "TablesAddedState") && (
        <label htmlFor="file-upload">
          <Button
            slim={app.type !== "WelcomeState"}
            type={app.type === "WelcomeState" ? "primary" : "secondary"}
            icon={{
              url: uploadIcon,
              alt: "Upload",
            }}
          >
            Upload files
          </Button>
        </label>
      )}
    </>
  );
}

function PreviewTable({
  table,
  app,
  reducer,
}: AppReducer & {
  table: Table;
  hoverColumn: number | null;
  app: TablesAddedState;
}) {
  const ColumnSelection = (column: TableIndex | null) => {
    if (column == null) return null;
    return (
      <span className="column-selection">
        {column.tableName}: {column.column}
      </span>
    );
  };

  const ColumnSelectButton = ({ type }: { type: ColumnSelectionType }) => {
    const preTexts: { [K in ColumnSelectionType]: string } = {
      leftColumn: "Select source column",
      rightColumn: "Select match column",
      leftJoin: "Select source join",
      rightJoin: "Select match join",
      leftMeta: "Select source meta",
      rightMeta: "Select match meta",
    };
    const postTexts: { [K in ColumnSelectionType]: string } = {
      leftColumn: "Source column",
      rightColumn: "Match column",
      leftJoin: "Source join column",
      rightJoin: "Match join column",
      leftMeta: "Source meta column",
      rightMeta: "Match meta column",
    };

    return (
      <>
        <div className="button-section">
          {app.columnSelections[type] != null && (
            <span
              className="remove-action"
              onClick={() =>
                reducer({
                  type: "ClearColumnSelection",
                  value: type,
                })
              }
            >
              {/* Close icon */}
              <svg
                width="14"
                height="14"
                viewBox="0 0 14 14"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M13.1138 3.4595L10.1638 0.509537L6.64038 4.033L3.11694 0.509537L0.166992 3.4595L3.69043 6.98298L0.166992 10.5065L3.11694 13.4564L6.64038 9.93295L10.1638 13.4564L13.1138 10.5065L9.59033 6.98297L13.1138 3.4595Z"
                  fill="white"
                />
                <path
                  d="M13.1138 3.4595L10.1638 0.509537L6.64038 4.033L3.11694 0.509537L0.166992 3.4595L3.69043 6.98298L0.166992 10.5065L3.11694 13.4564L6.64038 9.93295L10.1638 13.4564L13.1138 10.5065L9.59033 6.98297L13.1138 3.4595Z"
                  fill="white"
                />
              </svg>
            </span>
          )}

          <Button
            slim={true}
            type={app.setColumnSelection === type ? "inverted" : "secondary"}
            onClick={() =>
              reducer({
                type: "SetColumnSelection",
                value: type,
              })
            }
          >
            {app.columnSelections[type] != null
              ? postTexts[type]
              : preTexts[type]}{" "}
            {ColumnSelection(app.columnSelections[type])}
          </Button>
        </div>
      </>
    );
  };

  return (
    <>
      {(() => {
        const colsDiffer = (col1: TableIndex, col2: TableIndex): boolean => {
          return (
            col1.tableIndex === col2.tableIndex && col1.column === col2.column
          );
        };

        // Ensure the target and join columns differ
        if (
          app.columnSelections.leftJoin &&
          app.columnSelections.leftColumn &&
          colsDiffer(
            app.columnSelections.leftJoin,
            app.columnSelections.leftColumn
          )
        ) {
          return (
            <p className="warn">
              The source column and source join column must differ to proceed.
            </p>
          );
        }

        if (
          app.columnSelections.rightJoin &&
          app.columnSelections.rightColumn &&
          colsDiffer(
            app.columnSelections.rightJoin,
            app.columnSelections.rightColumn
          )
        ) {
          return (
            <p className="warn">
              The match column and match join column must differ to proceed.
            </p>
          );
        }

        // Ensure the target and join columns are in the same table
        if (
          app.columnSelections.leftJoin &&
          app.columnSelections.leftColumn &&
          app.columnSelections.leftJoin.tableIndex !==
            app.columnSelections.leftColumn.tableIndex
        ) {
          return (
            <p className="warn">
              The source column and source join column must be in the same table
              to proceed.
            </p>
          );
        }
        console.log(app.columnSelections);

        if (
          app.columnSelections.rightJoin &&
          app.columnSelections.rightColumn &&
          app.columnSelections.rightJoin.tableIndex !==
            app.columnSelections.rightColumn.tableIndex
        ) {
          return (
            <p className="warn">
              The match column and match join column must be in the same table
              to proceed.
            </p>
          );
        }

        // Ensure the target and meta columns differ
        if (
          app.columnSelections.leftMeta &&
          app.columnSelections.leftColumn &&
          colsDiffer(
            app.columnSelections.leftMeta,
            app.columnSelections.leftColumn
          )
        ) {
          return (
            <p className="warn">
              The source column and source meta column must differ to proceed.
            </p>
          );
        }

        if (
          app.columnSelections.rightMeta &&
          app.columnSelections.rightColumn &&
          colsDiffer(
            app.columnSelections.rightMeta,
            app.columnSelections.rightColumn
          )
        ) {
          return (
            <p className="warn">
              The match column and match meta column must differ to proceed.
            </p>
          );
        }

        // Ensure the target and meta columns are in the same table
        if (
          app.columnSelections.leftMeta &&
          app.columnSelections.leftColumn &&
          app.columnSelections.leftMeta.tableIndex !==
            app.columnSelections.leftColumn.tableIndex
        ) {
          return (
            <p className="warn">
              The source column and source meta column must be in the same table
              to proceed.
            </p>
          );
        }

        if (
          app.columnSelections.rightMeta &&
          app.columnSelections.rightColumn &&
          app.columnSelections.rightMeta.tableIndex !==
            app.columnSelections.rightColumn.tableIndex
        ) {
          return (
            <p className="warn">
              The match column and match meta column must be in the same table
              to proceed.
            </p>
          );
        }

        // Ensure both joins are specified
        if (
          (app.columnSelections.leftJoin && !app.columnSelections.rightJoin) ||
          (!app.columnSelections.leftJoin && app.columnSelections.rightJoin)
        ) {
          return (
            <p className="warn">
              You must select both join columns or neither to proceed.
            </p>
          );
        }

        // Check if we can proceed
        if (
          app.columnSelections.leftColumn &&
          app.columnSelections.rightColumn
        ) {
          if (
            app.columnSelections.leftColumn.tableIndex ===
              app.columnSelections.rightColumn.tableIndex &&
            app.columnSelections.leftColumn.column ===
              app.columnSelections.rightColumn.column
          ) {
            return (
              <p className="warn">
                The source and match columns must be different to proceed.
              </p>
            );
          }
          return (
            <div className="button-section extra-top">
              <Button
                onClick={() =>
                  reducer({
                    type: "StartProcessing",
                  })
                }
                icon={{
                  url: continueIcon,
                  alt: "Continue",
                }}
              >
                Continue
              </Button>
            </div>
          );
        }
      })()}
      <table className={app.setColumnSelection != null ? "hoverable" : ""}>
        <thead>
          <tr>
            {table.headers.map((header, i) => (
              <th
                key={i}
                className={app.hoverColumn === i ? "hover" : ""}
                onMouseEnter={() =>
                  reducer({
                    type: "HoverColumn",
                    index: i,
                  })
                }
                onMouseLeave={() =>
                  reducer({
                    type: "HoverColumn",
                    index: null,
                  })
                }
                onClick={() =>
                  reducer({
                    type: "SelectColumnForSelection",
                    index: i,
                  })
                }
              >
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {table.rows.slice(0, 10).map((row, rowIndex) => (
            <tr key={rowIndex}>
              {table.headers.map((header, i) => (
                <td
                  key={i}
                  className={app.hoverColumn === i ? "hover" : ""}
                  onMouseEnter={() =>
                    reducer({
                      type: "HoverColumn",
                      index: i,
                    })
                  }
                  onMouseLeave={() =>
                    reducer({
                      type: "HoverColumn",
                      index: null,
                    })
                  }
                  onClick={() =>
                    reducer({
                      type: "SelectColumnForSelection",
                      index: i,
                    })
                  }
                >
                  {row[header]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <ColumnSelectButton type="leftColumn" />
      <ColumnSelectButton type="rightColumn" />
      <p className="button-category-label">Joins (optional):</p>
      <ColumnSelectButton type="leftJoin" />
      <ColumnSelectButton type="rightJoin" />
      <p className="button-category-label">Metadata (optional):</p>
      <ColumnSelectButton type="leftMeta" />
      <ColumnSelectButton type="rightMeta" />

      <div className="button-section extra-top">
        <ResetButton slim={true} app={app} reducer={reducer} />
      </div>
    </>
  );
}

function Body({
  usePresent,
  useUndoRedo,
}: {
  usePresent: () => [State, Dispatch<Action>];
  useUndoRedo: () => [undo: UndoRedo, redo: UndoRedo];
}) {
  const [app, reducer] = usePresent();

  return (
    <div className="App">
      {app.type !== "MatchingState" && (
        <>
          <Header />

          <Instructions app={app} reducer={reducer} />

          <FileUploader app={app} reducer={reducer} />

          {app.type === "TablesAddedState" &&
          app.tables.length > 0 &&
          app.selectedTable < app.tables.length ? (
            <PreviewTable
              table={app.tables[app.selectedTable]}
              app={app}
              hoverColumn={app.hoverColumn}
              reducer={reducer}
            />
          ) : null}

          {app.type === "ProcessingState" && (
            <Matcher app={app} reducer={reducer} />
          )}
        </>
      )}

      {app.type === "MatchingState" && (
        <MatchingTable app={app} reducer={reducer} useUndoRedo={useUndoRedo} />
      )}
    </div>
  );
}

function App() {
  const { UndoRedoProvider, usePresent, useUndoRedo } = useAppReducer();

  const [initialState, setInitialState] = useState<State | null>(null);

  useEffect(() => {
    localforage.getItem<[number, State]>(LOCAL_STORAGE_KEY).then((value) => {
      if (value == null) {
        setInitialState(defaultState);
      } else if (value[0] !== VERSION) {
        setInitialState(defaultState);
      } else if (value[1].type !== "MatchingState") {
        setInitialState(defaultState);
      } else {
        // Deserialize state!
        setInitialState(value[1]);
      }
    });
  }, []);

  return initialState != null ? (
    <UndoRedoProvider initialState={initialState}>
      <Body usePresent={usePresent} useUndoRedo={useUndoRedo} />
    </UndoRedoProvider>
  ) : null;
}

export default App;
