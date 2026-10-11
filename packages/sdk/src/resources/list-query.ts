/** One query parameter: lists are comma-joined (an empty one is left out), dates ISO 8601. */
function joined(value: unknown): string | undefined {
  if (value === undefined) return undefined;
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.length === 0 ? undefined : value.join(",");
  return String(value);
}

/** The query string of a list method whose filters accept arrays and dates. */
export function listQuery(params: object): Record<string, string | undefined> {
  const query: Record<string, string | undefined> = {};
  for (const [name, value] of Object.entries(params)) query[name] = joined(value);
  return query;
}
