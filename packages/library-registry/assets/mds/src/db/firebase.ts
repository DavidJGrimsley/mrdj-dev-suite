import {
  DatabaseAdapterError,
  DatabaseUnsupportedError,
  type DatabaseAdapter,
  type DatabaseChangeEvent,
  type DatabaseMutationInput,
  type DatabaseMutationResult,
  type DatabaseQueryInput,
  type DatabaseSchema,
  type DatabaseSubscribeInput,
  type DatabaseTableName,
} from './adapter';

export type FirebaseDatabaseClient = unknown;
export type FirebaseDatabaseClientFactory = () => FirebaseDatabaseClient;

export interface FirebaseDatabaseAdapterOptions {
  version?: string;
}

export function createFirebaseDatabaseAdapter<Schema extends DatabaseSchema>(
  getClient: FirebaseDatabaseClientFactory,
  options: FirebaseDatabaseAdapterOptions = {},
): DatabaseAdapter<Schema> {
  void getClient;

  return {
    name: 'firebase',
    version: options.version ?? '0.1.0',
    capabilities: {
      transactions: false,
      subscriptions: false,
      rls: false,
      authIntegration: false,
    },

    async query<Table extends DatabaseTableName<Schema>>(
      input: DatabaseQueryInput<Schema, Table>,
    ): Promise<Schema[Table][]> {
      void input;
      throw new DatabaseUnsupportedError(
        'Firebase database reads are a generated skeleton. Implement Firestore collection/query mapping for this app schema before use.',
      );
    },

    async mutate<Table extends DatabaseTableName<Schema>>(
      input: DatabaseMutationInput<Schema, Table>,
    ): Promise<DatabaseMutationResult<Schema[Table]>> {
      void input;
      throw new DatabaseUnsupportedError(
        'Firebase database writes are a generated skeleton. Implement addDoc, setDoc, updateDoc, or deleteDoc mapping for this app schema before use.',
      );
    },

    async transaction<Result>(fn: (client: DatabaseAdapter<Schema>) => Promise<Result>): Promise<Result> {
      void fn;
      throw new DatabaseUnsupportedError(
        'Firebase transaction support is not wired in this generated skeleton. Use runTransaction after defining document paths for your schema.',
      );
    },

    subscribe<Table extends DatabaseTableName<Schema>>(
      input: DatabaseSubscribeInput<Schema, Table>,
      onChange: (event: DatabaseChangeEvent<Schema[Table]>) => void,
      onError?: (error: DatabaseAdapterError) => void,
    ) {
      void input;
      void onChange;
      const error = new DatabaseUnsupportedError(
        'Firebase subscriptions are a generated skeleton. Wire Firestore onSnapshot once collection paths and auth rules are defined.',
      );
      onError?.(error);
      return () => {};
    },
  };
}

