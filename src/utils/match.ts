import { distance as fastestLevenshtein } from "fastest-levenshtein";

const NUMBER_RE = /^[0-9]+$/;

function extractParts(s: string): string[] {
  // Split on non alpha non numeric
  return s.split(/[^a-zA-Z0-9]+/).filter((x) => x !== "");
}

function dedupeParts(parts: string[]): string[] {
  const dict: { [key: string]: boolean } = {};
  const newParts: string[] = [];
  for (const part of parts) {
    if (dict[part]) continue;
    dict[part] = true;
    newParts.push(part);
  }
  return newParts;
}

function concatenateParts(parts: string[]): string {
  return parts.join("-");
}

function perfectMatch(s1: string, s2: string): boolean {
  if (NUMBER_RE.test(s1) && NUMBER_RE.test(s2))
    return parseFloat(s1) === parseFloat(s2);
  return s1 === s2;
}

function allPartsMinEditDistance(parts1: string[], parts2: string[]): number {
  const concatenate2 = concatenateParts(parts2);

  for (let i = 0; i < parts1.length - 1; i++) {
    const newParts1 = parts1.slice();

    // Find the ideal placement of things in position {i}
    let minScore = Infinity;
    let minIndex: number;
    for (let j = i + 1; j < parts1.length; j++) {
      newParts1[i] = parts1[j];
      newParts1[j] = parts1[i];

      // Concatenate parts 1 and 2
      const editDistance = fastestLevenshtein(
        concatenateParts(newParts1),
        concatenate2
      );
      if (editDistance < minScore) {
        minScore = editDistance;
        minIndex = j;
      }
    }

    // Make the switch permanent
    const tmp = parts1[i];
    parts1[i] = parts1[minIndex!];
    parts1[minIndex!] = tmp;
  }
  return fastestLevenshtein(concatenateParts(parts1), concatenate2);
}

function calculateEditDistanceInfo(parts1: string[], parts2: string[]) {
  const toRemove1: boolean[] = parts1.map(() => false);
  const toRemove2: boolean[] = parts2.map(() => false);

  let perfectMatches = 0;
  for (let i = 0; i < parts1.length; i++) {
    for (let j = 0; j < parts2.length; j++) {
      if (perfectMatch(parts1[i], parts2[j])) {
        toRemove1[i] = true;
        toRemove2[j] = true;
        perfectMatches += Math.max(parts1[i].length, parts2[j].length);
      }
    }
  }

  const newParts1: string[] = [];
  const newParts2: string[] = [];

  for (let i = 0; i < parts1.length; i++) {
    if (!toRemove1[i]) newParts1.push(parts1[i]);
  }
  for (let i = 0; i < parts2.length; i++) {
    if (!toRemove2[i]) newParts2.push(parts2[i]);
  }

  const minEditDistance = Math.min(
    allPartsMinEditDistance(newParts1, newParts2),
    allPartsMinEditDistance(newParts2, newParts1)
  );

  return [perfectMatches, minEditDistance];
}

export function newEditDistance(s1: string, s2: string): number {
  const [perfectMatches, minEditDistance] = calculateEditDistanceInfo(
    dedupeParts(extractParts(s1)),
    dedupeParts(extractParts(s2))
  );

  return -perfectMatches * 2 + minEditDistance;
}