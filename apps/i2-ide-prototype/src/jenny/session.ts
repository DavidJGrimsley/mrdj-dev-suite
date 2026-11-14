import type { DraftStorageData, ProjectCreationHost, ProjectBlueprint, ChatMessage, FrameworkId } from "./types.ts";
import { getFramework } from "./frameworks.ts";
/** A per-screen queue: no save may overtake hydration or an earlier save. */
export class DraftSession {
  private queue: Promise<unknown>;
  readonly loaded: Promise<DraftStorageData | null>;
  private host: ProjectCreationHost;
  constructor(host: ProjectCreationHost) {
    this.host = host;
    this.loaded = host.loadDraft();
    this.queue = this.loaded.catch(() => null);
  }
  save(data: { blueprint: ProjectBlueprint; messages: ChatMessage[] }) {
    const snapshot = structuredClone(data);
    const operation = this.queue.then(() => this.host.saveDraft(snapshot));
    this.queue = operation.catch(() => undefined);
    return operation;
  }
}
export class RevisionGate {
  private revision = 0;
  invalidate() { return ++this.revision; }
  current(token: number) { return token === this.revision; }
}
export function switchFramework(prev: ProjectBlueprint, id: FrameworkId): ProjectBlueprint {
  if (prev.frameworkId === id) return prev;
  return { ...prev, frameworkId: id, template: getFramework(id).defaultTemplate, approvedPlanId: null, lastUpdated: Date.now() };
}
