import { AppReducer } from "../state";

/** Show a paragraph of user instructions */
export function Instructions({ app }: AppReducer) {
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
