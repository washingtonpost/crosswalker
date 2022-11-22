import { AppReducer, MatchingState } from "../state";

export function Loader({
  reducer,
  children,
}: AppReducer & { children?: React.ReactNode }) {
  return (
    <>
      {/* Load state */}
      <input
        type="file"
        id="file-load-button-upload"
        className="hidden"
        onInput={(e) =>
          (async () => {
            let loaded = false;
            const target = e.target as HTMLInputElement;
            const files = Array.from(target.files || []);

            if (files.length === 1) {
              const rawContents = await files[0].text();
              const json = JSON.parse(rawContents) as MatchingState;

              if (json.type === "MatchingState") {
                reducer({
                  type: "LoadState",
                  state: json,
                });
                loaded = true;
              }
            }

            // Clear the file input
            target.value = "";

            if (!loaded) {
              alert("Improper file specified");
            }
          })()
        }
      />
      <label htmlFor="file-load-button-upload" className="button-tweak">
        {children}
      </label>
    </>
  );
}
