import {
  DatabaseAdapterError,
  DatabaseConflictError,
  DatabaseNotFoundError,
  DatabaseTimeoutError,
  DatabaseUnauthorizedError,
  DatabaseUnsupportedError,
  DatabaseValidationError,
  type DatabaseAdapter,
  type DatabaseChangeEvent,
  type DatabaseChangeType,
  type DatabaseFilter,
  type DatabaseMutationInput,
  type DatabaseMutationResult,
  type DatabaseQueryInput,
  type DatabaseSchema,
  type DatabaseSubscribeInput,
  type DatabaseTableName,
  type DatabaseTableRow,
} from './adapter';

type SupabaseError = {
  code?: string;
  message?: string;
  details?: string;
  hint?: string;
};

type SupabaseResult<T> = {
  data: T | null;
  error: SupabaseError | null;
  count?: number | null;
};

type SupabaseBuilder<T = unknown> = PromiseLike<SupabaseResult<T>> & {
  [key: string]: unknown;
};

export type SupabaseDatabaseClient = {
  from(table: string): object;
  channel?(name: string): {
    on(
      type: string,
      filter: Record<string, unknown>,
      callback: (payload: Record<string, unknown>) => void,
    ): { subscribe(): unknown };
    subscribe(): unknown;
  };
  removeChannel?(channel: unknown): Promise<unknown> | unknown;
};

export type SupabaseDatabaseClientFactory = () => SupabaseDatabaseClient;

export interface SupabaseDatabaseAdapterOptions {
  version?: string;
  schema?: string;
  transactionMode?: 'callback' | 'unsupported';
}

function selectColumns(select?: string | readonly string[]): string {
  if (typeof select === 'string') {
    return select;
  }
  if (select) {
    return [...select].join(', ');
  }
  return '*';
}

function requireBuilderMethod<T extends (...args: never[]) => unknown>(
  builder: object,
  method: string,
  table: string,
): T {
  const fn = (builder as Record<string, unknown>)[method];
  if (typeof fn !== 'function') {
    throw new DatabaseUnsupportedError(`Supabase builder does not support ${method} for ${table}.`, {
      table,
    });
  }
  return fn.bind(builder) as T;
}

function applyFilters<Row extends DatabaseTableRow, Result>(
  builder: SupabaseBuilder<Result>,
  filters: readonly DatabaseFilter<Row>[] | undefined,
  table: string,
): SupabaseBuilder<Result> {
  let next = builder;
  for (const filter of filters ?? []) {
    const operator = String(filter.operator ?? 'eq');
    const method = requireBuilderMethod<(column: string, value: unknown) => SupabaseBuilder<Result>>(
      next,
      operator,
      table,
    );
    next = method(filter.column, filter.value);
  }
  return next;
}

function applyQueryOptions<Row extends DatabaseTableRow, Result>(
  builder: SupabaseBuilder<Result>,
  input: Pick<DatabaseQueryInput<DatabaseSchema, string>, 'limit' | 'orderBy'> & {
    filters?: readonly DatabaseFilter<Row>[];
  },
  table: string,
): SupabaseBuilder<Result> {
  let next = applyFilters(builder, input.filters, table);
  if (input.orderBy) {
    const order = requireBuilderMethod<
      (column: string, options?: { ascending?: boolean }) => SupabaseBuilder<Result>
    >(next, 'order', table);
    next = order(input.orderBy.column, { ascending: input.orderBy.ascending ?? true });
  }
  if (input.limit !== undefined) {
    const limit = requireBuilderMethod<(count: number) => SupabaseBuilder<Result>>(next, 'limit', table);
    next = limit(input.limit);
  }
  return next;
}

function mapSupabaseError(error: SupabaseError, table?: string): DatabaseAdapterError {
  const message = error.message ?? 'Supabase database operation failed.';
  const providerCode = error.code;
  const options = { cause: error, providerCode, table };

  if (providerCode === 'PGRST116' || /not found|no rows?/iu.test(message)) {
    return new DatabaseNotFoundError(message, options);
  }
  if (providerCode === '23505' || providerCode === '23503' || /duplicate|conflict/iu.test(message)) {
    return new DatabaseConflictError(message, options);
  }
  if (providerCode === '57014' || /timeout|timed out|canceling statement/iu.test(message)) {
    return new DatabaseTimeoutError(message, options);
  }
  if (
    providerCode === '42501' ||
    providerCode === 'PGRST301' ||
    /permission|not authorized|unauthorized|row-level security/iu.test(message)
  ) {
    return new DatabaseUnauthorizedError(message, options);
  }
  if (/invalid|violates check constraint|null value|bad request/iu.test(message)) {
    return new DatabaseValidationError(message, options);
  }
  return new DatabaseAdapterError('unknown', message, options);
}

function throwIfError<T>(result: SupabaseResult<T>, table: string): T | null {
  if (result.error) {
    throw mapSupabaseError(result.error, table);
  }
  return result.data;
}

function rowsFromResult<Row extends DatabaseTableRow>(data: Row[] | Row | null): Row[] {
  if (!data) {
    return [];
  }
  return Array.isArray(data) ? data : [data];
}

function toPostgresEvent(event: DatabaseChangeType | undefined): string {
  if (!event || event === '*') return '*';
  return event.toUpperCase();
}

function fromPostgresEvent(eventType: unknown): Exclude<DatabaseChangeType, '*'> {
  if (eventType === 'INSERT') return 'insert';
  if (eventType === 'UPDATE') return 'update';
  return 'delete';
}

export function createSupabaseDatabaseAdapter<Schema extends DatabaseSchema>(
  getClient: SupabaseDatabaseClientFactory,
  options: SupabaseDatabaseAdapterOptions = {},
): DatabaseAdapter<Schema> {
  const adapter: DatabaseAdapter<Schema> = {
    name: 'supabase',
    version: options.version ?? '1.0.0',
    capabilities: {
      transactions: false,
      subscriptions: true,
      rls: true,
      authIntegration: true,
    },

    async query<Table extends DatabaseTableName<Schema>>(
      input: DatabaseQueryInput<Schema, Table>,
    ): Promise<Schema[Table][]> {
      const table = String(input.table);
      const tableClient = getClient().from(table);
      const select = requireBuilderMethod<(columns: string) => SupabaseBuilder<Schema[Table][]>>(
        tableClient,
        'select',
        table,
      );
      let builder = applyQueryOptions(select(selectColumns(input.select)), input, table);
      if (input.single) {
        const single =
          typeof builder.maybeSingle === 'function'
            ? (builder.maybeSingle.bind(builder) as () => Promise<SupabaseResult<Schema[Table]>>)
            : typeof builder.single === 'function'
              ? (builder.single.bind(builder) as () => Promise<SupabaseResult<Schema[Table]>>)
              : null;
        if (!single) {
          throw new DatabaseUnsupportedError(`Supabase builder does not support single queries for ${table}.`, {
            table,
          });
        }
        return rowsFromResult<Schema[Table]>(throwIfError(await single(), table));
      }
      return rowsFromResult<Schema[Table]>(throwIfError(await builder, table));
    },

    async mutate<Table extends DatabaseTableName<Schema>>(
      input: DatabaseMutationInput<Schema, Table>,
    ): Promise<DatabaseMutationResult<Schema[Table]>> {
      const table = String(input.table);
      const tableClient = getClient().from(table);
      let builder: SupabaseBuilder<Schema[Table][]>;

      if (input.type === 'insert') {
        if (!input.values) {
          throw new DatabaseValidationError(`Insert into ${table} requires values.`, { table });
        }
        builder = requireBuilderMethod<(values: unknown) => SupabaseBuilder<Schema[Table][]>>(
          tableClient,
          'insert',
          table,
        )(input.values);
      } else if (input.type === 'update') {
        if (!input.values) {
          throw new DatabaseValidationError(`Update ${table} requires values.`, { table });
        }
        builder = requireBuilderMethod<(values: unknown) => SupabaseBuilder<Schema[Table][]>>(
          tableClient,
          'update',
          table,
        )(input.values);
        builder = applyFilters(builder, input.filters, table);
      } else if (input.type === 'upsert') {
        if (!input.values) {
          throw new DatabaseValidationError(`Upsert into ${table} requires values.`, { table });
        }
        builder = requireBuilderMethod<(values: unknown) => SupabaseBuilder<Schema[Table][]>>(
          tableClient,
          'upsert',
          table,
        )(input.values);
      } else {
        builder = requireBuilderMethod<() => SupabaseBuilder<Schema[Table][]>>(
          tableClient,
          'delete',
          table,
        )();
        builder = applyFilters(builder, input.filters, table);
      }

      if (typeof builder.select === 'function') {
        builder = (builder.select as (columns: string) => SupabaseBuilder<Schema[Table][]>)(
          selectColumns(input.select),
        );
      }

      const result = await builder;
      const rows = rowsFromResult<Schema[Table]>(throwIfError(result, table));
      return {
        rows,
        count: result.count ?? rows.length,
      };
    },

    async transaction<Result>(fn: (client: DatabaseAdapter<Schema>) => Promise<Result>): Promise<Result> {
      if (options.transactionMode === 'unsupported') {
        throw new DatabaseUnsupportedError(
          'Supabase client-side transactions are not available through the generated adapter. Use a Postgres function or server route for atomic multi-step writes.',
        );
      }
      return fn(adapter);
    },

    subscribe<Table extends DatabaseTableName<Schema>>(
      input: DatabaseSubscribeInput<Schema, Table>,
      onChange: (event: DatabaseChangeEvent<Schema[Table]>) => void,
      onError?: (error: DatabaseAdapterError) => void,
    ) {
      const table = String(input.table);
      const client = getClient();
      if (!client.channel) {
        throw new DatabaseUnsupportedError('Supabase subscriptions require a realtime-capable client.', {
          table,
        });
      }
      if (input.filters?.length) {
        onError?.(
          new DatabaseUnsupportedError(
            'Supabase realtime filters are intentionally not generated yet. Filter rows in the callback or add a provider-specific adapter extension.',
            { table },
          ),
        );
      }

      const channel = client
        .channel(`mds-db-${table}`)
        .on(
          'postgres_changes',
          {
            event: toPostgresEvent(input.event),
            schema: options.schema ?? 'public',
            table,
          },
          (payload) => {
            onChange({
              type: fromPostgresEvent(payload.eventType),
              table,
              row: (payload.new as Schema[Table] | null | undefined) ?? null,
              oldRow: (payload.old as Partial<Schema[Table]> | null | undefined) ?? null,
            });
          },
        )
        .subscribe();

      return () => {
        if (channel && typeof (channel as { unsubscribe?: unknown }).unsubscribe === 'function') {
          void (channel as { unsubscribe: () => unknown }).unsubscribe();
          return;
        }
        void client.removeChannel?.(channel);
      };
    },
  };

  return adapter;
}

