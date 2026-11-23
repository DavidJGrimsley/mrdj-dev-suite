// Chat drafts live in the screen that owns the composer. Opening another project
// for Widgets & Whatnot unmounts Home and Session, so the text is kept here and
// read back when that screen returns. Clearing a draft stores an empty string.

const drafts = new Map<string, string>();

export function chatDraftKey(kind: "home" | "project" | "session" | "legacy-infie", id?: string | null): string {
  return id ? `${kind}:${id}` : kind;
}

export function readChatDraft(key: string): string {
  return drafts.get(key) ?? "";
}

export function writeChatDraft(key: string, value: string): void {
  drafts.set(key, value);
}
