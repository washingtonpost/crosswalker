import { AppReducer } from "../state";
import { Button } from "./Button";

export function ResetButton({
  reducer,
  slim = false,
}: AppReducer & { slim?: boolean }) {
  return (
    <Button
      slim={slim}
      type="danger"
      onClick={() =>
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
