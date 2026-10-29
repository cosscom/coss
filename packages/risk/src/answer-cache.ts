/** A small LRU of paid providers' answers (failures are never cached). */
export class AnswerCache<T> {
  readonly #entries = new Map<string, { value: T; expiresAt: number }>();
  constructor(
    private readonly maxEntries: number,
    private readonly ttlMs: number,
  ) {}

  get(key: string, now: number): { value: T } | undefined {
    const entry = this.#entries.get(key);
    if (!entry) return undefined;
    this.#entries.delete(key);
    if (entry.expiresAt <= now) return undefined;
    this.#entries.set(key, entry);
    return { value: entry.value };
  }

  set(key: string, value: T, now: number): void {
    this.#entries.delete(key);
    this.#entries.set(key, { value, expiresAt: now + this.ttlMs });
    while (this.#entries.size > this.maxEntries) {
      const oldest = this.#entries.keys().next().value;
      if (oldest === undefined) break;
      this.#entries.delete(oldest);
    }
  }
}
