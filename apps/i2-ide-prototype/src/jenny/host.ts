import type { ChatMessage, DraftStorageData, GenerationPlan, ProjectBlueprint, ProjectCreationHost } from "./types.ts";

import { JENNY_ROLE } from "./types.ts";

import { getFramework } from "./frameworks.ts";

import { analyzeInput, generateProjectMemory, redactValue } from "./discovery.ts";

const STORAGE_KEY = "isquared_jenny_creation_draft_v1";

export const MISSING_HOST = "Generation unavailable: no desktop generation host is connected. Review or export the blueprint draft.";



// Canonical serialization includes every reviewed field. Native hosts must recompute this digest.

function canonical(value: unknown): string {

  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;

  if (value && typeof value === "object") return `{${Object.keys(value).sort().map(k => `${JSON.stringify(k)}:${canonical((value as Record<string, unknown>)[k])}`).join(",")}}`;

  return JSON.stringify(value) ?? "null";

}

export async function planDigest(plan: GenerationPlan): Promise<string> {

  const bytes = new TextEncoder().encode(canonical(plan));

  const hash = await globalThis.crypto.subtle.digest("SHA-256", bytes);

  return Array.from(new Uint8Array(hash), b => b.toString(16).padStart(2, "0")).join("");

}

export async function verifyApproval(plan: GenerationPlan, approval?: { digest: string; signal: AbortSignal }) {

  if (!approval?.digest) throw new Error("Explicit plan approval is required.");

  approval.signal.throwIfAborted();

  if (approval.digest !== await planDigest(plan)) throw new Error("The plan changed after review. Review and approve it again.");

  if (!plan.executable) throw new Error(MISSING_HOST);

}

const stringKeys = ["projectName", "slug", "elevatorPitch", "targetAudience", "visualDirection", "colorPalette", "navigationPattern", "dataStorage", "authentication", "offlineSupport"];

const arrayKeys = ["platforms", "mvpFeatures", "deferredFeatures", "openDecisions"];

export function isDraft(value: unknown): value is DraftStorageData {

  if (!value || typeof value !== "object") return false;

  const d = value as DraftStorageData;

  const b = d.blueprint;

  if (!b || b.version !== 1 || !["exact", "expo-react-native"].includes(b.frameworkId) || typeof b.template !== "string" || !Number.isFinite(b.readinessScore) || !Number.isFinite(b.lastUpdated) || !(b.approvedPlanId === null || typeof b.approvedPlanId === "string") || !Number.isFinite(d.savedAt)) return false;

  const record = b as unknown as Record<string, {key: string; label: string; value: unknown; status: string; provenance: string}>;

  for (const key of [...stringKeys, ...arrayKeys]) {

    const item = record[key];

    if (!item || typeof item.key !== "string" || typeof item.label !== "string" || !["answered", "inferred", "unknown", "deferred", "conflicting", "requires-confirmation"].includes(item.status) || !["initial-idea", "chat", "inferred", "user-edit", "framework-default"].includes(item.provenance)) return false;

    if (stringKeys.includes(key) ? typeof item.value !== "string" : !Array.isArray(item.value) || !item.value.every(v => typeof v === "string")) return false;

  }

  return Array.isArray(d.messages) && d.messages.every(m => m && typeof m.id === "string" && ["jenny", "user"].includes(m.role) && typeof m.text === "string" && Number.isFinite(m.timestamp) && (m.suggestions === undefined || Array.isArray(m.suggestions) && m.suggestions.every(s => typeof s === "string")));

}

export class BrowserPrototypeCreationHost implements ProjectCreationHost {

  readonly version = "1.0.0" as const;

  readonly role = JENNY_ROLE;

  capabilities = { version: "1.0.0" as const, hostKind: "browser-prototype" as const, draftPersistenceAvailable: false, localDiscoveryAvailable: true, modelProviderAvailable: false, executionAvailable: false, engineLabel: "Local planning helper", message: MISSING_HOST };

  constructor() {

    try { const key = `${STORAGE_KEY}_probe`; window.localStorage.setItem(key, "1"); window.localStorage.removeItem(key); this.capabilities.draftPersistenceAvailable = true; } catch { /* Storage unavailable. */ }

  }

  async loadDraft(): Promise<DraftStorageData | null> {

    if (!this.capabilities.draftPersistenceAvailable) return null;

    try {

      const raw = window.localStorage.getItem(STORAGE_KEY);

      if (!raw) return null;

      const value: unknown = JSON.parse(raw);

      if (!isDraft(value)) throw new Error("Stored draft has an invalid schema. Export your current blueprint before closing.");

      value.blueprint.approvedPlanId = null;

      return redactValue(value);

    } catch (error) { throw new Error(`Could not load draft: ${error instanceof Error ? error.message : "storage unavailable"}`); }

  }

  async saveDraft(data: { blueprint: ProjectBlueprint; messages: ChatMessage[] }) {

    if (!this.capabilities.draftPersistenceAvailable) throw new Error("Draft storage unavailable. Export the blueprint before closing.");

    try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(redactValue({ ...data, savedAt: Date.now() }))); }

    catch { this.capabilities.draftPersistenceAvailable = false; throw new Error("Draft storage failed. Export the blueprint before closing."); }

  }

  async clearDraft() { if (this.capabilities.draftPersistenceAvailable) window.localStorage.removeItem(STORAGE_KEY); }

  async analyzeIdea(idea: string, current: ProjectBlueprint, history: ChatMessage[] = []) { return analyzeInput(idea, current, history); }

  async createPlan(blueprint: ProjectBlueprint): Promise<GenerationPlan> {
    const b = redactValue(blueprint);

    return { executable: false, planId: `draft_${Date.now()}`, frameworkId: b.frameworkId, frameworkName: getFramework(b.frameworkId).displayName, projectName: b.projectName.value, destinationPath: "", template: b.template, platforms: [...b.platforms.value], generatedFiles: [], projectMemory: generateProjectMemory(b), commandPreview: "", createdAt: Date.now() };

  }

  async validatePlan(_plan: GenerationPlan) { return { valid: false, errors: [MISSING_HOST], warnings: [] }; }

  async executePlan(plan: GenerationPlan, _onEvent: Parameters<ProjectCreationHost["executePlan"]>[1], approval: Parameters<ProjectCreationHost["executePlan"]>[2]) {

    await verifyApproval(plan, approval);

    return { success: false, reason: MISSING_HOST };

  }

}

export const defaultHost = new BrowserPrototypeCreationHost();
