export function uniq<T>(array: T[]): T[] {
  const results: T[] = [];
  for (const value of array) {
    if (results.includes(value)) continue;
    results.push(value);
  }
  return results;
}

export function joinNorm(s: string): string {
  return s.toLowerCase().trim();
}

export function filterByValue<T>(
  joins: string[],
  joiner: string,
  values: T[]
): T[] {
  const results: T[] = [];
  for (let i = 0; i < joins.length; i++) {
    if (joinNorm(joins[i]) === joinNorm(joiner)) {
      results.push(values[i]);
    }
  }
  return results;
}
