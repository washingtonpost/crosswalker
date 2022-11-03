import { csvParse, DSVRowArray, tsvParse } from "d3-dsv";

/** A data table (CSV or JSON containing rows) */
export interface Table {
  /** The file name */
  name: string;
  /** The headers of the table */
  headers: string[];
  /** The rows of the table. Each row maps a header to the cell value */
  rows: { [header: string]: string }[];
}

/**
 * Converts between D3's table format and ours
 * @param name The file name
 * @param rows The rows as a D3 DSV array
 * @returns A table object
 */
export function rowsToTable(name: string, rows: DSVRowArray): Table {
  return {
    name,
    headers: rows.columns,
    rows: rows as { [header: string]: string }[],
  };
}

/**
 * Converts an uploaded file into a table
 * @param name The file name
 * @param arrayBuffer The array buffer containing the file contents
 * @returns A table object, or null if the table couldn't be extracted
 */
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
