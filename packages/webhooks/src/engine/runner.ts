/** Runs claimed items with bounded concurrency. */

/**
 * Calls `attempt` for every item, at most `concurrency` at a time. An unexpected error is logged and
 * handed to `release` (which gives the item's lease back so it is retried when due); it never stops
 * the other items.
 */
export async function runClaimed<T>(
  items: readonly T[],
  options: { concurrency: number; label: (item: T) => string },
  attempt: (item: T) => Promise<void>,
  release: (item: T) => Promise<unknown>,
): Promise<void> {
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const item = items[next++] as T;
      await attempt(item).catch(async (error: unknown) => {
        console.error(`${options.label(item)} failed unexpectedly:`, error);
        await release(item).catch((releaseError: unknown) =>
          console.error(`${options.label(item)}: releasing the lease failed:`, releaseError),
        );
      });
    }
  };
  const workers = Math.max(1, Math.min(options.concurrency, items.length));
  await Promise.all(Array.from({ length: workers }, worker));
}
