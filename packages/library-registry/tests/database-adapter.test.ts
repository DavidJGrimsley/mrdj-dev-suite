import { describe, expect, it, vi } from "vitest";

import {
  DatabaseConflictError,
  DatabaseAdapterError,
  DatabaseUnsupportedError,
} from "../assets/mds/src/db/adapter.ts";
import { createFirebaseDatabaseAdapter } from "../assets/mds/src/db/firebase.ts";
import {
  createSupabaseDatabaseAdapter,
  type SupabaseDatabaseClient,
} from "../assets/mds/src/db/supabase.ts";

type TestSchema = {
  mds_demo_guestbook_comments: {
    id: number;
    user_id: string;
    display_name: string;
    message: string;
    created_at: string;
  };
};

type FirebaseSchema = {
  notes: {
    id: string;
    title: string;
  };
};

type BuilderState = {
  filters: Array<[string, unknown]>;
  selected?: string;
  limit?: number;
  order?: string;
};

function createBuilder<T>(resolveResult: (state: BuilderState) => { data: T; error: null } | { data: null; error: { code?: string; message: string }; count?: number }) {
  const state: BuilderState = { filters: [] };
  const builder = {
    select(columns: string) {
      state.selected = columns;
      return builder;
    },
    eq(column: string, value: unknown) {
      state.filters.push([column, value]);
      return builder;
    },
    limit(count: number) {
      state.limit = count;
      return builder;
    },
    order(column: string) {
      state.order = column;
      return builder;
    },
    maybeSingle() {
      const result = resolveResult(state);
      return Promise.resolve({
        ...result,
        data: Array.isArray(result.data) ? (result.data[0] ?? null) : result.data,
      });
    },
    then<TResult1 = { data: T; error: null }, TResult2 = never>(
      onfulfilled?: ((value: { data: T; error: null } | { data: null; error: { code?: string; message: string }; count?: number }) => TResult1 | PromiseLike<TResult1>) | null,
      onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
    ) {
      return Promise.resolve(resolveResult(state)).then(onfulfilled, onrejected);
    },
  };
  return builder;
}

function createMockClient() {
  const rows: TestSchema["mds_demo_guestbook_comments"][] = [
    {
      id: 1,
      user_id: "user-1",
      display_name: "DJ",
      message: "Hello",
      created_at: "2026-08-17T00:00:00.000Z",
    },
  ];
  const unsubscribe = vi.fn();
  let realtimeCallback: ((payload: Record<string, unknown>) => void) | null = null;

  const client: SupabaseDatabaseClient = {
    from(_table: string) {
      return {
        select() {
          return createBuilder(() => ({ data: rows, error: null }));
        },
        insert(values: TestSchema["mds_demo_guestbook_comments"]) {
          return createBuilder(() => {
            if (values.id === -1) {
              return {
                data: null,
                error: { code: "23505", message: "duplicate key value violates unique constraint" },
              };
            }
            rows.push(values);
            return { data: [values], error: null, count: 1 };
          });
        },
      };
    },
    channel() {
      return {
        on(_type, _filter, callback) {
          realtimeCallback = callback;
          return this;
        },
        subscribe() {
          return { unsubscribe };
        },
      };
    },
  };

  return { client, rows, unsubscribe, emit: (payload: Record<string, unknown>) => realtimeCallback?.(payload) };
}

describe("database adapter contract assets", () => {
  it("queries and mutates through the Supabase structural adapter", async () => {
    const { client } = createMockClient();
    const adapter = createSupabaseDatabaseAdapter<TestSchema>(() => client);

    const rows = await adapter.query({ table: "mds_demo_guestbook_comments", filters: [{ column: "id", value: 1 }] });
    expect(rows).toHaveLength(1);
    expect(rows[0]?.message).toBe("Hello");

    const result = await adapter.mutate({
      table: "mds_demo_guestbook_comments",
      type: "insert",
      values: {
        id: 2,
        user_id: "user-2",
        display_name: "Reader",
        message: "Hi",
        created_at: "2026-08-17T00:00:01.000Z",
      },
    });

    expect(result.count).toBe(1);
    expect(result.rows[0]?.id).toBe(2);
  });

  it("maps provider errors and supports the transaction callback fallback", async () => {
    const { client } = createMockClient();
    const adapter = createSupabaseDatabaseAdapter<TestSchema>(() => client);

    await expect(
      adapter.mutate({
        table: "mds_demo_guestbook_comments",
        type: "insert",
        values: {
          id: -1,
          user_id: "user-1",
          display_name: "DJ",
          message: "Again",
          created_at: "2026-08-17T00:00:00.000Z",
        },
      }),
    ).rejects.toBeInstanceOf(DatabaseConflictError);

    await expect(
      createSupabaseDatabaseAdapter<TestSchema>(() => client, {
        transactionMode: "unsupported",
      }).transaction(async () => "nope"),
    ).rejects.toBeInstanceOf(DatabaseUnsupportedError);

    await expect(adapter.transaction(async (db) => (await db.query({ table: "mds_demo_guestbook_comments" })).length)).resolves.toBe(1);
  });

  it("subscribes to realtime changes and returns a cleanup callback", () => {
    const { client, unsubscribe, emit } = createMockClient();
    const adapter = createSupabaseDatabaseAdapter<TestSchema>(() => client);
    const events: unknown[] = [];

    const cleanup = adapter.subscribe({ table: "mds_demo_guestbook_comments" }, (event) => {
      events.push(event);
    });

    emit({
      eventType: "INSERT",
      new: {
        id: 3,
        user_id: "user-3",
        display_name: "Sub",
        message: "scribed",
        created_at: "2026-08-17T00:00:02.000Z",
      },
    });
    cleanup();

    expect(events).toEqual([
      expect.objectContaining({
        type: "insert",
        table: "mds_demo_guestbook_comments",
        row: expect.objectContaining({ id: 3 }),
      }),
    ]);
    expect(unsubscribe).toHaveBeenCalledTimes(1);
  });

  it("keeps the Firebase skeleton contract honest about unsupported capabilities", async () => {
    const adapter = createFirebaseDatabaseAdapter<FirebaseSchema>(() => ({}));

    expect(adapter.capabilities).toEqual({
      transactions: false,
      subscriptions: false,
      rls: false,
      authIntegration: false,
    });

    await expect(adapter.query({ table: "notes" })).rejects.toBeInstanceOf(DatabaseUnsupportedError);
    await expect(adapter.mutate({ table: "notes", type: "delete" })).rejects.toBeInstanceOf(
      DatabaseUnsupportedError,
    );
    await expect(adapter.transaction(async () => "done")).rejects.toBeInstanceOf(
      DatabaseUnsupportedError,
    );

    const onError = vi.fn((error: DatabaseAdapterError) => error);
    const cleanup = adapter.subscribe({ table: "notes" }, () => {}, onError);
    cleanup();

    expect(onError).toHaveBeenCalledWith(expect.any(DatabaseUnsupportedError));
  });
});
