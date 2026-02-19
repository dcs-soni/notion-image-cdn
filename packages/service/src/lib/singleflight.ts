// Singleflight - Request Coalescing

export interface FlightResult<T> {
  value: T; // The resolved value from the leader request
  coalesced: boolean; // Whether this caller was a "follower" (joined an existing flight)
}

// If two callers invoke `gate.do('cache-key-123', ...)` concurrently,
// only the first caller's `fn` executes. The second caller awaits the same promise and receives the same result.

// The shared promise NEVER rejects. Errors are wrapped in a settled
// result so followers receive a resolved promise containing the error
// as a value, preventing a thundering herd of catch handlers.

type FlightSettled<T> = { ok: true; value: T } | { ok: false; error: unknown };

export class Singleflight<T> {
  // Stores promises that ALWAYS resolve
  private readonly flights = new Map<string, Promise<FlightSettled<T>>>();

  async do(key: string, fn: () => Promise<T>): Promise<FlightResult<T>> {
    const existing = this.flights.get(key);
    if (existing) {
      // Follower: await a promise that always resolves
      const settled = await existing;
      if (!settled.ok) throw settled.error; // Re-throw one-at-a-time
      return { value: settled.value, coalesced: true };
    }

    // Leader: wrap fn() so the shared promise never rejects
    const safePromise = fn().then(
      (value): FlightSettled<T> => ({ ok: true, value }),
      (error): FlightSettled<T> => ({ ok: false, error }),
    );
    this.flights.set(key, safePromise);

    try {
      const settled = await safePromise;
      if (!settled.ok) throw settled.error;
      return { value: settled.value, coalesced: false };
    } finally {
      this.flights.delete(key);
    }
  }

  // Number of currently active in-flight operations. Useful for metrics.
  get activeFlights(): number {
    return this.flights.size;
  }
}
