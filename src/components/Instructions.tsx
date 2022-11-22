import { AppReducer } from "../state";
import { INSTRUCTIONS_URL, SELECT_INSTRUCTIONS_URL } from "../urls";

/** Show a paragraph of user instructions */
export function Instructions({ app }: AppReducer) {
  return app.type === "WelcomeState" ? (
    <>
      <p>
        Welcome! Crosswalker is a general purpose tool for joining columns of
        text data that don&rsquo;t match perfectly. Crosswalker runs entirely
        locally and auto-saves your progress.
      </p>
      <p>
        Check out the demo or upload one or more CSV/JSON files to get started.{" "}
        <a href={INSTRUCTIONS_URL} target="_blank" rel="noreferrer">
          Click here
        </a>{" "}
        to learn more.
      </p>
    </>
  ) : app.type === "TablesAddedState" ? (
    <p>
      Select columns corresponding to the data by clicking in the tables below.
      Click here to{" "}
      <a href={SELECT_INSTRUCTIONS_URL} target="_blank" rel="noreferrer">
        learn more
      </a>{" "}
      about this step.
    </p>
  ) : app.type === "ProcessingState" ? (
    <p>Auto-crosswalking...</p>
  ) : null;
}
