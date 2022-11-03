import { AppReducer } from "../state";
import { Button } from "./Button";

/** A "New" button to reset the app state */
export function ResetButton({
  reducer,
  slim = false,
}: AppReducer & { slim?: boolean }) {
  return (
    <Button
      slim={slim}
      type="danger"
      onClick={() =>
        // Show a confirm prompt before doing anything drastic
        prompt('This will clear all your data. Type "reset" to proceed:') ===
          "reset" &&
        reducer({
          type: "Reset",
        })
      }
    >
      New
    </Button>
  );
}
