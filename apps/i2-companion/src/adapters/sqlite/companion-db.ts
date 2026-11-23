import {
  MemoryCompanionRepositories,
  SqliteCompanionRepositories,
  type StorageEnvironmentDiagnostic,
} from './repositories.ts';

export { MemoryCompanionRepositories, SqliteCompanionRepositories };
export type { StorageEnvironmentDiagnostic };

const fallbackMemory = new MemoryCompanionRepositories();

export const companionRepos = new SqliteCompanionRepositories(async () => null, fallbackMemory, {
  backend: 'memory-fallback',
  crossOriginIsolated: null,
  reason: 'Platform-neutral fallback (non-native/non-web resolution).',
});
