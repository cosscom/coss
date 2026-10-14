/** "Acme Inc" → "AI", "jane@example.com" → "J": for avatar tiles. */
export function initials(name: string): string {
  const words = name
    .trim()
    .split(/[\s@._-]+/)
    .filter(Boolean);
  const letters = words.length > 1 ? [words[0], words[1]] : [words[0]];
  return (
    letters
      .map((word) => word?.[0] ?? "")
      .join("")
      .toUpperCase() || "?"
  );
}
