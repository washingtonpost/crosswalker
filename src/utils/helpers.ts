import { Match, MatchRow } from "../state";

/**
 * Removes non-unique values from an array
 * @param array An array
 * @returns The array with only unique values
 */
export function uniq<T>(array: T[]): T[] {
  const results: T[] = [];
  for (const value of array) {
    if (results.includes(value)) continue;
    results.push(value);
  }
  return results;
}

/**
 * Normalizes a string for the sake of data joining
 * @param s The string
 * @returns A normalized version of the string
 */
export function joinNorm(s: string): string {
  return s.toLowerCase().trim();
}

/**
 * A way to filter one list of values by another
 * @param joins A list of values
 * @param joiner A value
 * @param values Another list of values of the same length as {@link joins}
 * @returns Values from {@link values} filtered to only show rows where {@link joins} equals {@link joiner}
 */
export function filterByValue<T>(
  joins: string[],
  joiner: string,
  values: T[]
): T[] {
  const results: T[] = [];
  for (let i = 0; i < joins.length; i++) {
    // Use the normalized join comparison
    if (joinNorm(joins[i]) === joinNorm(joiner)) {
      results.push(values[i]);
    }
  }
  return results;
}

/**
 * Zips two arrays together
 * @param left The left array
 * @param right The right array
 * @returns A combined array of both zipped together
 */
export function zip<T, U>(left: T[], right: U[]): [T, U][] {
  const results: [T, U][] = [];
  for (let i = 0; i < left.length; i++) {
    results.push([left[i], right[i]]);
  }
  return results;
}

export class FilteredMatchRows {
  readonly cache: { [row: number]: MatchRow } = {};

  constructor(
    readonly matches: MatchRow[],
    readonly filter: (match: Match) => boolean,
    readonly sort: (a: Match, b: Match) => number = () => 0,
    readonly rowFilter: (matchRow: MatchRow) => boolean = () => true
  ) {
    this.matches = matches.filter(this.rowFilter);
  }

  get numRows(): number {
    return this.matches.length;
  }

  getRow(row: number): MatchRow {
    // Pull from cache if possible
    const cached = this.cache[row];
    if (cached != null) return cached;

    // Calculate filtered row
    const oldRow = this.matches[row];
    const newRow: MatchRow = {
      ...oldRow,
      rankedMatches: oldRow.rankedMatches.filter(this.filter).sort(this.sort),
    };

    // Update cache
    this.cache[row] = newRow;

    // Return filetered row
    return newRow;
  }
}
