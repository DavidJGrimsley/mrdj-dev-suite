import { describe, expect, it } from "vitest";

import { createMemoryOnboardingPersistence } from "../assets/mds/src/features/onboarding-state/onboarding-state-memory.ts";
import {
  createSupabaseLegalAcceptanceAdapter,
  createSupabaseOnboardingStateAdapter,
  type SupabaseOnboardingClient,
  type SupabaseResult,
} from "../assets/mds/src/features/onboarding-state/onboarding-state-supabase.ts";
import { createEmptyOnboardingState } from "../assets/mds/src/features/onboarding-state/onboarding-state-types.ts";
import {
  createZustandSupabaseLegalAcceptanceAdapter,
  createZustandSupabaseOnboardingStateAdapter,
} from "../assets/mds/src/features/onboarding-state/onboarding-state-zustand-supabase.ts";

const requiredDocuments = [
  { documentId: "terms" as const, acceptanceVersion: "2026-08-10" },
  { documentId: "privacy" as const, acceptanceVersion: "2026-08-10" },
];

function createMemoryCache(initial = createEmptyOnboardingState()) {
  let state = initial;
  return {
    getState: () => state,
    setState: (next: typeof state) => {
      state = next;
    },
  };
}

function createMockSupabase() {
  const onboarding = new Map<string, Record<string, unknown>>();
  const legal: Record<string, unknown>[] = [];

  const client: SupabaseOnboardingClient = {
    from(table: string) {
      return {
        select() {
          const query = {
            eq(_column: string, value: string) {
              const result: SupabaseResult<unknown> = {
                data:
                  table === "user_onboarding_state"
                    ? (onboarding.get(value) ?? null)
                    : legal.filter((row) => row.user_id === value),
                error: null,
              };
              return Object.assign(Promise.resolve(result), {
                maybeSingle: async () => result,
              });
            },
          };
          return query;
        },
        async upsert(values: Record<string, unknown>) {
          onboarding.set(String(values.user_id), values);
          return { data: null, error: null };
        },
        async insert(values: Record<string, unknown>) {
          const duplicate = legal.some(
            (row) =>
              row.user_id === values.user_id &&
              row.document_id === values.document_id &&
              row.document_version === values.document_version,
          );
          if (duplicate) {
            return { data: null, error: { message: "duplicate key value violates unique constraint" } };
          }
          legal.push(values);
          return { data: null, error: null };
        },
      };
    },
  };

  return { client, onboarding, legal };
}

describe("onboarding persistence adapters", () => {
  it("keeps memory completion and legal acceptance only for the current process", async () => {
    const persistence = createMemoryOnboardingPersistence();

    await persistence.onboarding.markComplete();
    await persistence.legal.acceptLegalDocument(requiredDocuments[0]);

    const state = await persistence.onboarding.loadState();
    const legal = await persistence.legal.loadRequiredLegalAcceptances(requiredDocuments);

    expect(state?.completedAt).toBeTruthy();
    expect(legal.status).toBe("needs-legal");
    expect(legal.acceptedDocumentKeys).toEqual(["terms@2026-08-10"]);

    const reloaded = createMemoryOnboardingPersistence();
    expect(await reloaded.onboarding.loadState()).toBeNull();
    expect(
      (await reloaded.legal.loadRequiredLegalAcceptances(requiredDocuments)).status,
    ).toBe("needs-legal");
    expect(
      (await reloaded.legal.loadRequiredLegalAcceptances(requiredDocuments)).acceptedDocumentKeys,
    ).toEqual([]);
  });

  it("requires a user id for supabase writes and does not treat anonymous legal as complete", async () => {
    const { client, legal } = createMockSupabase();
    const onboarding = createSupabaseOnboardingStateAdapter(() => client);
    const legalAdapter = createSupabaseLegalAcceptanceAdapter(() => client);

    await expect(onboarding.markComplete()).rejects.toThrow("signed-in user id");
    expect(await onboarding.loadState()).toBeNull();
    expect(
      (await legalAdapter.loadRequiredLegalAcceptances(requiredDocuments)).status,
    ).toBe("needs-legal");

    await onboarding.markComplete({ userId: "user-1" });
    await legalAdapter.acceptLegalDocument(requiredDocuments[0], { userId: "user-1" });
    await legalAdapter.acceptLegalDocument(requiredDocuments[0], { userId: "user-1" });

    const state = await onboarding.loadState("user-1");
    const snapshot = await legalAdapter.loadRequiredLegalAcceptances(
      requiredDocuments,
      "user-1",
    );

    expect(state?.completedAt).toBeTruthy();
    expect(snapshot.status).toBe("needs-legal");
    expect(legal).toHaveLength(1);
    expect(legal[0]).not.toHaveProperty("updated_at");
  });

  it("uses zustand as a cache while supabase remains canonical after sync", async () => {
    const { client } = createMockSupabase();
    const cache = createMemoryCache(
      createEmptyOnboardingState({ currentStep: "features", pendingSync: true }),
    );
    const onboarding = createZustandSupabaseOnboardingStateAdapter(() => client, cache);
    const legalAdapter = createZustandSupabaseLegalAcceptanceAdapter(() => client, cache);

    expect((await onboarding.loadState())?.pendingSync).toBe(true);
    expect(
      (await legalAdapter.loadRequiredLegalAcceptances(requiredDocuments)).status,
    ).toBe("needs-legal");

    await onboarding.markComplete({ userId: "user-1" });
    await legalAdapter.acceptLegalDocument(requiredDocuments[0], { userId: "user-1" });
    await legalAdapter.acceptLegalDocument(requiredDocuments[1], { userId: "user-1" });

    const synced = await onboarding.syncPending?.("user-1");
    const snapshot = await legalAdapter.loadRequiredLegalAcceptances(
      requiredDocuments,
      "user-1",
    );

    expect(synced?.pendingSync).toBe(false);
    expect(synced?.completedAt).toBeTruthy();
    expect(snapshot.status).toBe("complete");
    expect(cache.getState().legalAcceptances).toHaveLength(2);
  });
});
