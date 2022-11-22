import { AppReducer } from "../state";
import { Button } from "./Button";
import fileIcon from "../assets/fileIcon.svg";
import uploadIcon from "../assets/uploadIcon.svg";

/** A file uploader component */
export function FileUploader({ app, reducer }: AppReducer) {
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
            extraBottom={true}
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
        <label htmlFor="file-upload" className="extra-right">
          <Button
            extraBottom={true}
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
