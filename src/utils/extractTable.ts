import { csvParse, DSVRowArray, tsvParse } from "d3-dsv";

export interface Table {
  name: string;
  headers: string[];
  rows: { [header: string]: string }[];
}

export function rowsToTable(name: string, rows: DSVRowArray): Table {
  return {
    name,
    headers: rows.columns,
    rows: rows as { [header: string]: string }[],
  };
}

export function fileToTable(
  name: string,
  arrayBuffer: ArrayBuffer
): Table | null {
  const extension = name.split(".").slice(-1)[0].toLowerCase();
  const contents = new TextDecoder("utf-8").decode(arrayBuffer);

  if (extension === "csv") {
    // Parse csv
    return rowsToTable(name, csvParse(contents));
  } else if (extension === "tsv") {
    // Parse tsv
    return rowsToTable(name, tsvParse(contents));
  } else if (extension === "json") {
    const rows = JSON.parse(contents);
    if (Array.isArray(rows) && rows.length > 0) {
      const columns = Object.keys(rows[0]);
      return {
        name: name,
        headers: columns,
        rows: rows.slice(1),
      };
    }
  }

  // No table identified
  return null;
}
