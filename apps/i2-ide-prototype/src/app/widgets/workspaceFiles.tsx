// Real workspace files for the Explorer, Project Folder and Plan.md widgets.
//
// File contents come from snapshots written by scripts/snapshot-workspace-files.mjs
// (public/workspace-files/<id>.json): git-tracked text files copied from the actual
// repositories. Nothing here invents file contents; when a project has no snapshot the
// widgets say so (or raise the Prototype Limit) instead of opening a made-up file.
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { ChevronDown, ChevronRight, Expand, FileText, Folder, FolderOpen, Minimize2, X } from "lucide-react";
import { assetUrl } from "../assetUrl";
import { notHotdogLimit, usePrototypeLimit } from "./prototypeLimit";

export interface WorkspaceBundle {
  id: string;
  rootName: string;
  files: { path: string; content: string }[];
}

type BundleState =
  | { status: "loading"; bundle: null }
  | { status: "ready"; bundle: WorkspaceBundle }
  | { status: "missing"; bundle: null };

const cache = new Map<string, Promise<WorkspaceBundle | null>>();

function loadWorkspaceBundle(id: string): Promise<WorkspaceBundle | null> {
  let pending = cache.get(id);
  if (!pending) {
    pending = fetch(assetUrl(`/workspace-files/${id}.json`))
      .then(async (res) => {
        if (!res.ok) return null;
        // A dev server answers unknown paths with index.html; only accept a real snapshot.
        const data = JSON.parse(await res.text()) as WorkspaceBundle;
        return Array.isArray(data.files) ? data : null;
      })
      .catch(() => null);
    cache.set(id, pending);
  }
  return pending;
}

/** Which snapshot backs a prototype project. Projects without one return null. */
export function workspaceBundleIdFor(projectId: string): string | null {
  if (projectId === "experimemo") return "experimemo";
  // The onboarding tutorial's demo project is presented with Pet Show and Tell's data.
  if (projectId === "pet" || projectId === "tutorial-demo") return "pet";
  return null;
}

const NOT_HOTDOG = "nothotdog";

export function useWorkspaceBundle(bundleId: string | null): BundleState {
  const [state, setState] = useState<BundleState>(
    bundleId ? { status: "loading", bundle: null } : { status: "missing", bundle: null },
  );
  useEffect(() => {
    if (!bundleId) {
      setState({ status: "missing", bundle: null });
      return;
    }
    let live = true;
    setState({ status: "loading", bundle: null });
    loadWorkspaceBundle(bundleId).then((bundle) => {
      if (live) setState(bundle ? { status: "ready", bundle } : { status: "missing", bundle: null });
    });
    return () => {
      live = false;
    };
  }, [bundleId]);
  return state;
}

/** How a project's i2Workspace is laid out in the Explorer. */
export interface WorkspaceSpec {
  projectId: string;
  rootName: string;
  /** Top-level folders in display order; ones with no snapshotted files stay and say so. */
  folders: string[];
  defaultOpen: string[];
}

export function workspaceSpecFor(projectId: string, opts: { sessionBranch?: string | null } = {}): WorkspaceSpec {
  if (projectId === "experimemo") {
    return {
      projectId,
      rootName: "experimemo-i2Workspace",
      folders: ["main", ...(opts.sessionBranch ? [opts.sessionBranch] : []), "project", "generated", "test-apps"],
      defaultOpen: [],
    };
  }
  if (projectId === NOT_HOTDOG) {
    return { projectId, rootName: "not-hotdog-i2Workspace", folders: ["main", "feat/edge-cases", "project", "temp", "generated"], defaultOpen: [] };
  }
  return {
    projectId,
    rootName: "pet-show-and-tell-i2Workspace",
    folders: ["main", "feature/add-comments", "chore/fix-reaction-bug", "project", "temp", "generated"],
    defaultOpen: ["main", "main/src", "main/src/app"],
  };
}

// ─── File viewer ────────────────────────────────────────────────────────────

interface OpenFile {
  /** Path shown in the tab and title bar, relative to the workspace root. */
  path: string;
  content: string | null;
  /** Where the content came from, or why there is none. */
  note: string;
}

type OpenFileFn = (file: OpenFile, spec: WorkspaceSpec) => void;

const FileViewerContext = createContext<OpenFileFn | null>(null);

export function useFileViewer(): OpenFileFn {
  const open = useContext(FileViewerContext);
  if (!open) throw new Error("FileViewerProvider is missing");
  return open;
}

interface ViewerState {
  spec: WorkspaceSpec;
  tabs: OpenFile[];
  active: string;
  fullscreen: boolean;
}

const TRIPLE_CLICK_MS = 320;

/**
 * Read-only editor: the workspace Explorer on the left, opened files as tabs on the right.
 * Triple-click the title bar (or use its button) for fullscreen.
 */
export function FileViewerProvider({ children }: { children: ReactNode }) {
  const [viewer, setViewer] = useState<ViewerState | null>(null);
  const clicks = useRef({ count: 0, timer: 0 });

  const open = useCallback<OpenFileFn>((file, spec) => {
    setViewer((prev) => {
      // Files from the same workspace open as another tab; a different workspace starts fresh.
      if (!prev || prev.spec.projectId !== spec.projectId) return { spec, tabs: [file], active: file.path, fullscreen: prev?.fullscreen ?? false };
      const exists = prev.tabs.some((t) => t.path === file.path);
      return {
        ...prev,
        spec,
        tabs: exists ? prev.tabs.map((t) => (t.path === file.path ? file : t)) : [...prev.tabs, file],
        active: file.path,
      };
    });
  }, []);
  const close = useCallback(() => setViewer(null), []);

  useEffect(() => {
    if (!viewer) return;
    // Capture phase: Escape closes the viewer first, not the widget or modal underneath.
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.stopImmediatePropagation();
      setViewer(null);
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [viewer !== null]); // eslint-disable-line react-hooks/exhaustive-deps

  const file = viewer?.tabs.find((t) => t.path === viewer.active) ?? null;
  const lines = useMemo(() => (file?.content != null ? file.content.replace(/\n$/, "").split("\n") : []), [file]);

  const closeTab = (path: string) =>
    setViewer((prev) => {
      if (!prev) return prev;
      const idx = prev.tabs.findIndex((t) => t.path === path);
      const tabs = prev.tabs.filter((t) => t.path !== path);
      if (tabs.length === 0) return null;
      const active = prev.active === path ? tabs[Math.min(idx, tabs.length - 1)].path : prev.active;
      return { ...prev, tabs, active };
    });
  const toggleFullscreen = () => setViewer((prev) => (prev ? { ...prev, fullscreen: !prev.fullscreen } : prev));
  const onTitleClick = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest("button")) return;
    const c = clicks.current;
    c.count += 1;
    window.clearTimeout(c.timer);
    c.timer = window.setTimeout(() => {
      if (c.count >= 3) toggleFullscreen();
      c.count = 0;
    }, TRIPLE_CLICK_MS);
  };

  return (
    <FileViewerContext.Provider value={open}>
      {children}
      {viewer &&
        createPortal(
          <div
            data-testid="file-viewer"
            data-fullscreen={viewer.fullscreen ? "true" : "false"}
            className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 backdrop-blur-sm p-2"
            onClick={close}
          >
            <div
              role="dialog"
              aria-label={`${viewer.spec.rootName} files`}
              onClick={(e) => e.stopPropagation()}
              className={`bg-[#1a1a1a] border border-white/8 rounded-[10px] shadow-2xl flex flex-col overflow-hidden ${viewer.fullscreen ? "fixed inset-3" : "w-[1120px] h-[700px] max-w-full max-h-full"}`}
            >
              {/* Title bar */}
              <div
                data-testid="file-viewer-titlebar"
                onClick={onTitleClick}
                title="Triple-click for fullscreen"
                className="flex items-center gap-2 px-4 py-2.5 bg-[#1d1b20] border-b border-white/5 shrink-0 select-none"
              >
                <FolderOpen size={14} className="text-[#abefa3] shrink-0" />
                <span className="font-['Rounded_Mplus_1c',sans-serif] text-[12px] text-white truncate flex-1 min-w-0">{viewer.spec.rootName}</span>
                <span data-testid="file-viewer-readonly" title="Read-only (Simulator limitation). Editing is available in the full app." className="hidden sm:inline font-['Rounded_Mplus_1c',sans-serif] text-[10px] uppercase tracking-wide text-[#555] shrink-0">Read-only (Simulator limitation). Editing is available in the full app.</span>
                <button type="button" data-testid="file-viewer-fullscreen" onClick={toggleFullscreen} aria-label={viewer.fullscreen ? "Exit fullscreen" : "Fullscreen"} title={viewer.fullscreen ? "Exit fullscreen" : "Fullscreen"} className="p-1 rounded text-[#666] hover:text-[#abefa3] hover:bg-white/5 transition-colors shrink-0">
                  {viewer.fullscreen ? <Minimize2 size={13} /> : <Expand size={13} />}
                </button>
                <button type="button" onClick={close} aria-label="Close files" className="p-1 rounded text-[#666] hover:text-[#c5c5c5] hover:bg-white/5 transition-colors shrink-0">
                  <X size={14} />
                </button>
              </div>

              <div className="flex flex-1 min-h-0">
                {/* Explorer */}
                <div data-testid="file-viewer-explorer" className="hidden md:flex w-[250px] shrink-0 flex-col border-r border-white/5 bg-[#252323] min-h-0">
                  <div className="px-3 py-[7px] bg-[#1d1b20] border-b border-white/5 font-['Rounded_Mplus_1c',sans-serif] text-[11px] tracking-[0.275px] uppercase text-[#777] shrink-0">Explorer</div>
                  <WorkspaceExplorer spec={viewer.spec} activePath={viewer.active} />
                </div>

                {/* Tabs + content */}
                <div className="flex flex-col flex-1 min-w-0 min-h-0">
                  <div role="tablist" aria-label="Open files" data-testid="file-viewer-tabs" className="flex items-stretch bg-[#1d1b20] border-b border-white/5 overflow-x-auto shrink-0" style={{ scrollbarWidth: "thin" }}>
                    {viewer.tabs.map((t) => {
                      const isActive = t.path === viewer.active;
                      return (
                        <div
                          key={t.path}
                          role="tab"
                          aria-selected={isActive}
                          data-file-tab={t.path}
                          title={t.path}
                          className={`group flex items-center gap-1.5 pl-3 pr-1.5 py-[7px] border-r border-white/5 cursor-pointer shrink-0 max-w-[220px] ${isActive ? "bg-[#141316] text-white border-t border-t-[#2dd4bf]" : "text-[#888] hover:text-[#ccc] border-t border-t-transparent"}`}
                          onClick={() => setViewer((prev) => (prev ? { ...prev, active: t.path } : prev))}
                        >
                          <FileText size={12} className={isActive ? "text-[#abefa3] shrink-0" : "text-[#666] shrink-0"} />
                          <span className="font-mono text-[11.5px] truncate">{t.path.split("/").pop()}</span>
                          <button
                            type="button"
                            aria-label={`Close ${t.path}`}
                            onClick={(e) => { e.stopPropagation(); closeTab(t.path); }}
                            className={`p-0.5 rounded hover:bg-white/10 transition-opacity ${isActive ? "opacity-70" : "opacity-0 group-hover:opacity-70"}`}
                          >
                            <X size={11} />
                          </button>
                        </div>
                      );
                    })}
                  </div>

                  {file && (
                    <div className="px-4 py-1.5 bg-[#17161a] border-b border-white/5 shrink-0">
                      <span data-testid="file-viewer-path" className="font-mono text-[11px] text-[#9a9aa2]">{file.path}</span>
                    </div>
                  )}

                  {file?.content != null ? (
                    <div data-testid="file-viewer-content" className="flex-1 min-h-0 overflow-auto bg-[#141316] py-2">
                      <table className="font-mono text-[12px] leading-[19px] border-collapse">
                        <tbody>
                          {lines.map((line, i) => (
                            <tr key={i}>
                              <td className="select-none text-right align-top pl-3 pr-3 text-[#4b4b4f] w-[1%] whitespace-nowrap">{i + 1}</td>
                              <td className="pr-4 text-[#d4d4d8] whitespace-pre">{line || " "}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div data-testid="file-viewer-missing" className="flex-1 min-h-0 grid place-items-center bg-[#141316] p-8">
                      <p className="max-w-[440px] text-center font-['Rounded_Mplus_1c',sans-serif] text-[13px] leading-relaxed text-[#9a9aa2]">{file?.note}</p>
                    </div>
                  )}
                  {file?.content != null && (
                    <div className="px-4 py-2 bg-[#1d1b20] border-t border-white/5 shrink-0 font-['Rounded_Mplus_1c',sans-serif] text-[10.5px] text-[#666] flex items-center justify-between gap-3">
                      <span className="truncate">{file.note}</span>
                      <span className="shrink-0 font-mono">{lines.length} lines</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </FileViewerContext.Provider>
  );
}

const SNAPSHOT_NOTE = "Snapshot of the real file in this workspace.";

function missingSourceNote(what: string): string {
  return `${what} isn't in the sources uploaded to this prototype yet, so there is nothing real to open.`;
}

/** Opens project/<name> from the snapshot (names match case-insensitively: Info.md → info.md). */
export function useOpenProjectFile(spec: WorkspaceSpec): (displayName: string) => void {
  const state = useWorkspaceBundle(workspaceBundleIdFor(spec.projectId));
  const open = useFileViewer();
  const limit = usePrototypeLimit();
  return (displayName: string) => {
    if (spec.projectId === NOT_HOTDOG) {
      limit(notHotdogLimit(`project/${displayName}`));
      return;
    }
    const wanted = `project/${displayName}`.toLowerCase();
    const hit = state.bundle?.files.find((f) => f.path.toLowerCase() === wanted);
    if (hit) open({ path: hit.path, content: hit.content, note: SNAPSHOT_NOTE }, spec);
    else
      open(
        {
          path: `project/${displayName}`,
          content: null,
          note: state.status === "loading" ? "Still loading this workspace's files. Try again in a moment." : missingSourceNote(`project/${displayName}`),
        },
        spec,
      );
  };
}

// ─── Explorer ───────────────────────────────────────────────────────────────

interface TreeNode {
  name: string;
  path: string;
  children?: TreeNode[];
  content?: string;
}

function buildTree(prefix: string, files: WorkspaceBundle["files"]): TreeNode[] {
  const root: TreeNode = { name: "", path: prefix, children: [] };
  for (const f of files) {
    if (!f.path.startsWith(`${prefix}/`)) continue;
    const parts = f.path.slice(prefix.length + 1).split("/");
    let node = root;
    parts.forEach((part, i) => {
      const path = `${node.path}/${part}`;
      if (i === parts.length - 1) {
        node.children!.push({ name: part, path, content: f.content });
        return;
      }
      let next = node.children!.find((c) => c.children && c.name === part);
      if (!next) {
        next = { name: part, path, children: [] };
        node.children!.push(next);
      }
      node = next;
    });
  }
  const sort = (n: TreeNode) => {
    n.children?.sort((a, b) => Number(Boolean(b.children)) - Number(Boolean(a.children)) || a.name.localeCompare(b.name));
    n.children?.forEach(sort);
  };
  sort(root);
  return root.children!;
}

const ROW = "flex gap-[6px] items-center py-[3px] pr-[8px] rounded-[6px] w-full text-left";
const LABEL = "font-['Rounded_Mplus_1c',sans-serif] text-[11px] truncate";

/** Workspace tree backed by the project's snapshot. Files open in the viewer as tabs. */
export function WorkspaceExplorer({ spec, activePath }: { spec: WorkspaceSpec; activePath?: string }) {
  const state = useWorkspaceBundle(workspaceBundleIdFor(spec.projectId));
  const openFile = useFileViewer();
  const limit = usePrototypeLimit();
  const isPlaceholder = spec.projectId === NOT_HOTDOG;
  const [open, setOpen] = useState<Set<string>>(() => new Set(spec.defaultOpen));
  const foldersKey = spec.folders.join("|");
  const trees = useMemo(() => {
    const files = state.bundle?.files ?? [];
    return new Map(spec.folders.map((f) => [f, buildTree(f, files)]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.bundle, foldersKey]);

  // Reveal the active file (viewer sidebar): open its top-level folder and every ancestor.
  useEffect(() => {
    if (!activePath) return;
    const top = spec.folders.find((f) => activePath.startsWith(`${f}/`));
    if (!top) return;
    const rest = activePath.slice(top.length + 1).split("/").slice(0, -1);
    setOpen((prev) => {
      const next = new Set(prev);
      let p = top;
      next.add(p);
      for (const part of rest) {
        p = `${p}/${part}`;
        next.add(p);
      }
      return next.size === prev.size ? prev : next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activePath, foldersKey]);

  const toggle = (path: string) => {
    if (isPlaceholder) {
      limit(notHotdogLimit("Explorer"));
      return;
    }
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  };

  const renderNode = (node: TreeNode, depth: number): ReactNode => {
    const pad = { paddingLeft: 8 + depth * 14 };
    if (!node.children) {
      const isActive = node.path === activePath;
      return (
        <button
          key={node.path}
          type="button"
          data-explorer-file={node.path}
          onClick={() => openFile({ path: node.path, content: node.content ?? "", note: SNAPSHOT_NOTE }, spec)}
          className={`${ROW} cursor-pointer ${isActive ? "bg-[#abefa3]/12" : "hover:bg-white/5"}`}
          style={pad}
          title={`Open ${node.path}`}
        >
          <span className="w-3 shrink-0" />
          <FileText size={12} className="shrink-0 text-[#7b9ab5]" />
          <span className={`${LABEL} ${isActive ? "text-[#abefa3]" : "text-[#c5c5c5]"}`}>{node.name}</span>
        </button>
      );
    }
    const isOpen = open.has(node.path);
    return (
      <div key={node.path}>
        <button type="button" data-explorer-folder={node.path} aria-expanded={isOpen} onClick={() => toggle(node.path)} className={`${ROW} hover:bg-white/5 cursor-pointer`} style={pad}>
          {isOpen ? <ChevronDown size={12} className="shrink-0 text-[#666]" /> : <ChevronRight size={12} className="shrink-0 text-[#666]" />}
          {isOpen ? <FolderOpen size={12} className="shrink-0 text-[#abefa3]/70" /> : <Folder size={12} className="shrink-0 text-[#abefa3]/70" />}
          <span className={`${LABEL} text-[#c5c5c5]`}>{node.name}</span>
        </button>
        {isOpen &&
          (node.children.length > 0 ? (
            node.children.map((c) => renderNode(c, depth + 1))
          ) : (
            <p className="py-[3px] pr-[8px] font-['Rounded_Mplus_1c',sans-serif] text-[10px] italic text-[#555]" style={{ paddingLeft: 8 + (depth + 1) * 14 + 18 }}>
              {state.status === "loading" ? "Loading…" : "No files uploaded to the prototype"}
            </p>
          ))}
      </div>
    );
  };

  return (
    <div data-workspace-explorer={spec.projectId} className="bg-[#252323] flex flex-1 flex-col p-[4px] min-h-0 overflow-y-auto" style={{ scrollbarWidth: "thin" }}>
      <div className={ROW} style={{ paddingLeft: 8 }}>
        <ChevronDown size={12} className="shrink-0 text-[#666]" />
        <FolderOpen size={12} className="shrink-0 text-[#abefa3]/70" />
        <span className={`${LABEL} text-[#c5c5c5]`}>{spec.rootName}</span>
      </div>
      {spec.folders.map((f) => renderNode({ name: f, path: f, children: trees.get(f) ?? [] }, 1))}
    </div>
  );
}
