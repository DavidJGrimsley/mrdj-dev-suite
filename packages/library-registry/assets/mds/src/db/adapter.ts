export type DatabaseTableRow = Record<string, unknown>;
export type DatabaseSchema = Record<string, DatabaseTableRow>;
export type DatabaseTableName<Schema extends DatabaseSchema> = Extract<keyof Schema, string>;
export type DatabaseRow<
  Schema extends DatabaseSchema,
  Table extends DatabaseTableName<Schema>,
> = Schema[Table];
export type DatabaseInsert<
  Schema extends DatabaseSchema,
  Table extends DatabaseTableName<Schema>,
> = Partial<DatabaseRow<Schema, Table>>;
export type DatabaseUpdate<
  Schema extends DatabaseSchema,
  Table extends DatabaseTableName<Schema>,
> = Partial<DatabaseRow<Schema, Table>>;

export type DatabaseFilterOperator =
  | 'eq'
  | 'neq'
  | 'gt'
  | 'gte'
  | 'lt'
  | 'lte'
  | 'in'
  | 'like'
  | 'ilike'
  | 'is';

export type DatabaseErrorCode =
  | 'not_found'
  | 'conflict'
  | 'timeout'
  | 'unauthorized'
  | 'validation'
  | 'unsupported'
  | 'unknown';

export type DatabaseMutationType = 'insert' | 'update' | 'upsert' | 'delete';
export type DatabaseChangeType = 'insert' | 'update' | 'delete' | '*';

export interface DatabaseCapabilities {
  transactions: boolean;
  subscriptions: boolean;
  rls?: boolean;
  authIntegration?: boolean;
}

export interface DatabaseAdapterMetadata {
  name: string;
  version: string;
  capabilities: DatabaseCapabilities;
}

export interface DatabaseFilter<Row extends DatabaseTableRow> {
  column: Extract<keyof Row, string>;
  operator?: DatabaseFilterOperator;
  value: unknown;
}

export interface DatabaseQueryInput<
  Schema extends DatabaseSchema,
  Table extends DatabaseTableName<Schema>,
> {
  table: Table;
  select?: string | readonly Extract<keyof DatabaseRow<Schema, Table>, string>[];
  filters?: readonly DatabaseFilter<DatabaseRow<Schema, Table>>[];
  limit?: number;
  orderBy?: {
    column: Extract<keyof DatabaseRow<Schema, Table>, string>;
    ascending?: boolean;
  };
  single?: boolean;
}

export interface DatabaseMutationInput<
  Schema extends DatabaseSchema,
  Table extends DatabaseTableName<Schema>,
> {
  table: Table;
  type: DatabaseMutationType;
  values?: DatabaseInsert<Schema, Table> | readonly DatabaseInsert<Schema, Table>[];
  filters?: readonly DatabaseFilter<DatabaseRow<Schema, Table>>[];
  select?: string | readonly Extract<keyof DatabaseRow<Schema, Table>, string>[];
}

export interface DatabaseMutationResult<Row extends DatabaseTableRow> {
  rows: Row[];
  count: number;
}

export interface DatabaseSubscribeInput<
  Schema extends DatabaseSchema,
  Table extends DatabaseTableName<Schema>,
> {
  table: Table;
  event?: DatabaseChangeType;
  filters?: readonly DatabaseFilter<DatabaseRow<Schema, Table>>[];
}

export interface DatabaseChangeEvent<Row extends DatabaseTableRow> {
  type: Exclude<DatabaseChangeType, '*'>;
  table: string;
  row: Row | null;
  oldRow?: Partial<Row> | null;
}

export type DatabaseUnsubscribe = () => void;

export interface DatabaseAdapter<Schema extends DatabaseSchema = DatabaseSchema>
  extends DatabaseAdapterMetadata {
  query<Table extends DatabaseTableName<Schema>>(
    input: DatabaseQueryInput<Schema, Table>,
  ): Promise<DatabaseRow<Schema, Table>[]>;
  mutate<Table extends DatabaseTableName<Schema>>(
    input: DatabaseMutationInput<Schema, Table>,
  ): Promise<DatabaseMutationResult<DatabaseRow<Schema, Table>>>;
  transaction<Result>(fn: (client: DatabaseAdapter<Schema>) => Promise<Result>): Promise<Result>;
  subscribe<Table extends DatabaseTableName<Schema>>(
    input: DatabaseSubscribeInput<Schema, Table>,
    onChange: (event: DatabaseChangeEvent<DatabaseRow<Schema, Table>>) => void,
    onError?: (error: DatabaseAdapterError) => void,
  ): DatabaseUnsubscribe;
}

export interface DatabaseAdapterErrorOptions {
  cause?: unknown;
  providerCode?: string;
  retryable?: boolean;
  table?: string;
}

export class DatabaseAdapterError extends Error {
  readonly code: DatabaseErrorCode;
  readonly providerCode?: string;
  readonly retryable: boolean;
  readonly table?: string;

  constructor(code: DatabaseErrorCode, message: string, options: DatabaseAdapterErrorOptions = {}) {
    super(message);
    this.name = 'DatabaseAdapterError';
    this.code = code;
    this.providerCode = options.providerCode;
    this.retryable = options.retryable ?? code === 'timeout';
    this.table = options.table;
    if (options.cause !== undefined) {
      this.cause = options.cause;
    }
  }
}

export class DatabaseNotFoundError extends DatabaseAdapterError {
  constructor(message = 'Database row was not found.', options?: DatabaseAdapterErrorOptions) {
    super('not_found', message, options);
    this.name = 'DatabaseNotFoundError';
  }
}

export class DatabaseConflictError extends DatabaseAdapterError {
  constructor(message = 'Database write conflicted with existing data.', options?: DatabaseAdapterErrorOptions) {
    super('conflict', message, options);
    this.name = 'DatabaseConflictError';
  }
}

export class DatabaseTimeoutError extends DatabaseAdapterError {
  constructor(message = 'Database operation timed out.', options?: DatabaseAdapterErrorOptions) {
    super('timeout', message, { ...options, retryable: true });
    this.name = 'DatabaseTimeoutError';
  }
}

export class DatabaseUnauthorizedError extends DatabaseAdapterError {
  constructor(message = 'Database operation is not authorized.', options?: DatabaseAdapterErrorOptions) {
    super('unauthorized', message, options);
    this.name = 'DatabaseUnauthorizedError';
  }
}

export class DatabaseValidationError extends DatabaseAdapterError {
  constructor(message = 'Database operation input is invalid.', options?: DatabaseAdapterErrorOptions) {
    super('validation', message, options);
    this.name = 'DatabaseValidationError';
  }
}

export class DatabaseUnsupportedError extends DatabaseAdapterError {
  constructor(message = 'Database operation is not supported by this adapter.', options?: DatabaseAdapterErrorOptions) {
    super('unsupported', message, options);
    this.name = 'DatabaseUnsupportedError';
  }
}

export function isDatabaseAdapterError(error: unknown): error is DatabaseAdapterError {
  return error instanceof DatabaseAdapterError;
}
