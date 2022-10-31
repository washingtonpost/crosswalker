// import React from 'react';
import logo from "./assets/logo.svg";
import uploadIcon from "./assets/uploadIcon.svg";
import fileIcon from "./assets/fileIcon.svg";
import closeIcon from "./assets/closeIcon.svg";
import continueIcon from "./assets/continueIcon.svg";
import "./App.css";
import "@glideapps/glide-data-grid/dist/index.css";

import { Button } from "./components/Button";
import {
  AppReducer,
  ColumnSelectionType,
  TableIndex,
  TablesAddedState,
  useAppReducer,
} from "./state";
import { Table } from "./utils/extractTable";
import { Matcher } from "./components/Matcher";
import { MatchingTable } from "./components/MatchingTable";

function Header() {
  return (
    <header className="App-header">
      <h1>
        <img src={logo} className="App-logo" alt="logo" />
        <span>Crosswalker</span>
      </h1>
    </header>
  );
}

function Instructions({ app }: AppReducer) {
  return app.type === "WelcomeState" ? (
    <p>Welcome! Upload CSV and JSON files to get started.</p>
  ) : app.type === "TablesAddedState" ? (
    <p>
      Select columns corresponding to the data by clicking in the tables below.
    </p>
  ) : app.type === "ProcessingState" ? (
    <p>Auto-matching precincts...</p>
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
        {app.tables[column.table].name}: {column.column}
      </span>
    );
  };

  const ColumnSelectButton = ({ type }: { type: ColumnSelectionType }) => {
    const preTexts: { [K in ColumnSelectionType]: string } = {
      leftColumn: "Click to select left column",
      leftJoin: "Click to select left join column (optional)",
      rightColumn: "Click to select right column",
      rightJoin: "Click to select right join column (optional)",
    };
    const postTexts: { [K in ColumnSelectionType]: string } = {
      leftColumn: "Left column",
      leftJoin: "Left join column",
      rightColumn: "Right column",
      rightJoin: "Right join column",
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
              <img src={closeIcon} alt="Remove" />
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
      <ColumnSelectButton type="leftJoin" />
      <ColumnSelectButton type="rightJoin" />
      {(() => {
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

        if (
          app.columnSelections.leftColumn &&
          app.columnSelections.rightColumn
        ) {
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
    </>
  );
}

function App() {
  const [app, reducer] = useAppReducer();

  return (
    <div className="App">
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

      {app.type === "MatchingState" && (
        <MatchingTable app={app} reducer={reducer} />
      )}
    </div>
  );
}

export default App;
