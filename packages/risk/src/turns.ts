/**
 * One connection (a transaction's) runs one query at a time. pg queues the queries handed to a
 * busy client, but that is deprecated and goes away in pg 9, so reads that share a connection
 * take turns here instead — while the work that leaves the database still runs alongside them.
 */
export type Turns = <T>(query: () => PromiseLike<T>) => Promise<T>;

/** Each query starts once the previous one settled (a failed one doesn't stop the next). */
export function takeTurns(): Turns {
  let last: Promise<unknown> = Promise.resolve();
  return (query) => {
    const next = last.then(() => query());
    last = next.catch(() => undefined);
    return next;
  };
}

/** For a pool, where every query gets a connection of its own. */
export const noTurns: Turns = async (query) => query();
