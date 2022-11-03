import { Button } from "./Button";
import continueIcon from "../assets/continueIcon.svg";
import {
  AppReducer,
  ColumnSelectionType,
  TableIndex,
  TablesAddedState,
} from "../state";
import { Table } from "../utils/extractTable";
import { ResetButton } from "./ResetButton";

/** A preview table that allows user selection for table columns */
export function PreviewTable({
  table,
  app,
  reducer,
}: AppReducer & {
  /** The table to show */
  table: Table;
  /** The currently hovered column */
  hoverColumn: number | null;
  /** The application state */
  app: TablesAddedState;
}) {
  /** A column selection pill */
  const ColumnSelection = (column: TableIndex | null) => {
    if (column == null) return null;
    return (
      <span className="column-selection">
        {column.tableName}: {column.column}
      </span>
    );
  };

  /** A button to select columns */
  const ColumnSelectButton = ({ type }: { type: ColumnSelectionType }) => {
    /** Texts for before the column has been selected */
    const preTexts: { [K in ColumnSelectionType]: string } = {
      leftColumn: "Select source column",
      rightColumn: "Select match column",
      leftJoin: "Select source join",
      rightJoin: "Select match join",
      leftMeta: "Select source meta",
      rightMeta: "Select match meta",
    };
    /** Texts for after the column has been selected */
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
        // Check whether we can proceed and show a continnue button

        /** Whether two columns are equal */
        const colsEqual = (col1: TableIndex, col2: TableIndex): boolean => {
          return (
            col1.tableIndex === col2.tableIndex && col1.column === col2.column
          );
        };

        // Ensure the target and join columns differ
        if (
          app.columnSelections.leftJoin &&
          app.columnSelections.leftColumn &&
          colsEqual(
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
          colsEqual(
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
          colsEqual(
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
          colsEqual(
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

          // All checks pass; we can show a continue button to proceed to
          // auto-matching
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
      {/* The preview table */}
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
      {/* The column selection buttons */}
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
