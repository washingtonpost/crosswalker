import "./App.css";
import "@glideapps/glide-data-grid/dist/index.css";

import {
  Action,
  defaultState,
  LOCAL_STORAGE_KEY,
  MatchingState,
  State,
  UndoRedo,
  useAppReducer,
  VERSION,
} from "./state";
import { Matcher } from "./components/Matcher";
import { MatchingTable } from "./components/MatchingTable";
import { Dispatch, useEffect, useState } from "react";
import localforage from "localforage";
import { Header } from "./components/Header";
import { FileUploader } from "./components/FileUploader";
import { Instructions } from "./components/Instructions";
import { PreviewTable } from "./components/PreviewTable";
import { Footer } from "./components/Footer";
import { Loader } from "./components/Loader";
import { Button } from "./components/Button";
import DemoJson from "./assets/demo.json";

/** The primary application after initialization (checking local storage) */
function Body({
  usePresent,
  useUndoRedo,
}: {
  /** The use present hook from undo/redo is just the present state */
  usePresent: () => [State, Dispatch<Action>];
  /** The undo/redo contexts */
  useUndoRedo: () => [undo: UndoRedo, redo: UndoRedo];
}) {
  const [app, reducer] = usePresent();

  return (
    <div className="App">
      {app.type !== "MatchingState" && (
        <>
          {/* Everything before matching state is a similar template */}
          <Header />

          <div className="main">
            <Instructions app={app} reducer={reducer} />

            {app.type === "WelcomeState" && (
              <Button
                onClick={() => {
                  reducer({
                    type: "LoadState",
                    state: DemoJson as MatchingState,
                  });
                }}
              >
                Demo
              </Button>
            )}

            <FileUploader app={app} reducer={reducer} />

            {app.type === "WelcomeState" && (
              <>
                <p>
                  Alternatively, you can{" "}
                  <Loader app={app} reducer={reducer}>
                    <span className="inline-button">
                      load a previous save state
                    </span>
                  </Loader>
                  .
                </p>
              </>
            )}

            {app.type === "TablesAddedState" &&
            app.tables.length > 0 &&
            app.selectedTable < app.tables.length ? (
              // Show preview table in tables added state
              <PreviewTable
                table={app.tables[app.selectedTable]}
                app={app}
                hoverColumn={app.hoverColumn}
                reducer={reducer}
              />
            ) : null}

            {app.type === "ProcessingState" && (
              // Run matcher in processing state
              <Matcher app={app} reducer={reducer} />
            )}
          </div>
        </>
      )}

      {app.type === "MatchingState" && (
        // Show matching table in matching state
        <MatchingTable app={app} reducer={reducer} useUndoRedo={useUndoRedo} />
      )}

      <Footer app={app} reducer={reducer} />
    </div>
  );
}

/** The primary application */
export default function App() {
  const { UndoRedoProvider, usePresent, useUndoRedo } = useAppReducer();

  const [initialState, setInitialState] = useState<State | null>(null);

  useEffect(() => {
    // Check local forage for a matching state
    localforage.getItem<[number, State]>(LOCAL_STORAGE_KEY).then((value) => {
      if (value == null) {
        setInitialState(defaultState);
      } else if (value[0] !== VERSION) {
        // Ensure the versions are compatible
        setInitialState(defaultState);
      } else if (value[1].type !== "MatchingState") {
        // Ensure that only matching states are loaded
        setInitialState(defaultState);
      } else {
        // Load the application at the remembered state from local storage!
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
