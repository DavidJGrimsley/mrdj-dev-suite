import type { MemoryLegalAcceptanceAdapter, MemoryLegalDocument } from './onboarding-state-memory';
import {
  createEmptyOnboardingState,
  DEFAULT_ONBOARDING_FLOW_ID,
  DEFAULT_ONBOARDING_FLOW_VERSION,
  type OnboardingDocumentAcceptance,
  type OnboardingState,
  type OnboardingStateAdapter,
} from './onboarding-state-types';

export type SupabaseOnboardingRow = {
  user_id: string;
  flow_id: string;
  flow_version: number;
  status: string;
  current_step: string | null;
  completed_at: string | null;
};

export type SupabaseLegalRow = {
  user_id: string;
  document_id: string;
  document_version: string;
  flow_id: string | null;
  accepted_at: string;
};

export type SupabaseResult<T> = {
  data: T | null;
  error: { message: string } | null;
};

export type SupabaseOnboardingClient = {
  from(table: string): {
    select(columns: string): {
      eq(column: string, value: string): Promise<SupabaseResult<unknown>> & {
        maybeSingle(): Promise<SupabaseResult<unknown>>;
      };
    };
    upsert(
      values: Record<string, unknown>,
      options?: { onConflict?: string },
    ): Promise<SupabaseResult<null>>;
    insert(values: Record<string, unknown>): Promise<SupabaseResult<null>>;
  };
};

export type SupabaseClientFactory = () => SupabaseOnboardingClient;

function requireUserId(userId?: string): string {
  if (!userId) {
    throw new Error('Supabase onboarding persistence requires a signed-in user id.');
  }
  return userId;
}

function isIgnorableInsertError(message: string): boolean {
  return /duplicate|unique/i.test(message);
}

function isMissingColumnError(message: string, columnName: string): boolean {
  return message.includes(columnName) && /column|schema cache|not find/i.test(message);
}

const LEGACY_COMPLETED_AT_FALLBACK = '1970-01-01T00:00:00.000Z';

function toOnboardingState(
  row: SupabaseOnboardingRow | null,
  legalRows: SupabaseLegalRow[],
): OnboardingState | null {
  if (!row && legalRows.length === 0) {
    return null;
  }

  return {
    flowId: row?.flow_id ?? DEFAULT_ONBOARDING_FLOW_ID,
    flowVersion: row?.flow_version ?? DEFAULT_ONBOARDING_FLOW_VERSION,
    currentStep: row?.current_step ?? undefined,
    completedAt:
      row?.completed_at ??
      (row?.status === 'complete' ? LEGACY_COMPLETED_AT_FALLBACK : undefined),
    legalAcceptances: legalRows.map((item) => ({
      documentId: item.document_id as OnboardingDocumentAcceptance['documentId'],
      documentVersion: item.document_version,
      acceptedAt: item.accepted_at,
      userId: item.user_id,
      flowId: item.flow_id ?? undefined,
    })),
    pendingSync: false,
  };
}

async function loadRemote(
  getClient: SupabaseClientFactory,
  userId: string,
): Promise<OnboardingState | null> {
  const client = getClient();
  const onboardingQuery = client
    .from('user_onboarding_state')
    .select('user_id, flow_id, flow_version, status, current_step, completed_at')
    .eq('user_id', userId);
  const onboardingResult = await onboardingQuery.maybeSingle();
  if (onboardingResult.error) {
    throw new Error(onboardingResult.error.message);
  }

  const legalResult = await client
    .from('user_legal_acceptances')
    .select('user_id, document_id, document_version, flow_id, accepted_at')
    .eq('user_id', userId);
  if (legalResult.error) {
    throw new Error(legalResult.error.message);
  }

  return toOnboardingState(
    (onboardingResult.data as SupabaseOnboardingRow | null) ?? null,
    (legalResult.data as SupabaseLegalRow[] | null) ?? [],
  );
}

export function createSupabaseOnboardingStateAdapter(
  getClient: SupabaseClientFactory,
): OnboardingStateAdapter {
  return {
    mode: 'supabase',
    async loadState(userId) {
      if (!userId) {
        return null;
      }
      return loadRemote(getClient, userId);
    },
    async saveState(state, userId) {
      const id = requireUserId(userId);
      const result = await getClient()
        .from('user_onboarding_state')
        .upsert(
          {
            user_id: id,
            flow_id: state.flowId,
            flow_version: state.flowVersion,
            status: state.completedAt ? 'complete' : 'in_progress',
            current_step: state.currentStep ?? null,
            completed_at: state.completedAt ?? null,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id' },
        );
      if (result.error) {
        throw new Error(result.error.message);
      }
    },
    async markComplete(input) {
      const id = requireUserId(input?.userId);
      const current = createEmptyOnboardingState();
      const next = {
        ...current,
        completedAt: input?.completedAt ?? new Date().toISOString(),
        currentStep: 'complete',
        pendingSync: false,
      };
      const result = await getClient()
        .from('user_onboarding_state')
        .upsert(
          {
            user_id: id,
            flow_id: next.flowId,
            flow_version: next.flowVersion,
            status: 'complete',
            current_step: next.currentStep ?? null,
            completed_at: next.completedAt ?? null,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id' },
        );
      if (result.error) {
        throw new Error(result.error.message);
      }
      return next;
    },
  };
}

export function createSupabaseLegalAcceptanceAdapter(
  getClient: SupabaseClientFactory,
): MemoryLegalAcceptanceAdapter {
  return {
    async loadRequiredLegalAcceptances(requiredDocuments: MemoryLegalDocument[], userId?: string) {
      if (!userId) {
        return {
          status: 'needs-legal',
          requiredDocuments,
          acceptedDocumentKeys: [],
        };
      }

      const legalResult = await getClient()
        .from('user_legal_acceptances')
        .select('user_id, document_id, document_version, flow_id, accepted_at')
        .eq('user_id', userId);
      if (legalResult.error) {
        throw new Error(legalResult.error.message);
      }

      const acceptedDocumentKeys = ((legalResult.data as SupabaseLegalRow[] | null) ?? []).map(
        (item) => `${item.document_id}@${item.document_version}`,
      );
      const accepted = new Set(acceptedDocumentKeys);
      const missingDocuments = requiredDocuments.filter(
        (document) => !accepted.has(`${document.documentId}@${document.acceptanceVersion}`),
      );

      return {
        status: missingDocuments.length > 0 ? 'needs-legal' : 'complete',
        requiredDocuments: missingDocuments,
        acceptedDocumentKeys,
      };
    },

    async acceptLegalDocument(document, input) {
      const userId = requireUserId(input?.userId);
      const payload = {
        user_id: userId,
        document_id: document.documentId,
        document_version: document.acceptanceVersion,
        acceptance_version: document.acceptanceVersion,
        flow_id: input?.flowId ?? DEFAULT_ONBOARDING_FLOW_ID,
        accepted_at: new Date().toISOString(),
        metadata: {
          flowVersion: input?.flowVersion ?? DEFAULT_ONBOARDING_FLOW_VERSION,
        },
      };
      let result = await getClient().from('user_legal_acceptances').insert(payload);
      if (
        result.error &&
        isMissingColumnError(result.error.message, 'acceptance_version')
      ) {
        const modernPayload: Record<string, unknown> = { ...payload };
        delete modernPayload.acceptance_version;
        result = await getClient().from('user_legal_acceptances').insert(modernPayload);
      }
      if (result.error && !isIgnorableInsertError(result.error.message)) {
        throw new Error(result.error.message);
      }
    },
  };
}
