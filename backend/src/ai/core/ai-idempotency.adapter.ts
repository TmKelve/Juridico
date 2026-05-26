type IdempotencyRecord<T> = {
  payloadHash: string;
  response: T;
};

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(',')}]`;
  }
  if (value && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, nested]) => `${JSON.stringify(key)}:${stableStringify(nested)}`);
    return `{${entries.join(',')}}`;
  }
  return JSON.stringify(value);
}

export class InMemoryAiIdempotencyAdapter<T> {
  private readonly store = new Map<string, IdempotencyRecord<T>>();

  async run(key: string | null | undefined, payload: unknown, execute: () => Promise<T>) {
    if (!key) {
      return {
        mode: 'created' as const,
        data: await execute(),
      };
    }

    const payloadHash = stableStringify(payload);
    const existing = this.store.get(key);
    if (existing) {
      if (existing.payloadHash !== payloadHash) {
        throw new Error('IDEMPOTENCY_CONFLICT');
      }
      return {
        mode: 'replayed' as const,
        data: existing.response,
      };
    }

    const response = await execute();
    this.store.set(key, { payloadHash, response });
    return {
      mode: 'created' as const,
      data: response,
    };
  }
}
