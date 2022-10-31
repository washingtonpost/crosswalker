import { AppReducer, MatchingState } from "../state";
import DataEditor, {
  GridCellKind,
  GridColumn,
} from "@glideapps/glide-data-grid";

export function MatchingTable({
  app,
  reducer,
}: AppReducer & { app: MatchingState }) {
  if (app.matches.length === 0) return null;
  const numColumns = app.matches[0].rankedMatches.length + 1;
  const columns: GridColumn[] = [{ title: "Source", width: 200 }];
  for (let i = 0; i < numColumns; i++) {
    columns.push({ title: `Pred ${i + 1}`, width: 200 });
  }

  return (
    <DataEditor
      width={800}
      height={400}
      getCellContent={(cell) => {
        const [column, row] = cell;
        const match = app.matches[row];
        if (column === 0) {
          // console.log(row, column, match.value);
          return {
            kind: GridCellKind.Text,
            data: match.value,
            allowOverlay: false,
            displayData: match.value,
          };
        } else {
          // console.log(row, column, match.rankedMatches[column - 1].value);
          return {
            kind: GridCellKind.Text,
            data: match.rankedMatches[column - 1].value,
            allowOverlay: false,
            displayData: match.rankedMatches[column - 1].value,
          };
        }
      }}
      columns={columns}
      rows={app.matches.length}
    />
  );
}
