/**
 * The core matching/ranking algorithm
 */

import { distance as fastestLevenshtein } from "fastest-levenshtein";
import { MatchRow } from "../state";
import { joinNorm } from "./helpers";

const NUMBER_RE = /^[0-9]+$/;

/**
 * A new kind of edit distance. Strings are split into parts. Perfect matches
 * are identified. Permutations of remaining parts are joined and the minimum
 * edit distance of those parts is calculated. Final score is minimum edit
 * distance minus twice the number of perfectly matched characters.
 * @param s1 The first string
 * @param s2 The second string
 * @returns A score, where lower is better, to identify how strongly the strings
 * match
 */
export function newEditDistance(s1: string, s2: string): number {
  // Calculate the info needed to calculate a final ranking score
  const [perfectMatches, minEditDistance] = calculateEditDistanceInfo(
    extractParts(joinNorm(s1)),
    extractParts(joinNorm(s2))
  );

  // Perfect match characters are weighted twice as powerful in identifying
  // positive matches
  return -perfectMatches * 2 + minEditDistance;
}

/**
 * Calculates information used to rank how closely two string parts relate.
 * First, perfectly matching parts are removed and noted. Finally, the edit
 * distance is calculated on permutations of the remaining parts, and the min
 * distance is returned. The function returns a tuple
 * [numPerfectMatchesFromFirstStep, minEditDistanceFromSecondStep]
 * @param parts1 The string parts of the first string
 * @param parts2 The string parts of the second string
 * @returns Information used to calculate the final ranking score
 */
function calculateEditDistanceInfo(parts1: string[], parts2: string[]) {
  // Identify perfect match indices to remove in a second pass
  const toRemove1: boolean[] = parts1.map(() => false);
  const toRemove2: boolean[] = parts2.map(() => false);

  let perfectMatches = 0;
  for (let i = 0; i < parts1.length; i++) {
    for (let j = 0; j < parts2.length; j++) {
      // Check all pairwise combos of parts for matches
      if (perfectMatch(parts1[i], parts2[j])) {
        toRemove1[i] = true;
        toRemove2[j] = true;
        // Note the number of characters perfectly matched
        perfectMatches += Math.max(parts1[i].length, parts2[j].length);
      }
    }
  }

  // Remove the parts in a non-destructive fashion
  const newParts1: string[] = [];
  const newParts2: string[] = [];

  for (let i = 0; i < parts1.length; i++) {
    if (!toRemove1[i]) newParts1.push(parts1[i]);
  }
  for (let i = 0; i < parts2.length; i++) {
    if (!toRemove2[i]) newParts2.push(parts2[i]);
  }

  // Calculate min edit distance of various permutations
  const minEditDistance = Math.min(
    // Using both parts as reference
    allPartsMinEditDistance(newParts1, newParts2),
    allPartsMinEditDistance(newParts2, newParts1)
  );

  // Return the final score info
  return [perfectMatches, minEditDistance];
}

/**
 * Identifies a minimum edit distance score for various permutations of
 * different string parts. Calculating all possible permutations is too
 * expensive for strings with many parts, so instead an insertion sort-like
 * algorithm is applied, checking the first part for the optimal placement (by
 * minimizing the edit distance of the joined parts of both strings), then
 * putting it in place, checking the second part for the optimal placement, etc.
 *
 * This score will be a local minimum edit distance but it's fast and good
 * enough (as verified by testing lots of different ground truth crosswalks).
 * @param parts1 The string parts of the first string
 * @param parts2 The string parts of the second string
 * @returns The minimum edit distance of permutations of the parts
 */
function allPartsMinEditDistance(parts1: string[], parts2: string[]): number {
  const concatenate2 = concatenateParts(parts2);

  // Go through each part and insert it into the best position
  for (let i = 0; i < parts1.length - 1; i++) {
    const newParts1 = parts1.slice();

    // Find the ideal placement of things in position `i`
    let minScore = Infinity;
    let minIndex: number;
    for (let j = i + 1; j < parts1.length; j++) {
      newParts1[i] = parts1[j];
      newParts1[j] = parts1[i];

      // Concatenate parts 1 and 2 and calculate the edit distance
      const editDistance = fastestLevenshtein(
        concatenateParts(newParts1),
        concatenate2
      );
      if (editDistance < minScore) {
        // Store the min edit distance and index
        minScore = editDistance;
        minIndex = j;
      }
    }

    // Make the switch permanent for the best placement of the part
    // in position `i`
    const tmp = parts1[i];
    parts1[i] = parts1[minIndex!];
    parts1[minIndex!] = tmp;
  }
  // The returned score is the edit distance of the final, sorted parts
  return fastestLevenshtein(concatenateParts(parts1), concatenate2);
}

/**
 * Extracts alphanumeric parts from a string
 * @param s The string to extract parts from
 * @returns A string array containing the alphanumeric parts of the input string
 */
export function extractParts(s: string): string[] {
  // Split on non alpha non numeric
  return s.split(/[^a-zA-Z0-9]+/).filter((x) => x !== "");
}

/**
 * Concatenates parts back into a normalized string
 * @param parts The parts to join
 * @returns String parts joined by '-'
 */
function concatenateParts(parts: string[]): string {
  return parts.join("-");
}

/**
 * Checks for perfect part equality between two strings. Numbers are parsed to
 * account for leading zeros.
 * @param s1
 * @param s2
 * @returns Whether the two string parts are perfect matches
 */
function perfectMatch(s1: string, s2: string): boolean {
  if (NUMBER_RE.test(s1) && NUMBER_RE.test(s2))
    return parseFloat(s1) === parseFloat(s2);
  return s1 === s2;
}

/**
 * Checks whether two strings match in terms of their alphanumeric parts,
 * e.g. partsMatch("east_ATLANTA", " East Atlanta") === true
 * @param s1
 * @param s2
 * @returns Whether all the alphanumeric parts of s1 and s2 match
 * (case-insensitive)
 */
export function partsMatch(s1: string, s2: string): boolean {
  const parts1 = extractParts(joinNorm(s1));
  const parts2 = extractParts(joinNorm(s2));
  if (parts1.length !== parts2.length) return false;
  for (let i = 0; i < parts1.length; i++) {
    if (parts1[i] !== parts2[i]) return false;
  }
  return true;
}

/**
 * Automatches a list of match rows, by seeing if the parts match of the
 * top-ranked predictions for each row
 * @param results Match rows to automatch where possible
 * @returns A mapping of user match indices
 */
export function automatchResults(results: MatchRow[]): {
  [index: string]: boolean;
} {
  const output: {
    [index: string]: boolean;
  } = {};
  // Go through each row
  for (let i = 0; i < results.length; i++) {
    const result = results[i];
    if (
      result.rankedMatches.length > 0 &&
      partsMatch(result.value, result.rankedMatches[0].value)
    ) {
      // Set the user match if the top prediction (P1) matches all the
      // parts of the row value
      output[`0,${i}`] = true;
    }
  }
  return output;
}

/**
 * Automatches all the initial match rows by checking top predictions for
 * part-based matches
 * @param fullResults The full listing of join values and result rows
 * @returns Automatched user results for each join value
 */
export function automatchFullResults(fullResults: [string, MatchRow[]][]): {
  [join: string]: {
    [index: string]: boolean;
  };
} {
  return Object.fromEntries(
    fullResults.map<
      [
        string,
        {
          [index: string]: boolean;
        }
      ]
    >((results) => [results[0], automatchResults(results[1])])
  );
}
