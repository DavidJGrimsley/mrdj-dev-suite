import { useState, useRef, useEffect, useLayoutEffect, useCallback } from "react";
import { assetUrl } from "./assetUrl";
import { motion, AnimatePresence } from "motion/react";
import {
  Zap, Settings, GitBranch, ChevronDown, ChevronRight,
  FileText, Folder, FolderOpen, Plus, X, CheckCircle2, Circle,
  RefreshCw, Globe, Smartphone, Send, Play, Server, FlaskConical,
  GitCommit, GitPullRequest, Stethoscope, Rocket, PanelLeft,
  LayoutGrid, Pencil, Check, Wifi, WifiOff, GripVertical,
  Terminal, Bell, AlertTriangle, Maximize2, LayoutDashboard,
  Palette, Package, Search, ListTree, Clock, Minimize2,
  Monitor, ChevronUp, RotateCcw, Layers, Type, Minus,
  GitMerge, Bot, User, Hash, ExternalLink, Square, Infinity as InfinityIcon,
  CheckSquare, Sparkles,
  ArrowRight, ChevronLeft, Home, FileCode, Gamepad2,
} from "lucide-react";
import svgPaths from "../imports/Screen1Example1/svg-lhqtfjy16g";
import imgNoiseTexture from "../imports/PricingV1/fe0738ab884d18fb09eed928e386b48f21abaf10.png";
import FigmaInfieActionButton from "../imports/InfieActionButton";
import svgPathsOP4 from "../imports/OpenSession-1/svg-5sywzndumy";
import imgOP4 from "../imports/OpenSession-1/d9f2b29a94f507fec634bd88b7d6597b7dbe32af.png";
import svgPathsOS1 from "../imports/OpenSession-1/svg-5sywzndumy";
import { OnboardingProvider } from "./onboarding/OnboardingContext";
import { useOnboarding, LevelUpAnimationStage } from "./onboarding/onboardingContextDef";
import { LeekBeatsWidget } from "./onboarding/LeekBeatsWidget";
import { OnboardingStage } from "./onboarding/OnboardingStage";
import {
  BEAT_ORDER,
  OnboardingBeat,
  B14_AGENT_QUESTION,
  B14_AGENT_REPLY_DEFAULT,
  B17_EXPLANATIONS,
} from "./onboarding/revealLedger";
import {
  FloatingContinueButton,
  FloatingField,
  FloatingButton,
} from "./onboarding/FloatingPrimitives";
import { useInfieDance } from "./onboarding/infieDanceAnimation";
import { HomeConversationSlide } from "./onboarding/HomeConversationSlide";
import { SessionCompletionForm } from "./onboarding/SessionCompletionForm";
import {
  B18_GALLERY_OPEN_DELAY_MS,
  B12_PROJECTS_FADE_MS,
  ambientProgressForBeat,
} from "./onboarding/onboardingTiming";
import { PrototypeLimit } from "./components/PrototypeLimit";
import { SupportNewFrameworkModal } from "./components/SupportNewFrameworkModal";
import { JennyCreationScreen } from "../jenny/index.ts";
import {
  TutorialProvider,
  TutorialOverlay,
  useTutorial,
  ExactWebPreviewFrame,
  PreviewViewportControls,
  ProviderIcon,
  PROVIDER_ACCENT,
  PROVIDER_TOPIC,
  SESSION_TAB_LABEL,
  SESSION_TAB_ACCESSIBLE_LABEL,
  PLAN_COMPOSER_GHOST,
  PROVIDERS,
  PROVIDER_LABEL,
  SESSION_BRANCH,
  SESSION_GOAL,
  SESSION_NAME,
  SESSION_TAB_ORDER,
  areAllAgentTasksDone,
  countCompletedTasks,
  countProviderMessages,
  getPrimaryAction,
  getProgressivePlan,
  getSessionActions,
  getSessionComposerPlaceholder,
  type FlowMessage,
  type PrimaryActionKey,
  type ProviderId,
  type SessionFlowState,
  type SessionTabId,
  type TaskStatus,
} from "../tutorial/index.ts";

// ─── Types ─────────────────────────────────────────────────────────────────

type SessionPhase = "start" | "active" | "wrapup";
type ActiveScreen = "screen1" | "screen2";
interface Message { id: string; role: "user" | "assistant"; content: string; }
interface CheckItem { id: string; text: string; done: boolean; }
interface DiffFile { name: string; path: string; additions: number; deletions: number; status: "modified" | "added" | "deleted"; }
interface FileNode { name: string; kind: "file" | "folder"; active?: boolean; children?: FileNode[]; expanded?: boolean; }
type WorkspaceState = "none" | "loading" | "app-found" | "app-onboard" | "ws-found" | "ws-onboard";

type ProjectType = "expo" | "bare-rn" | "python" | "unreal" | "unity" | "uefn" | "godot" | "generic";

const PROJECT_TYPES: Array<
  | { kind: "option"; id: ProjectType; label: string; note?: string }
  | { kind: "separator"; label?: string }
  | { kind: "action"; id: "support-framework"; label: string }
> = [
  { kind: "option", id: "expo",    label: "Expo" },
  { kind: "option", id: "bare-rn", label: "Bare React Native" },
  { kind: "option", id: "python",  label: "Python Backend" },
  { kind: "separator", label: "Game Engines" },
  { kind: "option", id: "unreal",  label: "Unreal Engine",        note: "Requires connected editor" },
  { kind: "option", id: "unity",   label: "Unity",                note: "Requires connected editor" },
  { kind: "option", id: "uefn",    label: "UEFN (Fortnite Creative)", note: "Requires connected editor" },
  { kind: "option", id: "godot",   label: "Godot",                note: "Requires connected editor" },
  { kind: "separator" },
  { kind: "option", id: "generic", label: "Generic / Other" },
  { kind: "action", id: "support-framework", label: "Support new framework" },
];

const PROJECT_TYPE_LABELS: Record<ProjectType, string> = {
  expo: "Expo", "bare-rn": "Bare RN", python: "Python", unreal: "Unreal",
  unity: "Unity", uefn: "UEFN", godot: "Godot", generic: "Generic",
};

type WidgetId =
  | "explorer" | "projectFolder" | "currentGoal" | "agentTasks"
  | "humanTesting" | "git" | "widgets"
  | "terminal" | "eas" | "stylist" | "doctor" | "problems"
  | "extensions" | "timeline" | "search" | "outline"
  | "emuWeb" | "emuAndroid" | "emuIos" | "sessions" | "actions" | "library"
  | "globalTodo";
interface WidgetDef { id: WidgetId; label: string; icon: React.ReactNode; description: string; }

// ─── Constants ─────────────────────────────────────────────────────────────

const PHASE_LABEL: Record<SessionPhase, string> = { start: "Start", active: "Active", wrapup: "Wrap-Up" };
const PHASE_COLOR: Record<SessionPhase, string> = {
  start: "bg-[#abefa3] text-[#1d1b20]",
  active: "bg-blue-400 text-[#1d1b20]",
  wrapup: "bg-orange-400 text-[#1d1b20]",
};
type ActionButtonDef = { label: string; icon: React.ReactNode; accent?: boolean; cmd: string };
type ActionStage = "default" | "working" | "wrapup";

const ALL_WIDGETS: WidgetDef[] = [
  { id: "globalTodo", label: "Global To-Do",   icon: <CheckSquare size={14} />,    description: "Cross-project tasks & reminders" },
  { id: "terminal",   label: "Terminal",        icon: <Terminal size={14} />,       description: "Integrated shell" },
  { id: "eas",        label: "EAS Build",       icon: <Rocket size={14} />,         description: "Expo Application Services" },
  { id: "stylist",    label: "Stylist",         icon: <Palette size={14} />,        description: "AI style assistant" },
  { id: "doctor",     label: "Doctor",          icon: <Stethoscope size={14} />,    description: "mds doctor diagnostics" },
  { id: "problems",   label: "Problems",        icon: <AlertTriangle size={14} />,  description: "Errors & warnings" },
  { id: "extensions", label: "Extensions",      icon: <Package size={14} />,        description: "Manage extensions" },
  { id: "timeline",   label: "Timeline",        icon: <Clock size={14} />,          description: "File history" },
  { id: "search",     label: "Search",          icon: <Search size={14} />,         description: "Global search" },
  { id: "outline",    label: "Outline",         icon: <ListTree size={14} />,       description: "Symbol outline" },
  { id: "git",        label: "Git",             icon: <GitBranch size={14} />,      description: "Current diffs" },
  { id: "humanTesting", label: "Human Testing", icon: <User size={14} />,           description: "Test checklist" },
  { id: "emuWeb",     label: "Web Preview",     icon: <Globe size={14} />,          description: "Mobile web emulator" },
  { id: "emuAndroid", label: "Android",         icon: <Smartphone size={14} />,     description: "Android emulator" },
  { id: "emuIos",     label: "iOS",             icon: <Smartphone size={14} />,     description: "iOS simulator" },
  { id: "sessions",   label: "Sessions",        icon: <LayoutDashboard size={14} />, description: "All sessions across workspaces" },
  { id: "actions",    label: "Actions",         icon: <Zap size={14} />,             description: "MDS & Expo/EAS quick actions" },
  { id: "library", label: "Library",      icon: <Layers size={14} />,          description: "Design resource library" },
];

const INIT_MESSAGES: Message[] = [
  { id: "1", role: "assistant", content: "Session started. Project: `expo-photo-share` · Goal: Add photo-sharing feature. `mds doctor` passed all checks. Ready." },
];
const INIT_AGENT_TASKS: CheckItem[] = [
  { id: "a1", text: "Implement PhotoPicker component", done: true },
  { id: "a2", text: "Wire up usePhotoShare hook", done: true },
  { id: "a3", text: "Add friend list query to Supabase", done: false },
  { id: "a4", text: "Handle photo library permissions", done: false },
  { id: "a5", text: "Compress images before upload", done: false },
];
const INIT_HUMAN_TESTS: CheckItem[] = [
  { id: "h1", text: "Photo picker opens on iOS and Android", done: false },
  { id: "h2", text: "Dark mode renders correctly on iOS", done: false },
  { id: "h3", text: "Send button disabled with no photo selected", done: true },
  { id: "h4", text: "Friend list loads from Supabase", done: false },
];
const INIT_DIFFS: DiffFile[] = [
  { name: "camera.tsx",       path: "src/app/(tabs)/camera.tsx",      additions: 84,  deletions: 12, status: "modified" },
  { name: "PhotoPicker.tsx",  path: "src/components/PhotoPicker.tsx", additions: 142, deletions: 0,  status: "added" },
  { name: "FriendList.tsx",   path: "src/components/FriendList.tsx",  additions: 67,  deletions: 5,  status: "modified" },
  { name: "usePhotoShare.ts", path: "src/hooks/usePhotoShare.ts",     additions: 38,  deletions: 0,  status: "added" },
  { name: "package.json",     path: "package.json",                   additions: 3,   deletions: 1,  status: "modified" },
];
const BRANCH_DIFFS: DiffFile[] = [
  { name: "camera.tsx",       path: "src/app/(tabs)/camera.tsx",      additions: 84,  deletions: 12, status: "modified" },
  { name: "PhotoPicker.tsx",  path: "src/components/PhotoPicker.tsx", additions: 142, deletions: 0,  status: "added" },
  { name: "FriendList.tsx",   path: "src/components/FriendList.tsx",  additions: 67,  deletions: 5,  status: "modified" },
  { name: "usePhotoShare.ts", path: "src/hooks/usePhotoShare.ts",     additions: 38,  deletions: 0,  status: "added" },
  { name: "package.json",     path: "package.json",                   additions: 3,   deletions: 1,  status: "modified" },
  { name: "app.json",         path: "app.json",                       additions: 2,   deletions: 0,  status: "modified" },
  { name: "Guidelines.md",    path: "project/Guidelines.md",          additions: 18,  deletions: 4,  status: "modified" },
];
const WORKSPACE_TREE: FileNode[] = [
  { name: "expo-photo-share", kind: "folder", expanded: true, children: [
    { name: "src", kind: "folder", expanded: true, children: [
      { name: "app", kind: "folder", expanded: true, children: [
        { name: "(tabs)", kind: "folder", expanded: false, children: [
          { name: "index.tsx", kind: "file" },
          { name: "camera.tsx", kind: "file", active: true },
          { name: "profile.tsx", kind: "file" },
        ]},
        { name: "_layout.tsx", kind: "file" },
      ]},
      { name: "components", kind: "folder", expanded: false, children: [
        { name: "PhotoPicker.tsx", kind: "file" },
        { name: "FriendList.tsx", kind: "file" },
      ]},
      { name: "hooks", kind: "folder", expanded: false, children: [
        { name: "usePhotoShare.ts", kind: "file" },
      ]},
    ]},
    { name: "project", kind: "folder", expanded: false, children: [
      { name: "Info.md", kind: "file" }, { name: "Todo.md", kind: "file" },
      { name: "Style.md", kind: "file" }, { name: "Guidelines.md", kind: "file" },
    ]},
    { name: "package.json", kind: "file" },
    { name: "app.json", kind: "file" },
    { name: "tsconfig.json", kind: "file" },
  ]},
];

const ANDROID_DEVICES = ["Pixel 7", "Pixel 7 Pro", "Galaxy S23", "Galaxy S23 Ultra", "Pixel 6a", "OnePlus 11"];
const IOS_DEVICES = ["iPhone 15 Pro", "iPhone 15", "iPhone 14 Pro", "iPhone SE (3rd gen)", "iPhone 13 mini", "iPad Pro 12.9\""];

function uid() { return Math.random().toString(36).slice(2); }

// ─── Global To-Do Types and Initial State ────────────────────────────────────

interface GlobalTodoItem {
  id: string;
  text: string;
  done: boolean;
  category: "project" | "general";
  projectId?: string;
  projectName?: string;
  sessionId?: string;
}

const INIT_GLOBAL_TODOS: GlobalTodoItem[] = [
  // Active Projects: Pet Show and Tell
  { id: "gt-1", text: "Implement PhotoPicker component", done: true, category: "project", projectId: "pet", projectName: "Pet Show and Tell", sessionId: "add-comments" },
  { id: "gt-2", text: "Add friend list query to Supabase", done: false, category: "project", projectId: "pet", projectName: "Pet Show and Tell", sessionId: "add-comments" },
  { id: "gt-3", text: "Handle photo library permissions", done: false, category: "project", projectId: "pet", projectName: "Pet Show and Tell", sessionId: "add-comments" },
  { id: "gt-4", text: "Compress images before upload", done: false, category: "project", projectId: "pet", projectName: "Pet Show and Tell", sessionId: "add-comments" },

  // Active Projects: Not Hotdog
  { id: "gt-5", text: "Add edge-case image examples to test set", done: false, category: "project", projectId: "nothotdog", projectName: "Not Hotdog", sessionId: "not-hotdog" },
  { id: "gt-6", text: "Retrain confidence score classifier", done: false, category: "project", projectId: "nothotdog", projectName: "Not Hotdog", sessionId: "not-hotdog" },

  // General / Ecosystem & Dev Ops
  { id: "gt-7", text: "Update SSL certificates on MyWebsite.com", done: false, category: "general" },
  { id: "gt-8", text: "Renew Apple Developer distribution certificates", done: false, category: "general" },
  { id: "gt-9", text: "Configure Sentry alerts for production crashes", done: false, category: "general" },
  { id: "gt-10", text: "Audit Supabase row level security policies", done: true, category: "general" },
];

const INFIE_HERO_SRC = assetUrl("/assets/infie-form-mist.png");

function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
  }, []);
  return reduced;
}

// ─── Shared: Diff file row ──────────────────────────────────────────────────

function DiffRow({ f }: { f: DiffFile }) {
  return (
    <div className="flex items-center gap-2 px-3 py-1.5 border-b border-white/4 last:border-0 hover:bg-white/3 transition-colors cursor-pointer">
      <span className={`text-[9px] font-mono font-bold w-3 shrink-0 ${f.status === "added" ? "text-[#abefa3]" : f.status === "deleted" ? "text-red-400" : "text-orange-400"}`}>
        {f.status === "added" ? "A" : f.status === "deleted" ? "D" : "M"}
      </span>
      <FileText size={11} className="text-[#7b9ab5] shrink-0" />
      <span className="flex-1 font-['Rounded_Mplus_1c',sans-serif] text-[11px] text-[#c5c5c5] truncate">{f.name}</span>
      <span className="font-mono text-[9px] text-[#abefa3]">+{f.additions}</span>
      {f.deletions > 0 && <span className="font-mono text-[9px] text-red-400">-{f.deletions}</span>}
    </div>
  );
}

// ─── Shared: Checklist ─────────────────────────────────────────────────────

function Checklist({ items, onToggle, onAdd, onDelete }: {
  items: CheckItem[]; onToggle: (id: string) => void; onAdd: (t: string) => void; onDelete: (id: string) => void;
}) {
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState("");
  return (
    <div className="flex flex-col">
      {items.map(item => (
        <div key={item.id} className="flex items-start gap-2 px-3 py-2 border-b border-white/5 last:border-0 group hover:bg-white/3 transition-colors">
          <button onClick={() => onToggle(item.id)} className="mt-0.5 shrink-0">
            {item.done ? <CheckCircle2 size={13} className="text-[#abefa3]" /> : <Circle size={13} className="text-[#555] hover:text-[#abefa3] transition-colors" />}
          </button>
          <span className={`flex-1 font-['Rounded_Mplus_1c',sans-serif] text-[11px] leading-relaxed ${item.done ? "line-through text-[#555]" : "text-[#c5c5c5]"}`}>{item.text}</span>
          <button onClick={() => onDelete(item.id)} className="opacity-0 group-hover:opacity-100 text-[#555] hover:text-[#c5c5c5] transition-all shrink-0"><X size={10} /></button>
        </div>
      ))}
      {adding && (
        <div className="flex items-center gap-2 px-3 py-2 border-t border-white/5">
          <Circle size={13} className="text-[#555] shrink-0" />
          <input autoFocus value={draft} onChange={e => setDraft(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") { if (draft.trim()) onAdd(draft.trim()); setDraft(""); setAdding(false); } if (e.key === "Escape") setAdding(false); }}
            onBlur={() => { if (draft.trim()) onAdd(draft.trim()); setAdding(false); }}
            placeholder="New item..." className="flex-1 bg-transparent text-[11px] font-['Rounded_Mplus_1c',sans-serif] text-white placeholder-[#444] border-none outline-none" />
        </div>
      )}
      <div className="px-3 py-1.5 border-t border-white/5">
        <button onClick={() => setAdding(true)} className="flex items-center gap-1 text-[10px] font-['Rounded_Mplus_1c',sans-serif] text-[#444] hover:text-[#abefa3] transition-colors">
          <Plus size={10} /> Add item
        </button>
      </div>
    </div>
  );
}

// ─── Full widget content (used in modals AND inline where rich) ─────────────

function ExplorerContent({ tree }: { tree: FileNode[] }) {
  function FileRow({ node, depth }: { node: FileNode; depth: number }) {
    return (
      <>
        <div className={`flex items-center gap-1.5 py-[3px] pr-2 cursor-pointer transition-colors rounded-sm group ${node.active ? "bg-[#abefa3]/12 text-[#abefa3]" : "text-[#c5c5c5] hover:text-white hover:bg-white/5"}`} style={{ paddingLeft: `${8 + depth * 14}px` }}>
          {node.kind === "folder" ? (node.expanded ? <><ChevronDown size={12} className="shrink-0 text-[#666]" /><FolderOpen size={13} className="shrink-0 text-[#abefa3]/70" /></> : <><ChevronRight size={12} className="shrink-0 text-[#666]" /><Folder size={13} className="shrink-0 text-[#abefa3]/70" /></>) : (<><span className="w-3 shrink-0" /><FileText size={13} className="shrink-0 text-[#7b9ab5]" /></>)}
          <span className="font-['Rounded_Mplus_1c',sans-serif] text-[11px] truncate">{node.name}</span>
          {node.active && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-[#abefa3] shrink-0" />}
        </div>
        {node.kind === "folder" && node.expanded && node.children?.map((c, i) => <FileRow key={i} node={c} depth={depth + 1} />)}
      </>
    );
  }
  return <div className="py-1 px-1 overflow-auto h-full">{tree.map((n, i) => <FileRow key={i} node={n} depth={0} />)}</div>;
}

function ProjectFolderContent() {
  const files = [
    { name: "Info.md", desc: "App purpose, tech stack, deployment info" },
    { name: "Todo.md", desc: "Backlog, current sprint, done items" },
    { name: "Style.md", desc: "Colors, typography, visual rules" },
    { name: "Guidelines.md", desc: "Agent rules, patterns, constraints" },
  ];
  return (
    <div className="flex flex-col h-full overflow-auto">
      {files.map(f => (
        <div key={f.name} className="flex items-start gap-3 px-4 py-3 border-b border-white/5 hover:bg-white/3 transition-colors cursor-pointer group">
          <FileText size={14} className="text-[#abefa3]/60 shrink-0 mt-0.5" />
          <div>
            <p className="font-['Rounded_Mplus_1c',sans-serif] text-[13px] text-white">{f.name}</p>
            <p className="font-['Rounded_Mplus_1c',sans-serif] text-[11px] text-[#555] mt-0.5">{f.desc}</p>
          </div>
          <ExternalLink size={12} className="text-[#444] group-hover:text-[#abefa3] transition-colors ml-auto mt-0.5 shrink-0" />
        </div>
      ))}
    </div>
  );
}

// ─── Stylist widget (modelled after the real StylistScreen) ────────────────

type StylistPaletteKey = "background" | "surface" | "text" | "primary" | "secondary" | "success" | "warning";
type StylistInputMode = "picker" | "families";

const TAILWIND_FAMILIES = [
  "slate","gray","zinc","neutral","stone","red","orange","amber",
  "yellow","lime","green","emerald","teal","cyan","sky","blue",
  "indigo","violet","purple","fuchsia","pink","rose",
];

const TAILWIND_FAMILY_SAMPLES: Record<string, string> = {
  slate:"#64748b", gray:"#6b7280", zinc:"#71717a", neutral:"#737373",
  stone:"#78716c", red:"#ef4444", orange:"#f97316", amber:"#f59e0b",
  yellow:"#eab308", lime:"#84cc16", green:"#22c55e", emerald:"#10b981",
  teal:"#14b8a6", cyan:"#06b6d4", sky:"#0ea5e9", blue:"#3b82f6",
  indigo:"#6366f1", violet:"#8b5cf6", purple:"#a855f7", fuchsia:"#d946ef",
  pink:"#ec4899", rose:"#f43f5e",
};

const INIT_PALETTE: Record<StylistPaletteKey, string> = {
  background: "#3d3b3b", surface: "#252323", text: "#e0e0e0",
  primary: "#abefa3", secondary: "#7b9ab5", success: "#34d399",
  warning: "#fbbf24",
};

const FONT_ROLES = [
  { key: "display",  label: "Display",  sample: "Photo Share",                         size: 22, weight: 800 },
  { key: "title",    label: "Title",    sample: "Add photos to friends",                size: 17, weight: 700 },
  { key: "subtitle", label: "Subtitle", sample: "Subtitle for cards and hero text",     size: 14, weight: 600 },
  { key: "body",     label: "Body",     sample: "Readable body copy for product screens.", size: 13, weight: 400 },
  { key: "caption",  label: "Caption",  sample: "Caption and metadata text",            size: 11, weight: 400 },
  { key: "mono",     label: "Mono",     sample: "usePhotoShare · camera.tsx:42",        size: 11, weight: 400, mono: true },
] as const;

function contrastFor(hex: string): string {
  const r = parseInt(hex.slice(1,3),16), g = parseInt(hex.slice(3,5),16), b = parseInt(hex.slice(5,7),16);
  return (0.299*r + 0.587*g + 0.114*b) > 140 ? "#111827" : "#ffffff";
}

function StylistContent() {
  const [palette, setPalette] = useState<Record<StylistPaletteKey, string>>(INIT_PALETTE);
  const [selected, setSelected] = useState<StylistPaletteKey>("primary");
  const [inputMode, setInputMode] = useState<StylistInputMode>("picker");
  const [hexDraft, setHexDraft] = useState(INIT_PALETTE.primary);
  const [fontFamily, setFontFamily] = useState("Rounded Mplus 1c");
  const [saved, setSaved] = useState(false);

  const selectedHex = palette[selected];

  const applyHex = (raw: string) => {
    const clean = "#" + raw.replace(/[^0-9a-fA-F]/g,"").slice(0,6).toLowerCase();
    if (clean.length === 7) {
      setPalette(p => ({ ...p, [selected]: clean }));
    }
  };

  const applyFamily = (family: string) => {
    const hex = TAILWIND_FAMILY_SAMPLES[family] ?? "#3b82f6";
    setPalette(p => ({ ...p, [selected]: hex }));
    setHexDraft(hex);
  };

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="flex flex-col h-full bg-[#1a1a1a] overflow-auto">

      {/* ── Colors section ── */}
      <div className="px-4 pt-4 pb-3 border-b border-white/5">
        <div className="flex items-center justify-between mb-3">
          <p className="font-['Rounded_Mplus_1c',sans-serif] text-[11px] text-white font-medium">Colors</p>
          <div className="flex items-center gap-0.5 bg-[#0d0d0d] rounded-[5px] p-0.5">
            {(["picker","families"] as StylistInputMode[]).map(m => (
              <button key={m} onClick={() => setInputMode(m)}
                className={`px-2.5 py-1 rounded text-[10px] font-['Rounded_Mplus_1c',sans-serif] transition-colors ${inputMode === m ? "bg-[#252323] text-white" : "text-[#555] hover:text-[#888]"}`}>
                {m === "picker" ? "Hex Picker" : "Tailwind Families"}
              </button>
            ))}
          </div>
        </div>

        {/* Palette chips */}
        <div className="flex flex-wrap gap-1.5 mb-3">
          {(Object.keys(palette) as StylistPaletteKey[]).map(key => {
            const isSelected = selected === key;
            return (
              <button key={key} onClick={() => { setSelected(key); setHexDraft(palette[key]); }}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-[5px] border transition-all text-[10px] font-['Rounded_Mplus_1c',sans-serif]`}
                style={{
                  backgroundColor: palette[key],
                  color: contrastFor(palette[key]),
                  borderColor: isSelected ? "#ffffff" : "transparent",
                  boxShadow: isSelected ? "0 0 0 2px rgba(255,255,255,0.3)" : "none",
                }}>
                {key}
              </button>
            );
          })}
        </div>

        {/* Input area */}
        {inputMode === "picker" ? (
          <div className="flex flex-col gap-2">
            {/* Big color preview + hex input */}
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-[8px] border border-white/10 shrink-0" style={{ background: selectedHex }} />
              <div className="flex-1">
                <p className="font-['Rounded_Mplus_1c',sans-serif] text-[10px] text-[#555] mb-1">{selected} · hex</p>
                <div className="flex items-center gap-2">
                  <input
                    value={hexDraft}
                    onChange={e => { setHexDraft(e.target.value); applyHex(e.target.value); }}
                    onBlur={() => setHexDraft(palette[selected])}
                    maxLength={7}
                    className="flex-1 bg-[#252323] border border-white/10 rounded-[5px] px-2 py-1.5 text-[12px] font-mono text-white focus:outline-none focus:border-[#abefa3]/40 transition-colors"
                    placeholder="#rrggbb"
                  />
                </div>
              </div>
            </div>
            {/* Quick swatches */}
            <div className="flex flex-wrap gap-1">
              {["#abefa3","#3b82f6","#f43f5e","#f97316","#8b5cf6","#06b6d4","#10b981","#fbbf24","#e0e0e0","#666666","#1d1b20","#252323"].map(sw => (
                <button key={sw} onClick={() => { setPalette(p => ({ ...p, [selected]: sw })); setHexDraft(sw); }}
                  className="w-6 h-6 rounded-[4px] border transition-all hover:scale-110"
                  style={{ background: sw, borderColor: palette[selected] === sw ? "#fff" : "transparent" }}
                />
              ))}
            </div>
          </div>
        ) : (
          /* Tailwind families grid */
          <div className="flex flex-wrap gap-1.5">
            {TAILWIND_FAMILIES.map(fam => {
              const famHex = TAILWIND_FAMILY_SAMPLES[fam] ?? "#555";
              const isActive = palette[selected] === famHex;
              return (
                <button key={fam} onClick={() => applyFamily(fam)}
                  className={`px-2 py-1 rounded-[4px] text-[10px] font-['Rounded_Mplus_1c',sans-serif] border transition-all ${isActive ? "border-white/60" : "border-transparent hover:border-white/20"}`}
                  style={{ background: famHex, color: contrastFor(famHex) }}>
                  {fam}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Live preview card ── */}
      <div className="px-4 py-3 border-b border-white/5">
        <p className="font-['Rounded_Mplus_1c',sans-serif] text-[10px] text-[#555] uppercase tracking-widest mb-2">Preview</p>
        <div className="rounded-[8px] p-4 flex flex-col gap-2 border"
          style={{ background: palette.surface, borderColor: palette.primary }}>
          <p style={{ color: palette.text, fontFamily: `'${fontFamily}',sans-serif`, fontSize: 20, fontWeight: 800, lineHeight: 1.2 }}>Display headline</p>
          <p style={{ color: palette.text, fontFamily: `'${fontFamily}',sans-serif`, fontSize: 15, fontWeight: 700 }}>Section heading</p>
          <p style={{ color: palette.text, fontFamily: `'${fontFamily}',sans-serif`, fontSize: 13 }}>Readable body copy for product screens, onboarding, and settings.</p>
          <p style={{ color: palette.text, fontFamily: "monospace", fontSize: 11, background: palette.background, padding: "4px 8px", borderRadius: 6 }}>{"const theme = 'applied';"}</p>
          <div className="flex gap-2 flex-wrap mt-1">
            {(["primary","secondary","success","warning"] as const).map(k => (
              <span key={k} className="px-2.5 py-1 rounded-full text-[10px] font-['Rounded_Mplus_1c',sans-serif]"
                style={{ background: palette[k], color: contrastFor(palette[k]) }}>
                {k}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* ── Typography section ── */}
      <div className="px-4 py-3 border-b border-white/5">
        <div className="flex items-center justify-between mb-3">
          <p className="font-['Rounded_Mplus_1c',sans-serif] text-[11px] text-white font-medium">Typography</p>
        </div>
        <div className="flex flex-col gap-1 mb-3">
          <p className="font-['Rounded_Mplus_1c',sans-serif] text-[10px] text-[#555] mb-1">Font family (all roles)</p>
          <input value={fontFamily} onChange={e => setFontFamily(e.target.value)}
            className="bg-[#252323] border border-white/10 rounded-[5px] px-2 py-1.5 text-[12px] font-['Rounded_Mplus_1c',sans-serif] text-white focus:outline-none focus:border-[#abefa3]/40 transition-colors"
            placeholder="e.g. Inter, Nunito, Poppins"
          />
        </div>
        <div className="flex flex-col gap-2">
          {FONT_ROLES.map(role => (
            <div key={role.key} className="flex items-baseline gap-3 border-b border-white/5 pb-2 last:border-0">
              <span className="font-['Rounded_Mplus_1c',sans-serif] text-[9px] text-[#555] w-12 shrink-0 uppercase tracking-wide">{role.label}</span>
              <span style={{ fontFamily: role.mono ? "monospace" : `'${fontFamily}',sans-serif`, fontSize: role.size, fontWeight: role.weight, color: "#c5c5c5", lineHeight: 1.3 }}>
                {role.sample}
              </span>
              <span className="font-mono text-[9px] text-[#444] ml-auto shrink-0">{role.size}px</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Spacing / radius tokens ── */}
      <div className="px-4 py-3">
        <p className="font-['Rounded_Mplus_1c',sans-serif] text-[11px] text-white font-medium mb-3">Layout Tokens</p>
        <div className="grid grid-cols-2 gap-2">
          {[
            { k: "border-radius", v: "6 / 10 / full" },
            { k: "border-width", v: "1px rgba(255,255,255,.08)" },
            { k: "spacing-sm", v: "8px" },
            { k: "spacing-md", v: "16px" },
          ].map(r => (
            <div key={r.k} className="bg-[#252323] rounded-[5px] p-2.5 border border-white/5">
              <p className="font-mono text-[9px] text-[#abefa3]">{r.k}</p>
              <p className="font-['Rounded_Mplus_1c',sans-serif] text-[10px] text-[#777] mt-0.5">{r.v}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Save banner ── */}
      <div className="px-4 pb-4 mt-auto shrink-0">
        <button onClick={handleSave}
          className="w-full py-2.5 rounded-[8px] text-[13px] font-['Rounded_Mplus_1c',sans-serif] transition-all hover:opacity-90 active:scale-[0.98]"
          style={{ background: saved ? "#34d399" : palette.primary, color: contrastFor(saved ? "#34d399" : palette.primary) }}>
          {saved ? "✓ Theme saved to project/style.md" : "Save Theme"}
        </button>
      </div>
    </div>
  );
}

function ExtensionsContent() {
  const [installed] = useState([
    { name: "Expo Tools", publisher: "expo", version: "1.4.2", enabled: true, desc: "Expo SDK integration, eas.json support" },
    { name: "TypeScript", publisher: "microsoft", version: "5.3.3", enabled: true, desc: "TypeScript language support" },
    { name: "ESLint", publisher: "dbaeumer", version: "2.4.4", enabled: true, desc: "Integrates ESLint into the IDE" },
    { name: "Prettier", publisher: "esbenp", version: "10.1.0", enabled: true, desc: "Code formatter using prettier" },
    { name: "GitLens", publisher: "eamodio", version: "14.9.0", enabled: true, desc: "Git supercharged — blame, history, lens" },
    { name: "Tailwind CSS IntelliSense", publisher: "bradlc", version: "0.10.5", enabled: false, desc: "Autocomplete, linting, hover previews" },
    { name: "React Native Tools", publisher: "msjsdiag", version: "1.12.2", enabled: true, desc: "Debugging & IntelliSense for RN" },
    { name: "Error Lens", publisher: "usernamehw", version: "3.16.0", enabled: true, desc: "Inline error/warning display" },
  ]);
  const [query, setQuery] = useState("");
  const filtered = installed.filter(e => e.name.toLowerCase().includes(query.toLowerCase()));
  return (
    <div className="flex flex-col h-full bg-[#1a1a1a]">
      <div className="px-3 py-2 border-b border-white/5 shrink-0">
        <div className="flex items-center gap-2 bg-[#252323] rounded-[5px] px-2 py-1.5 border border-white/6">
          <Search size={12} className="text-[#555]" />
          <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search extensions..." className="flex-1 bg-transparent text-[12px] font-['Rounded_Mplus_1c',sans-serif] text-white placeholder-[#444] border-none outline-none" />
        </div>
      </div>
      <div className="flex-1 overflow-auto">
        <div className="px-3 py-1.5">
          <p className="font-['Rounded_Mplus_1c',sans-serif] text-[10px] text-[#555] uppercase tracking-wider">Installed ({filtered.length})</p>
        </div>
        {filtered.map(ext => (
          <div key={ext.name} className="flex items-start gap-3 px-3 py-2.5 border-b border-white/5 hover:bg-white/3 transition-colors group">
            <div className="w-8 h-8 rounded-[5px] bg-[#252323] border border-white/8 flex items-center justify-center shrink-0">
              <Package size={14} className="text-[#abefa3]/60" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-['Rounded_Mplus_1c',sans-serif] text-[12px] text-white">{ext.name}</span>
                <span className="font-mono text-[9px] text-[#444]">v{ext.version}</span>
              </div>
              <p className="font-['Rounded_Mplus_1c',sans-serif] text-[10px] text-[#555] mt-0.5 truncate">{ext.desc}</p>
              <p className="font-['Rounded_Mplus_1c',sans-serif] text-[10px] text-[#444]">{ext.publisher}</p>
            </div>
            <div className={`w-1.5 h-1.5 rounded-full mt-2 shrink-0 ${ext.enabled ? "bg-[#abefa3]" : "bg-[#444]"}`} />
          </div>
        ))}
      </div>
    </div>
  );
}

function TimelineContent() {
  const entries = [
    { time: "2 min ago",  kind: "save",   label: "camera.tsx saved",           detail: "84 lines changed" },
    { time: "4 min ago",  kind: "save",   label: "PhotoPicker.tsx saved",       detail: "142 lines added" },
    { time: "6 min ago",  kind: "save",   label: "usePhotoShare.ts saved",      detail: "38 lines added" },
    { time: "11 min ago", kind: "git",    label: "feat: scaffold photo hook",   detail: "git commit" },
    { time: "18 min ago", kind: "save",   label: "FriendList.tsx saved",        detail: "67 lines changed" },
    { time: "22 min ago", kind: "git",    label: "feat: add FriendList",        detail: "git commit" },
    { time: "31 min ago", kind: "save",   label: "package.json saved",          detail: "expo-image-picker added" },
    { time: "35 min ago", kind: "git",    label: "chore: add expo-image-picker","detail": "git commit" },
    { time: "1h ago",     kind: "git",    label: "feat: start photo-share branch", detail: "git commit" },
    { time: "1h ago",     kind: "session",label: "Session started",             detail: "mds doctor passed" },
  ];
  return (
    <div className="flex flex-col h-full bg-[#1a1a1a] overflow-auto">
      {entries.map((e, i) => (
        <div key={i} className="flex items-start gap-3 px-4 py-2.5 border-b border-white/4 last:border-0 hover:bg-white/3 transition-colors cursor-pointer">
          <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${e.kind === "git" ? "bg-[#abefa3]/10 border border-[#abefa3]/20" : e.kind === "session" ? "bg-blue-400/10 border border-blue-400/20" : "bg-white/5 border border-white/8"}`}>
            {e.kind === "git" ? <GitCommit size={11} className="text-[#abefa3]" /> : e.kind === "session" ? <Zap size={11} className="text-blue-400" /> : <FileText size={11} className="text-[#666]" />}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-['Rounded_Mplus_1c',sans-serif] text-[12px] text-[#c5c5c5] truncate">{e.label}</p>
            <p className="font-['Rounded_Mplus_1c',sans-serif] text-[10px] text-[#555] mt-0.5">{e.detail}</p>
          </div>
          <span className="font-mono text-[10px] text-[#444] shrink-0">{e.time}</span>
        </div>
      ))}
    </div>
  );
}

function SearchContent() {
  const [query, setQuery] = useState("usePhotoShare");
  const results = [
    { file: "usePhotoShare.ts", line: 1,  preview: "export function usePhotoShare() {" },
    { file: "camera.tsx",       line: 8,  preview: "import { usePhotoShare } from '../hooks/usePhotoShare';" },
    { file: "camera.tsx",       line: 42, preview: "  const { pickPhoto, sharePhoto } = usePhotoShare();" },
    { file: "FriendList.tsx",   line: 23, preview: "  // usePhotoShare handles upload state" },
  ];
  return (
    <div className="flex flex-col h-full bg-[#1a1a1a]">
      <div className="px-3 py-3 border-b border-white/5 shrink-0 flex flex-col gap-2">
        <div className="flex items-center gap-2 bg-[#252323] rounded-[5px] px-2 py-1.5 border border-white/6 focus-within:border-[#abefa3]/30 transition-colors">
          <Search size={12} className="text-[#555]" />
          <input value={query} onChange={e => setQuery(e.target.value)} className="flex-1 bg-transparent text-[12px] font-['Rounded_Mplus_1c',sans-serif] text-white border-none outline-none" />
        </div>
        <div className="flex items-center gap-2">
          <span className="font-['Rounded_Mplus_1c',sans-serif] text-[10px] text-[#555]">{results.length} results in {[...new Set(results.map(r => r.file))].length} files</span>
        </div>
      </div>
      <div className="flex-1 overflow-auto">
        {[...new Set(results.map(r => r.file))].map(file => (
          <div key={file}>
            <div className="flex items-center gap-2 px-3 py-1.5 bg-[#252323]/50 border-b border-white/5 sticky top-0">
              <FileText size={11} className="text-[#7b9ab5]" />
              <span className="font-['Rounded_Mplus_1c',sans-serif] text-[11px] text-[#c5c5c5]">{file}</span>
              <span className="font-mono text-[9px] text-[#444] ml-auto">{results.filter(r => r.file === file).length} matches</span>
            </div>
            {results.filter(r => r.file === file).map((r, i) => (
              <div key={i} className="flex items-start gap-3 px-4 py-1.5 hover:bg-white/3 transition-colors cursor-pointer">
                <span className="font-mono text-[10px] text-[#444] w-6 shrink-0 text-right">{r.line}</span>
                <p className="font-mono text-[11px] text-[#888] truncate">
                  {r.preview.replace(query, `##${query}##`).split("##").map((part, j) =>
                    part === query ? <mark key={j} className="bg-[#abefa3]/25 text-[#abefa3] rounded-sm not-italic">{part}</mark> : part
                  )}
                </p>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function TerminalContent() {
  const [activeTab, setActiveTab] = useState(0);
  const tabs = [
    { label: "(Agent)", path: "~/expo-photo-share", isAgent: true },
    { label: "", path: "~/expo-photo-share", isAgent: false },
    { label: "", path: "~/expo-photo-share", isAgent: false },
  ];
  const outputs: Record<number, { text: string; color?: string }[]> = {
    0: [
      { text: "$ npx expo start --clear", color: "#abefa3" },
      { text: "Starting Metro Bundler..." },
      { text: "Metro waiting on exp://192.168.1.10:8081" },
      { text: "› Press a │ open Android" },
      { text: "› Press i │ open iOS simulator" },
      { text: "› Press w │ open web", color: "#666" },
      { text: "" },
      { text: "$ mds doctor", color: "#abefa3" },
      { text: "✓ Project memory files present", color: "#abefa3" },
      { text: "✓ package.json scripts valid", color: "#abefa3" },
      { text: "✗ Missing expo.scheme in app.json", color: "#f87171" },
      { text: "▌", color: "#abefa3" },
    ],
    1: [
      { text: "$ git status", color: "#abefa3" },
      { text: "On branch feature/photo-share" },
      { text: "Changes not staged for commit:" },
      { text: "  modified:   src/app/(tabs)/camera.tsx", color: "#fbbf24" },
      { text: "  modified:   src/components/FriendList.tsx", color: "#fbbf24" },
      { text: "Untracked files:" },
      { text: "  src/components/PhotoPicker.tsx", color: "#abefa3" },
      { text: "  src/hooks/usePhotoShare.ts", color: "#abefa3" },
      { text: "▌", color: "#abefa3" },
    ],
    2: [
      { text: "$ npx expo start", color: "#abefa3" },
      { text: "Starting Metro Bundler on port 8081..." },
      { text: "iOS Bundling complete 1842ms" },
      { text: "Android Bundling complete 2104ms" },
      { text: "▌", color: "#abefa3" },
    ],
  };
  return (
    <div className="flex flex-col h-full bg-[#0d0d0d]">
      <div className="flex items-center border-b border-white/8 shrink-0 bg-[#111]">
        {tabs.map((t, i) => (
          <button key={i} onClick={() => setActiveTab(i)}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-mono border-r border-white/5 transition-colors ${activeTab === i ? "bg-[#0d0d0d] text-[#abefa3]" : "text-[#444] hover:text-[#888]"}`}>
            {t.isAgent && <Bot size={10} className="text-[#abefa3]" />}
            <span>{t.isAgent ? `(Agent) ${t.path}` : t.path}</span>
          </button>
        ))}
        <button className="ml-auto px-2 py-1.5 text-[#444] hover:text-[#888] transition-colors"><Plus size={12} /></button>
      </div>
      <div className="flex-1 overflow-auto p-3 space-y-0.5">
        {(outputs[activeTab] || []).map((line, i) => (
          <div key={i} className="font-mono text-[11px] leading-relaxed" style={{ color: line.color || "#c5c5c5" }}>{line.text}</div>
        ))}
      </div>
    </div>
  );
}

function GitContent({ commitDiffs, branchDiffs }: { commitDiffs: DiffFile[]; branchDiffs: DiffFile[] }) {
  const [openSection, setOpenSection] = useState<"commit" | "branch" | "both">("both");
  const showCommit = openSection === "commit" || openSection === "both";
  const showBranch = openSection === "branch" || openSection === "both";
  const commitAdds = commitDiffs.reduce((a, d) => a + d.additions, 0);
  const commitDels = commitDiffs.reduce((a, d) => a + d.deletions, 0);
  const branchAdds = branchDiffs.reduce((a, d) => a + d.additions, 0);
  const branchDels = branchDiffs.reduce((a, d) => a + d.deletions, 0);

  return (
    <div className="flex flex-col h-full bg-[#1a1a1a] overflow-auto">
      {/* Branch context */}
      <div className="px-3 py-2 border-b border-white/5 flex items-center gap-2 shrink-0">
        <GitBranch size={12} className="text-[#abefa3]" />
        <span className="font-mono text-[11px] text-[#777]">feature/photo-share</span>
        <span className="ml-auto text-[10px] font-['Rounded_Mplus_1c',sans-serif] text-[#444]">↑ main</span>
      </div>

      {/* Commit diffs */}
      <div>
        <button
          onClick={() => setOpenSection(s => s === "commit" ? "both" : s === "both" ? "branch" : "both")}
          className="w-full flex items-center gap-2 px-3 py-2 bg-[#252323]/60 hover:bg-[#252323] transition-colors border-b border-white/5 text-left"
        >
          {showCommit ? <ChevronDown size={11} className="text-[#555]" /> : <ChevronRight size={11} className="text-[#555]" />}
          <GitCommit size={11} className="text-[#abefa3]" />
          <span className="font-['Rounded_Mplus_1c',sans-serif] text-[11px] text-[#888] uppercase tracking-wide">Commit Diffs</span>
          <span className="font-mono text-[9px] text-[#555] ml-auto">{commitDiffs.length} files · <span className="text-[#abefa3]">+{commitAdds}</span> <span className="text-red-400">-{commitDels}</span></span>
        </button>
        {showCommit && commitDiffs.map((f, i) => <DiffRow key={i} f={f} />)}
      </div>

      {/* Branch/PR diffs */}
      <div>
        <button
          onClick={() => setOpenSection(s => s === "branch" ? "both" : s === "both" ? "commit" : "both")}
          className="w-full flex items-center gap-2 px-3 py-2 bg-[#252323]/60 hover:bg-[#252323] transition-colors border-b border-white/5 text-left"
        >
          {showBranch ? <ChevronDown size={11} className="text-[#555]" /> : <ChevronRight size={11} className="text-[#555]" />}
          <GitMerge size={11} className="text-blue-400" />
          <span className="font-['Rounded_Mplus_1c',sans-serif] text-[11px] text-[#888] uppercase tracking-wide">Branch / PR</span>
          <span className="font-mono text-[9px] text-[#555] ml-auto">{branchDiffs.length} files · <span className="text-[#abefa3]">+{branchAdds}</span> <span className="text-red-400">-{branchDels}</span></span>
        </button>
        {showBranch && branchDiffs.map((f, i) => <DiffRow key={i} f={f} />)}
      </div>
    </div>
  );
}

// ─── Widget content dispatcher ─────────────────────────────────────────────

function GlobalTodoContent({
  items,
  onToggle,
  onAdd,
  onDelete,
  onNavigateProject,
}: {
  items: GlobalTodoItem[];
  onToggle: (id: string) => void;
  onAdd: (text: string, category: "project" | "general", projectId?: string, projectName?: string, sessionId?: string) => void;
  onDelete: (id: string) => void;
  onNavigateProject?: (projectId: string) => void;
}) {
  const [filter, setFilter] = useState<"all" | "projects" | "general">("all");
  const [openOnly, setOpenOnly] = useState(false);
  const [draft, setDraft] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<"general" | "pet" | "nothotdog">("general");

  const openItems = items.filter(i => !i.done);
  const doneItems = items.filter(i => i.done);
  const percentComplete = items.length > 0 ? Math.round((doneItems.length / items.length) * 100) : 0;

  const filtered = items.filter(item => {
    if (openOnly && item.done) return false;
    if (filter === "projects") return item.category === "project";
    if (filter === "general") return item.category === "general";
    return true;
  });

  const petItems = filtered.filter(i => i.projectId === "pet");
  const nothotdogItems = filtered.filter(i => i.projectId === "nothotdog");
  const generalItems = filtered.filter(i => i.category === "general");

  const handleAdd = () => {
    const text = draft.trim();
    if (!text) return;
    if (selectedCategory === "pet") {
      onAdd(text, "project", "pet", "Pet Show and Tell", "add-comments");
    } else if (selectedCategory === "nothotdog") {
      onAdd(text, "project", "nothotdog", "Not Hotdog", "not-hotdog");
    } else {
      onAdd(text, "general");
    }
    setDraft("");
  };

  return (
    <div className="flex flex-col h-full bg-[#161517] overflow-hidden text-white">
      {/* Top Banner / Progress */}
      <div className="p-4 border-b border-white/8 bg-[#1c1b1f]/80 shrink-0">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <CheckSquare size={16} className="text-[#abefa3]" />
            <h3 className="font-['Space_Grotesk',sans-serif] text-[15px] font-bold text-white tracking-tight">Global Tasks & Reminders</h3>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-full text-[10.5px] font-['Rounded_Mplus_1c',sans-serif] font-bold bg-[#abefa3]/15 text-[#abefa3] border border-[#abefa3]/30">
              {openItems.length} Open
            </span>
            <span className="text-[11px] font-['Rounded_Mplus_1c',sans-serif] text-[#777]">
              {doneItems.length} Completed
            </span>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-white/5 rounded-full h-1.5 overflow-hidden flex">
          <div
            className="h-full bg-gradient-to-r from-[#2dd4bf] to-[#abefa3] transition-all duration-300"
            style={{ width: `${percentComplete}%` }}
          />
        </div>

        {/* Filter Chips */}
        <div className="flex items-center justify-between mt-3 pt-1">
          <div className="flex items-center gap-1.5">
            {(["all", "projects", "general"] as const).map(tabKey => (
              <button
                key={tabKey}
                onClick={() => setFilter(tabKey)}
                className={`px-2.5 py-1 rounded-[6px] text-[11px] font-['Rounded_Mplus_1c',sans-serif] transition-all cursor-pointer ${
                  filter === tabKey
                    ? "bg-[#2dd4bf]/20 text-[#2dd4bf] border border-[#2dd4bf]/40 font-semibold"
                    : "bg-white/4 text-[#777] hover:text-[#bbb] border border-transparent"
                }`}
              >
                {tabKey === "all" ? `All (${items.length})` : tabKey === "projects" ? `Projects (${items.filter(i => i.category === "project").length})` : `General & Ops (${items.filter(i => i.category === "general").length})`}
              </button>
            ))}
          </div>

          <button
            onClick={() => setOpenOnly(o => !o)}
            className={`flex items-center gap-1 px-2 py-1 rounded text-[10px] font-['Rounded_Mplus_1c',sans-serif] transition-colors cursor-pointer ${
              openOnly ? "text-[#abefa3] bg-[#abefa3]/10" : "text-[#666] hover:text-[#999]"
            }`}
          >
            <span>{openOnly ? "Open tasks only" : "Showing all"}</span>
          </button>
        </div>
      </div>

      {/* Task List (scrollable) */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Project Section: Pet Show and Tell */}
        {(filter === "all" || filter === "projects") && (petItems.length > 0 || !openOnly) && (
          <div className="rounded-[10px] bg-[#1d1b20] border border-white/6 overflow-hidden">
            <div className="flex items-center justify-between px-3 py-2 bg-white/[0.03] border-b border-white/5">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-[5px] bg-[#abefa3]/15 flex items-center justify-center text-[#abefa3]">
                  <ProjectGlyph size={12} />
                </div>
                <span className="font-['Space_Grotesk',sans-serif] text-[12px] font-semibold text-white">Pet Show and Tell</span>
                <span className="px-1.5 py-0.2 rounded text-[9px] font-mono text-[#2dd4bf] bg-[#2dd4bf]/10 border border-[#2dd4bf]/20">Expo</span>
                <span className="text-[10px] font-['Rounded_Mplus_1c',sans-serif] text-[#666]">
                  {petItems.filter(i => !i.done).length} open
                </span>
              </div>
              {onNavigateProject && (
                <button
                  onClick={() => onNavigateProject("pet")}
                  className="flex items-center gap-1 text-[10.5px] font-['Rounded_Mplus_1c',sans-serif] text-[#2dd4bf] hover:text-[#abefa3] hover:underline transition-colors cursor-pointer"
                >
                  <span>Open Project</span>
                  <ArrowRight size={11} />
                </button>
              )}
            </div>
            <div className="divide-y divide-white/4">
              {petItems.map(item => (
                <TodoItemRow key={item.id} item={item} onToggle={onToggle} onDelete={onDelete} />
              ))}
              {petItems.length === 0 && (
                <p className="px-3 py-2 text-[11px] font-['Rounded_Mplus_1c',sans-serif] text-[#555] italic">No tasks in this category.</p>
              )}
            </div>
          </div>
        )}

        {/* Project Section: Not Hotdog */}
        {(filter === "all" || filter === "projects") && (nothotdogItems.length > 0 || !openOnly) && (
          <div className="rounded-[10px] bg-[#1d1b20] border border-white/6 overflow-hidden">
            <div className="flex items-center justify-between px-3 py-2 bg-white/[0.03] border-b border-white/5">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-[5px] bg-[#2dd4bf]/15 flex items-center justify-center text-[#2dd4bf]">
                  <ProjectGlyph size={12} />
                </div>
                <span className="font-['Space_Grotesk',sans-serif] text-[12px] font-semibold text-white">Not Hotdog</span>
                <span className="px-1.5 py-0.2 rounded text-[9px] font-mono text-[#2dd4bf] bg-[#2dd4bf]/10 border border-[#2dd4bf]/20">Expo</span>
                <span className="text-[10px] font-['Rounded_Mplus_1c',sans-serif] text-[#666]">
                  {nothotdogItems.filter(i => !i.done).length} open
                </span>
              </div>
              {onNavigateProject && (
                <button
                  onClick={() => onNavigateProject("nothotdog")}
                  className="flex items-center gap-1 text-[10.5px] font-['Rounded_Mplus_1c',sans-serif] text-[#2dd4bf] hover:text-[#abefa3] hover:underline transition-colors cursor-pointer"
                >
                  <span>Open Project</span>
                  <ArrowRight size={11} />
                </button>
              )}
            </div>
            <div className="divide-y divide-white/4">
              {nothotdogItems.map(item => (
                <TodoItemRow key={item.id} item={item} onToggle={onToggle} onDelete={onDelete} />
              ))}
              {nothotdogItems.length === 0 && (
                <p className="px-3 py-2 text-[11px] font-['Rounded_Mplus_1c',sans-serif] text-[#555] italic">No tasks in this category.</p>
              )}
            </div>
          </div>
        )}

        {/* General / Infrastructure Section */}
        {(filter === "all" || filter === "general") && (
          <div className="rounded-[10px] bg-[#1d1b20] border border-white/6 overflow-hidden">
            <div className="flex items-center justify-between px-3 py-2 bg-white/[0.03] border-b border-white/5">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-[5px] bg-blue-400/15 flex items-center justify-center text-blue-400">
                  <Globe size={12} />
                </div>
                <span className="font-['Space_Grotesk',sans-serif] text-[12px] font-semibold text-white">General & Infrastructure</span>
                <span className="px-1.5 py-0.2 rounded text-[9px] font-mono text-blue-400 bg-blue-400/10 border border-blue-400/20">Ecosystem</span>
                <span className="text-[10px] font-['Rounded_Mplus_1c',sans-serif] text-[#666]">
                  {generalItems.filter(i => !i.done).length} open
                </span>
              </div>
            </div>
            <div className="divide-y divide-white/4">
              {generalItems.map(item => (
                <TodoItemRow key={item.id} item={item} onToggle={onToggle} onDelete={onDelete} />
              ))}
              {generalItems.length === 0 && (
                <p className="px-3 py-2 text-[11px] font-['Rounded_Mplus_1c',sans-serif] text-[#555] italic">No tasks in this category.</p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Quick Add Bar */}
      <div className="p-3 border-t border-white/8 bg-[#18171a] shrink-0">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-[10px] font-['Rounded_Mplus_1c',sans-serif] text-[#666] uppercase tracking-wider">Assign to:</span>
          {(
            [
              { id: "general", label: "General / Ops" },
              { id: "pet", label: "Pet Show and Tell" },
              { id: "nothotdog", label: "Not Hotdog" },
            ] as const
          ).map(cat => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-2 py-0.5 rounded text-[10px] font-['Rounded_Mplus_1c',sans-serif] transition-colors cursor-pointer ${
                selectedCategory === cat.id
                  ? "bg-[#abefa3]/20 text-[#abefa3] border border-[#abefa3]/30 font-medium"
                  : "bg-white/4 text-[#777] hover:text-[#aaa] border border-transparent"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <input
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") handleAdd(); }}
            placeholder={`Add a task (e.g. "Update SSL certificates on MyWebsite.com")...`}
            className="flex-1 bg-white/4 border border-white/10 rounded-[8px] px-3 py-1.5 text-[12px] font-['Rounded_Mplus_1c',sans-serif] text-white placeholder-white/25 outline-none focus:border-[#abefa3]/40 transition-colors"
          />
          <button
            onClick={handleAdd}
            disabled={!draft.trim()}
            className="flex items-center gap-1 px-3 py-1.5 rounded-[8px] bg-[#abefa3] text-[#061413] text-[12px] font-['Space_Grotesk',sans-serif] font-bold hover:opacity-90 disabled:opacity-30 disabled:cursor-not-allowed transition-all shrink-0 cursor-pointer"
          >
            <Plus size={13} strokeWidth={2.5} />
            <span>Add</span>
          </button>
        </div>
      </div>
    </div>
  );
}

function TodoItemRow({
  item,
  onToggle,
  onDelete,
}: {
  item: GlobalTodoItem;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div className="flex items-center gap-2.5 px-3 py-2 hover:bg-white/[0.025] transition-colors group">
      <button
        onClick={() => onToggle(item.id)}
        className="shrink-0 text-white/40 hover:text-[#abefa3] transition-colors cursor-pointer"
      >
        {item.done ? (
          <CheckCircle2 size={14} className="text-[#abefa3]" />
        ) : (
          <Circle size={14} className="text-[#555] group-hover:text-[#abefa3]" />
        )}
      </button>
      <span
        className={`flex-1 font-['Rounded_Mplus_1c',sans-serif] text-[11.5px] leading-relaxed transition-all ${
          item.done ? "line-through text-[#555]" : "text-[#e0e0e0]"
        }`}
      >
        {item.text}
      </span>
      <button
        onClick={() => onDelete(item.id)}
        className="opacity-0 group-hover:opacity-100 text-[#555] hover:text-red-400 p-1 rounded transition-all shrink-0 cursor-pointer"
        title="Delete task"
      >
        <X size={12} />
      </button>
    </div>
  );
}

function WidgetContent({ id, ctx, expanded }: { id: WidgetId; ctx: AppContext; expanded?: boolean }) {
  if (id === "globalTodo") {
    return (
      <GlobalTodoContent
        items={ctx.globalTodos || []}
        onToggle={ctx.toggleGlobalTodo || (() => {})}
        onAdd={ctx.addGlobalTodo || (() => {})}
        onDelete={ctx.deleteGlobalTodo || (() => {})}
        onNavigateProject={ctx.onNavigateProject}
      />
    );
  }
  if (id === "explorer") return <div className="h-full bg-[#1a1a1a] overflow-hidden"><ExplorerContent tree={ctx.tree} /></div>;
  if (id === "projectFolder") return <div className="h-full bg-[#1a1a1a] overflow-hidden"><ProjectFolderContent /></div>;
  if (id === "currentGoal") return (
    <div className="h-full bg-[#1a1a1a] p-4 flex flex-col gap-3">
      <p className="font-['Rounded_Mplus_1c',sans-serif] text-[16px] text-white leading-relaxed">{ctx.goal}</p>
      <p className="font-['Rounded_Mplus_1c',sans-serif] text-[12px] text-[#555]">Session phase: {PHASE_LABEL[ctx.phase]}</p>
    </div>
  );
  if (id === "agentTasks") return <div className="bg-[#1a1a1a] h-full overflow-auto"><Checklist items={ctx.agentTasks} onToggle={ctx.toggleAgentTask} onAdd={ctx.addAgentTask} onDelete={ctx.deleteAgentTask} /></div>;
  if (id === "humanTesting") return <div className="bg-[#1a1a1a] h-full overflow-auto"><Checklist items={ctx.humanTests} onToggle={ctx.toggleHumanTest} onAdd={ctx.addHumanTest} onDelete={ctx.deleteHumanTest} /></div>;
  if (id === "git") return <GitContent commitDiffs={ctx.diffs} branchDiffs={BRANCH_DIFFS} />;
  if (id === "terminal") return <TerminalContent />;
  if (id === "stylist") return <StylistContent />;
  if (id === "extensions") return <ExtensionsContent />;
  if (id === "timeline") return <TimelineContent />;
  if (id === "search") return <SearchContent />;
  if (id === "doctor") return (
    <div className="flex flex-col h-full bg-[#1a1a1a] font-mono text-[11px] p-4 gap-2 overflow-auto">
      {[{ ok: true, msg: "Project memory files present" }, { ok: true, msg: "package.json scripts valid" }, { ok: true, msg: "Expo config valid" }, { ok: false, msg: "Missing expo.scheme in app.json" }, { ok: true, msg: "TypeScript compiles (0 errors)" }, { ok: true, msg: "ESLint passed" }].map((r, i) => (
        <div key={i} className={`flex items-center gap-2 ${r.ok ? "text-[#abefa3]" : "text-red-400"}`}><span>{r.ok ? "✓" : "✗"}</span><span>{r.msg}</span></div>
      ))}
    </div>
  );
  if (id === "eas") return (
    <div className="flex flex-col h-full bg-[#1a1a1a] p-4 gap-3">
      {[{ build: "iOS Simulator", status: "success", ago: "2h ago" }, { build: "Android APK", status: "building", ago: "running" }, { build: "iOS Production", status: "failed", ago: "1d ago" }].map((b, i) => (
        <div key={i} className="flex items-center gap-3 p-3 bg-[#252323] rounded-[6px] border border-white/5">
          <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${b.status === "success" ? "bg-[#abefa3]" : b.status === "building" ? "bg-blue-400 animate-pulse" : "bg-red-400"}`} />
          <span className="flex-1 font-['Rounded_Mplus_1c',sans-serif] text-[12px] text-[#c5c5c5]">{b.build}</span>
          <span className="font-mono text-[10px] text-[#555]">{b.ago}</span>
        </div>
      ))}
    </div>
  );
  if (id === "problems") return (
    <div className="flex flex-col h-full bg-[#1a1a1a] overflow-auto">
      {[{ kind: "error", file: "app.json", msg: "Missing required field: expo.scheme", line: 8 }, { kind: "warning", file: "camera.tsx", msg: "React Hook useEffect has missing dependency", line: 42 }, { kind: "warning", file: "FriendList.tsx", msg: "Unnecessary 'any' type annotation", line: 17 }].map((p, i) => (
        <div key={i} className="flex items-start gap-2 px-3 py-2 border-b border-white/5 hover:bg-white/3 transition-colors cursor-pointer">
          <AlertTriangle size={12} className={`mt-0.5 shrink-0 ${p.kind === "error" ? "text-red-400" : "text-yellow-400"}`} />
          <div className="flex-1 min-w-0">
            <p className="font-['Rounded_Mplus_1c',sans-serif] text-[11px] text-[#c5c5c5] leading-snug">{p.msg}</p>
            <p className="font-mono text-[10px] text-[#555] mt-0.5">{p.file}:{p.line}</p>
          </div>
        </div>
      ))}
    </div>
  );
  if (id === "emuWeb" || id === "emuAndroid" || id === "emuIos") {
    const type: EmuType = id === "emuWeb" ? "web" : id === "emuAndroid" ? "android" : "ios";
    // In the standard widget modal the body fills the modal, so we use a full-height scaled device
    return (
      <div className="flex-1 flex items-center justify-center bg-[#111] h-full overflow-hidden">
        <ScaledDevice type={type} orientation="portrait" connected={ctx.emuConnected} targetH={420} />
      </div>
    );
  }
  if (id === "sessions") return <SessionsContent ctx={ctx} />;
  if (id === "actions") return <ActionsContent ctx={ctx} />;
  if (id === "library") return <LibraryContent expanded={expanded} />;
  return (
    <div className="flex flex-col items-center justify-center h-full gap-2">
      <span className="font-['Rounded_Mplus_1c',sans-serif] text-[12px] text-[#444]">{ALL_WIDGETS.find(w => w.id === id)?.label}</span>
    </div>
  );
}

// ─── Sessions content ───────────────────────────────────────────────────────

const ALL_SESSIONS = [
  { id: "s1", title: "Sending photos feature",    workspace: "expo-photo-share",         branch: "feature/photo-share", phase: "active" as SessionPhase, ago: "now",    date: "Today, 2:14 PM",        snippet: "PhotoPicker component implemented. Working on Supabase friend list query next." },
  { id: "s2", title: "Fix dark mode on iOS",      workspace: "expo-photo-share",         branch: "fix/dark-mode",       phase: "active" as SessionPhase, ago: "2h ago", date: "Today, 12:03 PM",       snippet: "Dark mode tokens look correct on web. iOS simulator still showing light background on TabBar." },
  { id: "s4", title: "EAS build pipeline setup",  workspace: "expo-photo-share",         branch: "chore/eas-setup",     phase: "wrapup" as SessionPhase, ago: "2d ago", date: "Jun 28, 4:45 PM",       snippet: "eas.json configured for preview and production profiles. CI secrets added." },
  { id: "s3", title: "Supabase schema design",    workspace: "portfolio.code-workspace", branch: "main",                phase: "wrapup" as SessionPhase, ago: "1d ago", date: "Jun 29, 10:22 AM",      snippet: "RLS policies set for photos table. Storage bucket public read, authenticated write." },
  { id: "s5", title: "Auth flow refactor",        workspace: "portfolio.code-workspace", branch: "feature/auth",        phase: "start"  as SessionPhase, ago: "3d ago", date: "Jun 27, 9:00 AM",       snippet: "Migrating from custom JWT to Supabase Auth. Session persistence via AsyncStorage." },
  { id: "s6", title: "Navigation stack review",   workspace: "DJsPortfolio",             branch: "main",                phase: "wrapup" as SessionPhase, ago: "5d ago", date: "Jun 25, 3:30 PM",       snippet: "Expo Router file-based routing refactor complete. Nested layouts cleaned up." },
  { id: "s7", title: "Onboard new app",           workspace: "not-hot-dog",              branch: "main",                phase: "start"  as SessionPhase, ago: "1w ago", date: "Jun 23, 11:15 AM",      snippet: "mds onboard run. project/ folder created. Stack: Expo Router, Zustand, NativeWind." },
  { id: "s8", title: "SDK upgrade 50→51",         workspace: "PokePages",                branch: "chore/sdk-51",        phase: "wrapup" as SessionPhase, ago: "2w ago", date: "Jun 16, 2:00 PM",       snippet: "expo-modules-core and react-native upgraded. Metro config updated for new resolver." },
];

// ─── Sessions content ──────────────────────────────────────────────────────

const CURRENT_PROJECT = "expo-photo-share";

type SessionPromptState = { session: typeof ALL_SESSIONS[0] } | null;

function SessionsContent({ ctx }: { ctx: AppContext }) {
  const [query, setQuery] = useState("");
  const [projectFilter, setProjectFilter] = useState(CURRENT_PROJECT);
  const [prompt, setPrompt] = useState<SessionPromptState>(null);

  const allProjects = [...new Set(ALL_SESSIONS.map(s => s.workspace))];

  const filtered = ALL_SESSIONS.filter(s => {
    const matchesProject = !projectFilter || s.workspace === projectFilter;
    const matchesQuery = !query.trim() || s.title.toLowerCase().includes(query.toLowerCase()) || s.snippet.toLowerCase().includes(query.toLowerCase());
    return matchesProject && matchesQuery;
  });

  const handleClick = (s: typeof ALL_SESSIONS[0]) => {
    if (s.workspace === CURRENT_PROJECT) {
      ctx.sendMessage(`Opening session: "${s.title}"`);
    } else {
      setPrompt({ session: s });
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#1a1a1a] relative">
      {/* Search + project filter */}
      <div className="px-3 py-2.5 border-b border-white/5 shrink-0 flex flex-col gap-2">
        <div className="flex items-center gap-2 bg-[#252323] rounded-[5px] px-2 py-1.5 border border-white/6 focus-within:border-[#abefa3]/30 transition-colors">
          <Search size={12} className="text-[#555]" />
          <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search sessions…"
            className="flex-1 bg-transparent text-[11px] font-['Rounded_Mplus_1c',sans-serif] text-white placeholder-[#444] border-none outline-none" />
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            onClick={() => setProjectFilter("")}
            className={`text-[10px] font-['Rounded_Mplus_1c',sans-serif] px-2 py-0.5 rounded-full border transition-colors ${!projectFilter ? "bg-[#abefa3]/15 border-[#abefa3]/30 text-[#abefa3]" : "border-white/10 text-[#555] hover:text-[#888]"}`}>
            All
          </button>
          {allProjects.map(p => (
            <button key={p} onClick={() => setProjectFilter(p === projectFilter ? "" : p)}
              className={`text-[10px] font-['Rounded_Mplus_1c',sans-serif] px-2 py-0.5 rounded-full border transition-colors truncate max-w-[120px] ${projectFilter === p ? "bg-[#abefa3]/15 border-[#abefa3]/30 text-[#abefa3]" : "border-white/10 text-[#555] hover:text-[#888]"}`}>
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Session list */}
      <div className="flex-1 overflow-auto">
        {filtered.length === 0 && (
          <p className="font-['Rounded_Mplus_1c',sans-serif] text-[11px] text-[#444] px-4 py-6 text-center">No sessions found</p>
        )}
        {filtered.map(s => (
          <div key={s.id} onClick={() => handleClick(s)}
            className="flex flex-col px-3 py-2.5 border-b border-white/5 hover:bg-white/3 transition-colors cursor-pointer group">
            <div className="flex items-start gap-2 mb-1">
              <div className="flex-1 min-w-0">
                <p className="font-['Rounded_Mplus_1c',sans-serif] text-[12px] text-white truncate">{s.title}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <Folder size={10} className="text-[#444] shrink-0" />
                  <span className="font-['Rounded_Mplus_1c',sans-serif] text-[10px] text-[#555] truncate">{s.workspace}</span>
                  {s.workspace !== CURRENT_PROJECT && (
                    <span className="text-[9px] font-['Rounded_Mplus_1c',sans-serif] px-1.5 py-0.5 rounded bg-orange-500/15 text-orange-400 border border-orange-500/20 shrink-0">other project</span>
                  )}
                </div>
              </div>
              <div className="flex flex-col items-end gap-1 shrink-0">
                <span className="font-['Rounded_Mplus_1c',sans-serif] text-[9px] text-[#444]">{s.date}</span>
                <span className={`px-1.5 py-0.5 rounded text-[9px] font-['Rounded_Mplus_1c',sans-serif] ${PHASE_COLOR[s.phase]}`}>{PHASE_LABEL[s.phase]}</span>
              </div>
            </div>
            <p className="font-['Rounded_Mplus_1c',sans-serif] text-[10px] text-[#555] leading-relaxed line-clamp-2">{s.snippet}</p>
          </div>
        ))}
      </div>

      {/* Cross-project prompt modal */}
      {prompt && (
        <div className="absolute inset-0 bg-black/70 flex items-end z-10" onClick={() => setPrompt(null)}>
          <div className="w-full bg-[#1d1b20] border-t border-white/8 p-4 flex flex-col gap-3" onClick={e => e.stopPropagation()}>
            <div>
              <p className="font-['Rounded_Mplus_1c',sans-serif] text-[13px] text-white mb-0.5">"{prompt.session.title}"</p>
              <p className="font-['Rounded_Mplus_1c',sans-serif] text-[11px] text-[#555]">This session belongs to <span className="text-[#aaa]">{prompt.session.workspace}</span></p>
            </div>
            <div className="flex flex-col gap-1.5">
              <button onClick={() => { ctx.sendMessage(`Opening session from ${prompt.session.workspace}: "${prompt.session.title}"`); setPrompt(null); }}
                className="w-full py-2 rounded-[6px] text-[12px] font-['Rounded_Mplus_1c',sans-serif] bg-[#abefa3]/15 border border-[#abefa3]/25 text-[#abefa3] hover:bg-[#abefa3]/25 transition-colors text-left px-3">
                Open temporarily here
              </button>
              <button onClick={() => { ctx.sendMessage(`Switching project to ${prompt.session.workspace} and opening session: "${prompt.session.title}"`); setPrompt(null); }}
                className="w-full py-2 rounded-[6px] text-[12px] font-['Rounded_Mplus_1c',sans-serif] bg-white/5 border border-white/8 text-[#c5c5c5] hover:bg-white/8 transition-colors text-left px-3">
                Open in {prompt.session.workspace}
              </button>
              <button onClick={() => { ctx.sendMessage(`Assigning session "${prompt.session.title}" from ${prompt.session.workspace} to this project.`); setPrompt(null); }}
                className="w-full py-2 rounded-[6px] text-[12px] font-['Rounded_Mplus_1c',sans-serif] bg-white/5 border border-white/8 text-[#c5c5c5] hover:bg-white/8 transition-colors text-left px-3">
                Assign to this project & open
              </button>
            </div>
            <button onClick={() => setPrompt(null)} className="text-[11px] font-['Rounded_Mplus_1c',sans-serif] text-[#444] hover:text-[#888] transition-colors text-center">Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Actions content ────────────────────────────────────────────────────────

const ACTION_GROUPS: { group: string; color: string; dot: string; actions: { label: string; desc: string; cmd: string }[] }[] = [
  {
    group: "MDS", color: "text-[#abefa3] bg-[#abefa3]/10 border-[#abefa3]/20", dot: "#abefa3",
    actions: [
      { label: "Create Super Stack", desc: "Scaffold a new Expo app with MDS defaults and full onboarding", cmd: "/create-expo-super-stack" },
      { label: "Onboard",            desc: "Run post-create onboarding — project memory, stack config, MCP setup", cmd: "/mds-onboard" },
      { label: "Run Doctor",         desc: "Health check: project memory, env, Expo config, lint, typecheck", cmd: "/run-doctor" },
      { label: "Ship Test",          desc: "mds doctor → commit → push → open PR → poll CI → merge", cmd: "/ship-test" },
      { label: "Clear Expo Start",   desc: "Kill stuck ports, clear Metro/Expo caches, restart dev server", cmd: "/clear-expo-start" },
      { label: "Wrap Up",            desc: "End session, update Todo.md, generate commit message, commit", cmd: "/wrap-up" },
    ],
  },
  {
    group: "EAS", color: "text-blue-400 bg-blue-400/10 border-blue-400/20", dot: "#60a5fa",
    actions: [
      { label: "Build iOS",         desc: "eas build --platform ios — production profile", cmd: "/eas-build-ios" },
      { label: "Build Android",     desc: "eas build --platform android — production profile", cmd: "/eas-build-android" },
      { label: "Build Preview",     desc: "eas build --profile preview — internal distribution", cmd: "/eas-build-preview" },
      { label: "Submit",            desc: "eas submit — send to App Store Connect or Google Play", cmd: "/eas-submit" },
      { label: "OTA Update",        desc: "eas update — push over-the-air update to production channel", cmd: "/eas-update" },
    ],
  },
  {
    group: "Expo Dev", color: "text-purple-400 bg-purple-400/10 border-purple-400/20", dot: "#c084fc",
    actions: [
      { label: "Start Dev Server",  desc: "npx expo start --clear with Metro bundler", cmd: "/start-app" },
      { label: "Start with Tunnel", desc: "expo start --tunnel for physical device testing", cmd: "/start-tunnel" },
      { label: "Export Web",        desc: "expo export --platform web for static hosting", cmd: "/export-web" },
      { label: "Type Check",        desc: "npx tsc --noEmit — full TypeScript validation", cmd: "/type-check" },
      { label: "Install Deps",      desc: "npm install — sync all dependencies from package.json", cmd: "/install-deps" },
    ],
  },
];

function ActionsContent({ ctx }: { ctx: AppContext }) {
  const [openGroup, setOpenGroup] = useState<string | null>(null);

  return (
    <div className="flex flex-col h-full bg-[#1a1a1a] overflow-auto">
      {ACTION_GROUPS.map(grp => {
        const isOpen = openGroup === null || openGroup === grp.group;
        return (
          <div key={grp.group}>
            <button onClick={() => setOpenGroup(openGroup === grp.group ? null : grp.group)}
              className="w-full flex items-center gap-2 px-3 py-2 bg-[#252323]/60 hover:bg-[#252323] transition-colors border-b border-white/5 text-left">
              <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: grp.dot }} />
              <span className={`text-[10px] font-['Rounded_Mplus_1c',sans-serif] uppercase tracking-widest ${grp.color.split(" ")[0]}`}>{grp.group}</span>
              <span className="font-['Rounded_Mplus_1c',sans-serif] text-[10px] text-[#555] ml-auto">{grp.actions.length} actions</span>
              {isOpen ? <ChevronDown size={11} className="text-[#555]" /> : <ChevronRight size={11} className="text-[#555]" />}
            </button>
            {isOpen && grp.actions.map(a => (
              <button key={a.label} onClick={() => ctx.sendMessage(a.cmd)}
                className="w-full flex items-start gap-3 px-4 py-2.5 border-b border-white/4 hover:bg-white/4 transition-colors text-left group">
                <div className={`mt-0.5 w-5 h-5 rounded-[4px] flex items-center justify-center shrink-0 border ${grp.color}`}>
                  <Zap size={10} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-['Rounded_Mplus_1c',sans-serif] text-[12px] text-[#c5c5c5] group-hover:text-white transition-colors">{a.label}</p>
                  <p className="font-['Rounded_Mplus_1c',sans-serif] text-[10px] text-[#555] mt-0.5 leading-snug">{a.desc}</p>
                </div>
              </button>
            ))}
          </div>
        );
      })}
    </div>
  );
}

// ─── Library registry ───────────────────────────────────────────────────────

type LibSource = "MDS" | "Expo UI Kit" | "Community";
type LibType = "Onboarding" | "Auth" | "Setup" | "Legal" | "App Shell" | "Navigation" | "Feedback";
type LibSubtype = "Welcome / Intro" | "Step Flow" | "Legal Gate" | "Permissions / Access" | "Completion State";

interface LibraryItem {
  id: string;
  title: string;
  source: LibSource;
  type: LibType;
  subtype?: LibSubtype;
  description: string;
  hasLivePreview: boolean;
  color: string;
}

const LIBRARY_ITEMS: LibraryItem[] = [
  { id: "mds-onboard-welcome", title: "Welcome Flow",         source: "MDS",        type: "Onboarding", subtype: "Welcome / Intro",        description: "3-step animated welcome with value props and CTA",    hasLivePreview: true,  color: "#a78bfa" },
  { id: "mds-onboard-steps",   title: "Step Flow",            source: "MDS",        type: "Onboarding", subtype: "Step Flow",               description: "Progress-tracked multi-step onboarding sequence",     hasLivePreview: false, color: "#818cf8" },
  { id: "mds-onboard-legal",   title: "Legal Gate",           source: "MDS",        type: "Onboarding", subtype: "Legal Gate",              description: "Terms + privacy gate with scroll-to-accept pattern",  hasLivePreview: false, color: "#6366f1" },
  { id: "mds-onboard-perms",   title: "Permissions Request",  source: "MDS",        type: "Onboarding", subtype: "Permissions / Access",    description: "Camera, notifications, and location permission flows", hasLivePreview: false, color: "#7c3aed" },
  { id: "mds-onboard-done",    title: "Completion State",     source: "MDS",        type: "Onboarding", subtype: "Completion State",        description: "Celebratory completion screen with next-step prompts",hasLivePreview: false, color: "#5b21b6" },
  { id: "mds-auth-signin",     title: "Sign In",              source: "MDS",        type: "Auth",       description: "Email + password sign-in with social auth options",    hasLivePreview: true,  color: "#0ea5e9" },
  { id: "mds-auth-signup",     title: "Create Account",       source: "MDS",        type: "Auth",       description: "Registration form with validation and error states",   hasLivePreview: false, color: "#06b6d4" },
  { id: "mds-setup-profile",   title: "Profile Setup",        source: "MDS",        type: "Setup",      description: "Avatar, name, and bio setup with camera integration",  hasLivePreview: false, color: "#10b981" },
  { id: "mds-legal-tos",       title: "Terms of Service",     source: "MDS",        type: "Legal",      description: "Scrollable ToS with accept/decline CTA at bottom",     hasLivePreview: false, color: "#059669" },
  { id: "expo-shell-tabs",     title: "Tab Shell",            source: "Expo UI Kit", type: "App Shell",  description: "Expo Router tab layout with 4 tabs and bottom nav",     hasLivePreview: false, color: "#f59e0b" },
  { id: "expo-nav-stack",      title: "Stack Navigator",      source: "Expo UI Kit", type: "Navigation", description: "Typed stack navigator with header config and back",    hasLivePreview: false, color: "#d97706" },
  { id: "community-feedback",  title: "Toast / Alert",        source: "Community",  type: "Feedback",   description: "Animated toast notifications and modal alerts",         hasLivePreview: false, color: "#ef4444" },
];

const LIB_SOURCES: LibSource[] = ["MDS", "Expo UI Kit", "Community"];
const LIB_TYPES: LibType[] = ["Onboarding", "Auth", "Setup", "Legal", "App Shell", "Navigation", "Feedback"];
const LIB_SUBTYPES: LibSubtype[] = ["Welcome / Intro", "Step Flow", "Legal Gate", "Permissions / Access", "Completion State"];

// ── Live previews ──────────────────────────────────────────────────────────

function OnboardingPreview() {
  const steps = [
    { title: "Welcome to the app", body: "Everything you need in one place. Built for how you actually work." },
    { title: "Your project, your way", body: "The IDE adapts to your session phase — giving you the right tools at the right time." },
    { title: "Ready to build", body: "Open a folder or workspace to get started. Your project memory travels with you." },
  ];
  const [step, setStep] = useState(0);
  return (
    <div className="flex flex-col items-center justify-between h-full py-6 px-5 text-center">
      <div className="flex gap-1.5 mt-2">
        {steps.map((_, i) => (
          <div key={i} className="rounded-full transition-all" style={{ width: i === step ? 20 : 6, height: 6, background: i === step ? "#a78bfa" : "rgba(167,139,250,0.2)" }} />
        ))}
      </div>
      <AnimatePresence mode="wait">
        <motion.div key={step} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.3 }} className="flex flex-col items-center gap-3 px-2">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: "rgba(167,139,250,0.12)", border: "1px solid rgba(167,139,250,0.2)" }}>
            <Zap size={22} style={{ color: "#a78bfa" }} />
          </div>
          <p className="font-['Rounded_Mplus_1c',sans-serif] text-[15px] font-bold text-white leading-snug">{steps[step].title}</p>
          <p className="font-['Rounded_Mplus_1c',sans-serif] text-[12px] text-[#666] leading-relaxed">{steps[step].body}</p>
        </motion.div>
      </AnimatePresence>
      <button onClick={() => setStep(s => (s + 1) % steps.length)}
        className="w-full py-2.5 rounded-[8px] text-[12px] font-['Rounded_Mplus_1c',sans-serif] transition-all hover:opacity-90 active:scale-[0.98]"
        style={{ background: "#a78bfa", color: "#0e0c0e" }}>
        {step < steps.length - 1 ? "Next" : "Get Started"}
      </button>
    </div>
  );
}

function AuthPreview() {
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  return (
    <div className="flex flex-col justify-center gap-4 h-full px-5 py-6">
      <div className="text-center mb-2">
        <div className="w-10 h-10 rounded-xl mx-auto mb-3 flex items-center justify-center" style={{ background: "rgba(14,165,233,0.12)", border: "1px solid rgba(14,165,233,0.2)" }}>
          <Hash size={18} style={{ color: "#0ea5e9" }} />
        </div>
        <p className="font-['Rounded_Mplus_1c',sans-serif] text-[15px] font-bold text-white">Sign in</p>
        <p className="font-['Rounded_Mplus_1c',sans-serif] text-[11px] text-[#555] mt-1">Continue to your workspace</p>
      </div>
      <div className="flex flex-col gap-2">
        <input value={email} onChange={e => setEmail(e.target.value)} placeholder="Email address" type="email"
          className="w-full rounded-[6px] px-3 py-2 text-[12px] font-['Rounded_Mplus_1c',sans-serif] outline-none"
          style={{ background: "#1a1818", border: "1px solid rgba(255,255,255,0.08)", color: "#c5c5c5" }} />
        <input value={pw} onChange={e => setPw(e.target.value)} placeholder="Password" type="password"
          className="w-full rounded-[6px] px-3 py-2 text-[12px] font-['Rounded_Mplus_1c',sans-serif] outline-none"
          style={{ background: "#1a1818", border: "1px solid rgba(255,255,255,0.08)", color: "#c5c5c5" }} />
      </div>
      <button className="w-full py-2 rounded-[6px] text-[12px] font-['Rounded_Mplus_1c',sans-serif] transition-all hover:opacity-90"
        style={{ background: "#0ea5e9", color: "#fff" }}>
        Continue
      </button>
      <div className="flex items-center gap-2">
        <div className="flex-1 border-t border-white/6" />
        <span className="text-[9px] text-[#444] font-['Rounded_Mplus_1c',sans-serif]">or</span>
        <div className="flex-1 border-t border-white/6" />
      </div>
      <button className="w-full py-2 rounded-[6px] text-[12px] font-['Rounded_Mplus_1c',sans-serif] transition-colors hover:bg-white/6"
        style={{ border: "1px solid rgba(255,255,255,0.08)", color: "#c5c5c5" }}>
        Continue with GitHub
      </button>
    </div>
  );
}

// ── Library content (full widget / modal / fullscreen body) ────────────────

function LibraryContent({ expanded = false }: { expanded?: boolean }) {
  const [sourceFilter, setSourceFilter] = useState<LibSource | "All">("MDS");
  const [typeFilter, setTypeFilter] = useState<LibType | "All">("All");
  const [subtypeFilter, setSubtypeFilter] = useState<LibSubtype | "All">("All");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [addingItem, setAddingItem] = useState<LibraryItem | null>(null);
  const [dropHighlight, setDropHighlight] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const filtered = LIBRARY_ITEMS.filter(item => {
    const q = query.toLowerCase();
    return (sourceFilter === "All" || item.source === sourceFilter)
      && (typeFilter === "All" || item.type === typeFilter)
      && (subtypeFilter === "All" || item.subtype === subtypeFilter)
      && (!q || item.title.toLowerCase().includes(q) || item.description.toLowerCase().includes(q));
  });

  const selectedItem = LIBRARY_ITEMS.find(i => i.id === selectedId) ?? null;

  const handleDragStart = (e: React.DragEvent, item: LibraryItem) => {
    e.dataTransfer.setData("library-item-id", item.id);
    e.dataTransfer.effectAllowed = "copy";
  };

  const handleDragEnd = (e: React.DragEvent, item: LibraryItem) => {
    // If dropped outside this component's bounds, start add flow
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const { clientX, clientY } = e;
    const outside = clientX < rect.left || clientX > rect.right || clientY < rect.top || clientY > rect.bottom;
    if (outside) setAddingItem(item);
    setDropHighlight(false);
  };

  if (expanded) {
    return (
      <div ref={containerRef} className="flex h-full overflow-hidden relative">
        {/* Filter sidebar */}
        <div className="w-[180px] shrink-0 border-r border-white/5 flex flex-col overflow-y-auto bg-[#1a1818] py-3">
          {/* Search */}
          <div className="px-3 mb-4">
            <div className="flex items-center gap-1.5 rounded-[5px] px-2 py-1.5 bg-[#252323] border border-white/6 focus-within:border-[#a78bfa]/30 transition-colors">
              <Search size={11} className="text-[#555]" />
              <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search…"
                className="flex-1 bg-transparent text-[11px] font-['Rounded_Mplus_1c',sans-serif] text-white placeholder-[#444] border-none outline-none" />
            </div>
          </div>

          {/* Source */}
          <p className="px-3 text-[9px] uppercase tracking-widest text-[#444] font-['Rounded_Mplus_1c',sans-serif] mb-1.5">Source</p>
          {(["MDS", ...LIB_SOURCES.filter(s => s !== "MDS"), "All"] as Array<LibSource | "All">).map(s => (
            <button key={s} onClick={() => setSourceFilter(s)}
              className={`w-full flex items-center gap-2 px-3 py-1.5 text-[11px] font-['Rounded_Mplus_1c',sans-serif] transition-colors border-l-2 ${sourceFilter === s ? "text-[#a78bfa] border-[#a78bfa] bg-[#a78bfa]/5" : "text-[#666] border-transparent hover:text-[#999] hover:bg-white/3"}`}>
              {s}
            </button>
          ))}

          <div className="mx-3 my-3 border-t border-white/5" />

          {/* Type */}
          <p className="px-3 text-[9px] uppercase tracking-widest text-[#444] font-['Rounded_Mplus_1c',sans-serif] mb-1.5">Type</p>
          {(["All", ...LIB_TYPES] as Array<LibType | "All">).map(t => (
            <div key={t}>
              <button onClick={() => { setTypeFilter(t); if (t !== "Onboarding") setSubtypeFilter("All"); }}
                className={`w-full flex items-center gap-2 px-3 py-1.5 text-[11px] font-['Rounded_Mplus_1c',sans-serif] transition-colors border-l-2 ${typeFilter === t ? "text-[#a78bfa] border-[#a78bfa] bg-[#a78bfa]/5" : "text-[#666] border-transparent hover:text-[#999] hover:bg-white/3"}`}>
                {t}
              </button>
              {t === "Onboarding" && typeFilter === "Onboarding" && (
                <div className="ml-4 border-l border-white/5">
                  {(["All", ...LIB_SUBTYPES] as Array<LibSubtype | "All">).map(sub => (
                    <button key={sub} onClick={() => setSubtypeFilter(sub)}
                      className={`w-full flex items-center gap-2 pl-3 pr-2 py-1 text-[10px] font-['Rounded_Mplus_1c',sans-serif] transition-colors ${subtypeFilter === sub ? "text-[#a78bfa]" : "text-[#555] hover:text-[#888]"}`}>
                      {sub}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}

          <div className="mx-3 mt-auto pt-4 border-t border-white/5">
            <p className="text-[9px] font-['Rounded_Mplus_1c',sans-serif] text-[#444] leading-snug">Drag a card outside the panel to add it to your project</p>
          </div>
        </div>

        {/* Card grid */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))" }}>
            {filtered.map(item => (
              <LibraryCard key={item.id} item={item} selected={selectedId === item.id}
                onClick={() => setSelectedId(item.id === selectedId ? null : item.id)}
                onDragStart={e => handleDragStart(e, item)}
                onDragEnd={e => handleDragEnd(e, item)} />
            ))}
            {filtered.length === 0 && (
              <div className="col-span-full text-center py-12">
                <p className="font-['Rounded_Mplus_1c',sans-serif] text-[12px] text-[#444]">No items match your filters</p>
              </div>
            )}
          </div>
        </div>

        {/* Preview panel */}
        <AnimatePresence>
          {selectedItem && (
            <motion.div
              initial={{ x: 320, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 320, opacity: 0 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className="w-[300px] shrink-0 border-l border-white/5 flex flex-col bg-[#1a1818] overflow-hidden"
            >
              <LibraryPreviewPanel item={selectedItem} onClose={() => setSelectedId(null)} onAdd={() => setAddingItem(selectedItem)} />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Add flow modal */}
        <AnimatePresence>
          {addingItem && <AddLibraryFlowModal item={addingItem} onClose={() => setAddingItem(null)} />}
        </AnimatePresence>
      </div>
    );
  }

  // Compact (widget) view — horizontal pills + grid, no sidebar
  return (
    <div className="flex flex-col h-full bg-[#1a1a1a]">
      <div className="px-3 py-2 border-b border-white/5 shrink-0 flex flex-col gap-1.5">
        <div className="flex items-center gap-1.5 rounded-[5px] px-2 py-1.5 bg-[#252323] border border-white/6 focus-within:border-[#a78bfa]/30 transition-colors">
          <Search size={11} className="text-[#555]" />
          <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search library…"
            className="flex-1 bg-transparent text-[11px] font-['Rounded_Mplus_1c',sans-serif] text-white placeholder-[#444] border-none outline-none" />
        </div>
        <div className="flex items-center gap-1 flex-wrap">
          {(["MDS", "Expo UI Kit", "Community", "All"] as Array<LibSource | "All">).map(s => (
            <button key={s} onClick={() => setSourceFilter(s)}
              className={`text-[9px] font-['Rounded_Mplus_1c',sans-serif] px-2 py-0.5 rounded-full border transition-colors ${sourceFilter === s ? "bg-[#a78bfa]/15 border-[#a78bfa]/30 text-[#a78bfa]" : "border-white/10 text-[#555] hover:text-[#888]"}`}>
              {s}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1 flex-wrap">
          {(["All", ...LIB_TYPES] as Array<LibType | "All">).map(t => (
            <button key={t} onClick={() => setTypeFilter(t)}
              className={`text-[9px] font-['Rounded_Mplus_1c',sans-serif] px-2 py-0.5 rounded-full border transition-colors ${typeFilter === t ? "bg-[#818cf8]/15 border-[#818cf8]/30 text-[#818cf8]" : "border-white/10 text-[#555] hover:text-[#888]"}`}>
              {t}
            </button>
          ))}
        </div>
      </div>
      <div ref={containerRef} className="flex-1 overflow-auto relative">
        <div className="grid grid-cols-2 gap-2 p-3">
          {filtered.map(item => (
            <LibraryCard key={item.id} item={item} selected={selectedId === item.id}
              onClick={() => setSelectedId(item.id === selectedId ? null : item.id)}
              onDragStart={e => handleDragStart(e, item)}
              onDragEnd={e => handleDragEnd(e, item)}
              compact />
          ))}
          {filtered.length === 0 && (
            <div className="col-span-2 text-center py-8">
              <p className="font-['Rounded_Mplus_1c',sans-serif] text-[11px] text-[#444]">No items match your filters</p>
            </div>
          )}
        </div>
      </div>

      <AnimatePresence>
        {addingItem && <AddLibraryFlowModal item={addingItem} onClose={() => setAddingItem(null)} />}
      </AnimatePresence>
    </div>
  );
}

function LibraryCard({ item, selected, onClick, compact, onDragStart, onDragEnd }: {
  item: LibraryItem; selected: boolean; onClick: () => void; compact?: boolean;
  onDragStart?: (e: React.DragEvent) => void; onDragEnd?: (e: React.DragEvent) => void;
}) {
  return (
    <div onClick={onClick}
      draggable={!!onDragStart}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      className={`flex flex-col rounded-[10px] overflow-hidden cursor-grab active:cursor-grabbing transition-all border ${selected ? "border-[#a78bfa] ring-1 ring-[#a78bfa]/25" : "border-white/6 hover:border-white/15"} bg-[#1e1c1e]`}
      style={{ boxShadow: selected ? "0 0 0 1px rgba(167,139,250,0.15), 0 4px 20px rgba(0,0,0,0.4)" : "0 2px 8px rgba(0,0,0,0.3)" }}>
      {/* Thumbnail */}
      <div className="relative overflow-hidden" style={{ height: compact ? 76 : 96, background: `${item.color}12` }}>
        <div className="absolute inset-0" style={{ background: `radial-gradient(circle at 50% 80%, ${item.color}20, transparent 70%)` }} />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-9 h-9 rounded-[9px] flex items-center justify-center" style={{ background: `${item.color}20`, border: `1px solid ${item.color}35` }}>
            <Layers size={16} style={{ color: item.color, opacity: 0.9 }} />
          </div>
        </div>
        {item.hasLivePreview && (
          <div className="absolute top-2 right-2 px-1.5 py-0.5 rounded text-[8px] font-['Rounded_Mplus_1c',sans-serif]"
            style={{ background: `${item.color}30`, border: `1px solid ${item.color}50`, color: item.color }}>
            Live
          </div>
        )}
      </div>
      {/* Info */}
      <div className="px-2.5 py-2">
        <p className="font-['Rounded_Mplus_1c',sans-serif] text-[11px] text-white leading-snug">{item.title}</p>
        <div className="flex items-center gap-1 mt-1 mb-1 flex-wrap">
          <span className="text-[8px] font-['Rounded_Mplus_1c',sans-serif] px-1.5 py-0.5 rounded" style={{ background: `${item.color}15`, color: item.color }}>{item.source}</span>
          <span className="text-[8px] font-['Rounded_Mplus_1c',sans-serif] px-1.5 py-0.5 rounded bg-[#818cf8]/10 text-[#818cf8]/80">{item.type}</span>
        </div>
        {!compact && <p className="font-['Rounded_Mplus_1c',sans-serif] text-[10px] text-[#555] leading-snug line-clamp-2">{item.description}</p>}
      </div>
    </div>
  );
}

function LibraryPreviewPanel({ item, onClose, onAdd }: { item: LibraryItem; onClose: () => void; onAdd: () => void }) {
  return (
    <>
      <div className="flex items-center gap-2 px-3 py-2.5 border-b border-white/5 shrink-0">
        <div className="flex-1 min-w-0">
          <p className="font-['Rounded_Mplus_1c',sans-serif] text-[12px] font-bold truncate" style={{ color: item.color }}>{item.title}</p>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="text-[8px] font-['Rounded_Mplus_1c',sans-serif] px-1.5 py-0.5 rounded" style={{ background: `${item.color}15`, color: item.color }}>{item.source}</span>
            <span className="text-[8px] font-['Rounded_Mplus_1c',sans-serif] text-[#555]">{item.type}{item.subtype ? ` · ${item.subtype}` : ""}</span>
          </div>
        </div>
        <button onClick={onAdd}
          className="flex items-center gap-1 px-2.5 py-1 rounded-[5px] text-[11px] font-['Rounded_Mplus_1c',sans-serif] shrink-0 transition-all hover:opacity-90 active:scale-[0.97]"
          style={{ background: "#abefa3", color: "#1d1b20" }}>
          <Plus size={11} />Add
        </button>
        <button onClick={onClose} className="text-[#555] hover:text-[#999] transition-colors shrink-0 ml-0.5"><X size={13} /></button>
      </div>
      <p className="px-3 py-2 text-[11px] font-['Rounded_Mplus_1c',sans-serif] text-[#666] leading-relaxed border-b border-white/5">{item.description}</p>
      <div className="flex-1 overflow-hidden flex flex-col">
        {item.hasLivePreview ? (
          <div className="flex-1 bg-[#0e0c0e] m-3 rounded-xl overflow-hidden" style={{ border: `1px solid ${item.color}20` }}>
            {item.id === "mds-onboard-welcome" ? <OnboardingPreview /> : <AuthPreview />}
          </div>
        ) : (
          <div className="flex-1 m-3 rounded-xl flex flex-col items-center justify-center gap-2" style={{ background: `${item.color}08`, border: `1px solid ${item.color}15` }}>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${item.color}15` }}>
              <Layers size={18} style={{ color: item.color, opacity: 0.6 }} />
            </div>
            <p className="font-['Rounded_Mplus_1c',sans-serif] text-[11px] text-[#444] text-center px-4">Preview not available for this item</p>
          </div>
        )}
      </div>
    </>
  );
}

// ─── Add Library Item Flow ──────────────────────────────────────────────────

type AddFlowStep =
  | { kind: "thinking"; label: string }
  | { kind: "conflict"; question: string; options: string[] }
  | { kind: "resolving"; label: string }
  | { kind: "done"; message: string };

const ADD_FLOW_SCRIPT: AddFlowStep[] = [
  { kind: "thinking", label: "Scanning project for existing components…" },
  { kind: "thinking", label: "Checking for naming conflicts…" },
  {
    kind: "conflict",
    question: "Found an existing `OnboardingScreen.tsx` in `src/screens/`. The Welcome Flow adds a file with the same name.\n\nHow would you like to resolve this?",
    options: [
      "Rename new file → WelcomeFlow.tsx",
      "Replace existing file",
      "Merge into existing file",
    ],
  },
  { kind: "resolving", label: "Applying rename…" },
  { kind: "resolving", label: "Copying component files…" },
  { kind: "resolving", label: "Updating navigation registry…" },
  { kind: "resolving", label: "Installing peer dependencies…" },
  { kind: "done", message: "Welcome Flow added successfully as `WelcomeFlow.tsx`. Import it from `src/screens/WelcomeFlow.tsx`." },
];

function AddLibraryFlowModal({ item, onClose }: { item: LibraryItem; onClose: () => void }) {
  const [stepIdx, setStepIdx] = useState(0);
  const [resolved, setResolved] = useState(false);
  const step = ADD_FLOW_SCRIPT[Math.min(stepIdx, ADD_FLOW_SCRIPT.length - 1)];

  useEffect(() => {
    if (step.kind !== "thinking" && step.kind !== "resolving") return;
    const t = setTimeout(() => setStepIdx(i => i + 1), step.kind === "thinking" ? 1200 : 800);
    return () => clearTimeout(t);
  }, [stepIdx, step]);

  const handleOption = () => {
    setResolved(true);
    setStepIdx(i => i + 1);
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <motion.div
        initial={{ scale: 0.94, y: 10 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.94, y: 10 }}
        transition={{ type: "spring", stiffness: 420, damping: 32 }}
        className="w-[480px] bg-[#1a1818] border border-white/8 rounded-[12px] shadow-2xl overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-white/5 bg-[#1d1b20]">
          <div className="w-7 h-7 rounded-[7px] flex items-center justify-center shrink-0" style={{ background: `${item.color}18`, border: `1px solid ${item.color}30` }}>
            <Layers size={14} style={{ color: item.color }} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-['Rounded_Mplus_1c',sans-serif] text-[13px] text-white font-bold">Adding {item.title}</p>
            <p className="font-['Rounded_Mplus_1c',sans-serif] text-[10px] text-[#555]">{item.source} · {item.type}</p>
          </div>
          {step.kind === "done" && (
            <button onClick={onClose} className="text-[#555] hover:text-[#999] transition-colors"><X size={14} /></button>
          )}
        </div>

        {/* Body */}
        <div className="p-5 flex flex-col gap-4 min-h-[220px]">
          <AnimatePresence mode="wait">
            {(step.kind === "thinking" || step.kind === "resolving") && (
              <motion.div key={stepIdx} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="flex flex-col gap-4">
                {/* Spinner dots */}
                <div className="flex items-center gap-2">
                  {[0, 1, 2].map(i => (
                    <motion.div key={i}
                      animate={{ opacity: [0.2, 1, 0.2], scale: [0.8, 1.1, 0.8] }}
                      transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.18 }}
                      className="w-2 h-2 rounded-full"
                      style={{ background: item.color }}
                    />
                  ))}
                  <span className="font-['Rounded_Mplus_1c',sans-serif] text-[12px] text-[#666] ml-1">{step.label}</span>
                </div>
                {/* Log trail */}
                <div className="flex flex-col gap-1.5">
                  {ADD_FLOW_SCRIPT.slice(0, stepIdx).map((s, i) => (
                    s.kind === "thinking" || s.kind === "resolving" ? (
                      <div key={i} className="flex items-center gap-2">
                        <CheckCircle2 size={11} className="text-[#abefa3] shrink-0" />
                        <span className="font-mono text-[10px] text-[#444]">{s.label}</span>
                      </div>
                    ) : null
                  ))}
                </div>
              </motion.div>
            )}

            {step.kind === "conflict" && !resolved && (
              <motion.div key="conflict" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                className="flex flex-col gap-4">
                <div className="flex items-start gap-2.5 p-3 rounded-[8px]" style={{ background: "rgba(251,191,36,0.06)", border: "1px solid rgba(251,191,36,0.15)" }}>
                  <AlertTriangle size={14} className="text-amber-400 shrink-0 mt-0.5" />
                  <p className="font-['Rounded_Mplus_1c',sans-serif] text-[12px] text-[#ccc] leading-relaxed whitespace-pre-line">{step.question}</p>
                </div>
                <div className="flex flex-col gap-2">
                  {step.options.map((opt, i) => (
                    <button key={i} onClick={handleOption}
                      className="w-full text-left px-3.5 py-2.5 rounded-[7px] text-[12px] font-['Rounded_Mplus_1c',sans-serif] transition-all border hover:border-[#abefa3]/30 hover:bg-[#abefa3]/5 hover:text-white"
                      style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", color: "#aaa" }}>
                      <span className="text-[#555] mr-2 font-mono text-[10px]">{i + 1}.</span>{opt}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}

            {step.kind === "done" && (
              <motion.div key="done" initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center gap-3 py-4 text-center">
                <motion.div
                  initial={{ scale: 0 }} animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 400, damping: 20, delay: 0.1 }}
                  className="w-12 h-12 rounded-full flex items-center justify-center"
                  style={{ background: "rgba(171,239,163,0.12)", border: "1px solid rgba(171,239,163,0.3)" }}>
                  <CheckCircle2 size={22} className="text-[#abefa3]" />
                </motion.div>
                <p className="font-['Rounded_Mplus_1c',sans-serif] text-[13px] text-white font-bold">Added successfully</p>
                <p className="font-['Rounded_Mplus_1c',sans-serif] text-[12px] text-[#666] leading-relaxed max-w-[340px]">{step.message}</p>
                <button onClick={onClose}
                  className="mt-2 px-5 py-2 rounded-[7px] text-[12px] font-['Rounded_Mplus_1c',sans-serif] transition-all hover:opacity-90"
                  style={{ background: "#abefa3", color: "#1d1b20" }}>
                  Done
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── Emulator system ───────────────────────────────────────────────────────
// Single source of truth for all device dimensions

type EmuOrientation = "portrait" | "landscape";
type EmuType = "web" | "android" | "ios";

const EMU_DIMS: Record<EmuType, Record<EmuOrientation, { w: number; h: number; r: number }>> = {
  web:     { portrait: { w: 390, h: 720, r: 8  }, landscape: { w: 720, h: 390, r: 8  } },
  android: { portrait: { w: 400, h: 780, r: 28 }, landscape: { w: 780, h: 400, r: 20 } },
  ios:     { portrait: { w: 420, h: 860, r: 50 }, landscape: { w: 860, h: 420, r: 40 } },
};

// Renders the device shell at its exact natural dimensions — no centering wrapper, no scroll.
function DeviceFrame({ type, dim, connected, device, isLandscape, isDesktop }: {
  type: EmuType;
  dim: { w: number; h: number; r: number };
  connected: boolean; device?: string; isLandscape?: boolean; isDesktop?: boolean;
}) {
  const showBrowser = type === "web" || isDesktop;
  const iosChrome = type === "ios" && !isLandscape && !isDesktop;
  const androidNav = type === "android" && !isDesktop;

  return (
    <div style={{
      width: dim.w, height: dim.h,
      borderRadius: dim.r,
      border: "2px solid #2a2a2a",
      boxShadow: "0 0 0 1px #111, 0 32px 64px rgba(0,0,0,.65)",
      background: "#0f0f0f",
      display: "flex", flexDirection: "column",
      overflow: "hidden", flexShrink: 0, position: "relative",
    }}>
      {/* iOS Dynamic Island */}
      {iosChrome && <div style={{ position: "absolute", top: 12, left: "50%", transform: "translateX(-50%)", width: 126, height: 36, background: "#000", borderRadius: 18, zIndex: 10 }} />}

      {/* Top chrome */}
      <div style={{ background: "#0d0d0d", borderBottom: "1px solid #1e1e1e", padding: iosChrome ? "52px 12px 8px" : "8px 12px", display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
        {showBrowser ? (
          <>
            <div style={{ display: "flex", gap: 4 }}>{["#ff5f57","#febc2e","#28c840"].map(c => <div key={c} style={{ width: 10, height: 10, borderRadius: 5, background: c }} />)}</div>
            <div style={{ flex: 1, background: "#1a1a1a", borderRadius: 4, padding: "2px 10px", display: "flex", alignItems: "center", gap: 4 }}>
              <Globe size={10} color="#444" />
              <span style={{ fontFamily: "monospace", fontSize: 11, color: "#555" }}>localhost:8081</span>
            </div>
            <RefreshCw size={11} color="#444" />
          </>
        ) : (
          <>
            <span style={{ fontFamily: "monospace", fontSize: 11, color: "#777", fontWeight: 500 }}>9:41</span>
            <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 6 }}>
              {connected ? <Wifi size={12} color="#777" /> : <WifiOff size={12} color="#444" />}
              <span style={{ fontFamily: "monospace", fontSize: 11, color: "#777" }}>100%</span>
            </div>
          </>
        )}
      </div>

      {/* App viewport */}
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", background: "#0f0f0f", overflow: "hidden" }}>
        {connected ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, textAlign: "center", padding: "0 24px" }}>
            <div style={{ width: 60, height: 60, borderRadius: 16, background: "rgba(171,239,163,0.1)", border: "1px solid rgba(171,239,163,0.2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="26" height="22" viewBox="0 0 37.3892 31.5816" fill="none"><path d={svgPaths.p6491080} fill="#ABEFA3" opacity="0.9" /></svg>
            </div>
            <div>
              <p style={{ fontFamily: "'Rounded Mplus 1c',sans-serif", fontSize: 13, color: "#d9d9d9", marginBottom: 4 }}>expo-photo-share</p>
              <p style={{ fontFamily: "'Rounded Mplus 1c',sans-serif", fontSize: 11, color: "#555" }}>
                {device ? `${device} · ` : ""}Running · port 8081
              </p>
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, textAlign: "center" }}>
            <div style={{ width: 52, height: 52, borderRadius: 14, border: "1px dashed #2a2a2a", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Play size={18} color="#2a2a2a" />
            </div>
            <p style={{ fontFamily: "'Rounded Mplus 1c',sans-serif", fontSize: 12, color: "#3a3a3a" }}>Start the app to preview</p>
          </div>
        )}
      </div>

      {/* Android nav bar */}
      {androidNav && (
        <div style={{ height: 40, background: "#0d0d0d", borderTop: "1px solid #1e1e1e", display: "flex", alignItems: "center", justifyContent: "center", gap: 36, flexShrink: 0 }}>
          <div style={{ width: 16, height: 16, border: "1.5px solid #333", borderRadius: 3 }} />
          <div style={{ width: 16, height: 16, border: "1.5px solid #333", borderRadius: 8 }} />
          <div style={{ width: 16, height: 2, background: "#333", borderRadius: 2 }} />
        </div>
      )}

      {/* iOS home bar */}
      {iosChrome && (
        <div style={{ height: 32, background: "#0d0d0d", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <div style={{ width: 120, height: 4, background: "#2a2a2a", borderRadius: 2 }} />
        </div>
      )}
    </div>
  );
}

// Scales a DeviceFrame to fit a target height using CSS transform — no scrollbars.
function ScaledDevice({ type, orientation = "portrait", connected, device, isDesktop, targetH }: {
  type: EmuType; orientation?: EmuOrientation; connected: boolean;
  device?: string; isDesktop?: boolean; targetH: number;
}) {
  const dim = isDesktop
    ? { w: 960, h: 560, r: 8 }
    : EMU_DIMS[type][orientation];
  const scale = targetH > 0 ? Math.min(1, targetH / dim.h) : 1;
  const scaledW = Math.round(dim.w * scale);
  const scaledH = Math.round(dim.h * scale);

  return (
    // Outer reserves the scaled footprint; inner sits at natural size and scales down.
    <div style={{ width: scaledW, height: scaledH, flexShrink: 0, position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", top: 0, left: 0, transformOrigin: "top left", transform: `scale(${scale})` }}>
        <DeviceFrame type={type} dim={dim} connected={connected} device={device}
          isLandscape={orientation === "landscape"} isDesktop={isDesktop} />
      </div>
    </div>
  );
}

// ─── Emulator modal ────────────────────────────────────────────────────────

const TOOLBAR_H = 42;
const MODAL_PAD = 16; // breathing room around device in opened mode

function EmulatorModal({
  id,
  onClose,
  activeProjectId,
  previewVersion,
}: {
  id: WidgetId;
  onClose: () => void;
  activeProjectId?: string | null;
  previewVersion?: "v1" | "v2";
}) {
  const type: EmuType = id === "emuWeb" ? "web" : id === "emuAndroid" ? "android" : "ios";
  const label = id === "emuWeb" ? "Web Preview" : id === "emuAndroid" ? "Android" : "iOS";
  const tutorial = useTutorial();
  // Experimemo's web preview is the real iframe; its device/orientation state is shared with the inline widget.
  const isExperimemoWeb = activeProjectId === EXPERIMEMO_PROJECT_ID && type === "web";
  const [breakpoint, setBreakpoint] = useState<"mobile" | "desktop">("mobile");
  const [orientation, setOrientation] = useState<EmuOrientation>("portrait");
  const [device, setDevice] = useState(type === "android" ? ANDROID_DEVICES[0] : type === "ios" ? IOS_DEVICES[0] : "");
  const [fullscreen, setFullscreen] = useState(false);
  const bodyRef = useRef<HTMLDivElement>(null);
  const [bodySize, setBodySize] = useState({ w: 0, h: 0 });

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  // Only measure the body in fullscreen mode — in opened mode the modal is sized to the device.
  useEffect(() => {
    if (!fullscreen || !bodyRef.current) return;
    const ro = new ResizeObserver(([e]) => setBodySize({ w: e.contentRect.width, h: e.contentRect.height }));
    ro.observe(bodyRef.current);
    return () => ro.disconnect();
  }, [fullscreen]);

  const isDesktop = breakpoint === "desktop" && type === "web";
  const dim = isDesktop ? { w: 960, h: 560, r: 8 } : EMU_DIMS[type][orientation];

  // In opened mode: scale = 1, modal sized to device.
  // In fullscreen: scale to fill available body space (no upper cap — device grows).
  const scale = fullscreen && bodySize.w > 0 && bodySize.h > 0
    ? Math.min(
        (bodySize.h - MODAL_PAD * 2) / dim.h,
        (bodySize.w - MODAL_PAD * 2) / dim.w,
      )
    : 1;

  // Opened modal size: hugs the device with a little breathing room
  const openedStyle = isExperimemoWeb
    ? { width: 1040, height: 800 }
    : {
        width:  dim.w + MODAL_PAD * 2,
        height: dim.h + TOOLBAR_H + MODAL_PAD * 2,
      };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={onClose}>
      <motion.div
        initial={{ scale: 0.96 }} animate={{ scale: 1 }} exit={{ scale: 0.96 }}
        transition={{ type: "spring", stiffness: 400, damping: 30 }}
        onClick={e => e.stopPropagation()}
        className={`bg-[#1a1a1a] border border-white/8 shadow-2xl flex flex-col overflow-hidden ${
          fullscreen ? "fixed inset-0 rounded-none" : "rounded-[12px]"
        }`}
        style={fullscreen ? {} : { ...openedStyle, maxWidth: "calc(100vw - 16px)", maxHeight: "calc(100vh - 16px)" }}
      >
        {/* Toolbar */}
        <div className="flex items-center gap-3 px-4 bg-[#1d1b20] border-b border-white/5 shrink-0" style={{ height: TOOLBAR_H }}>
          <span className="font-['Rounded_Mplus_1c',sans-serif] text-[13px] text-white">{label}</span>

          {/* Experimemo web: shared Desktop/Mobile + Portrait/Landscape controls */}
          {isExperimemoWeb && (
            <PreviewViewportControls
              device={tutorial.previewDevice}
              orientation={tutorial.previewOrientation}
              onDeviceChange={tutorial.setPreviewDevice}
              onOrientationChange={tutorial.setPreviewOrientation}
            />
          )}

          {/* Web: breakpoint toggle */}
          {type === "web" && !isExperimemoWeb && (
            <div className="flex items-center gap-0.5 bg-black/30 rounded-[5px] p-0.5">
              {(["mobile", "desktop"] as const).map(bp => (
                <button key={bp} onClick={() => setBreakpoint(bp)}
                  className={`flex items-center gap-1 px-2 py-1 rounded text-[10px] font-['Rounded_Mplus_1c',sans-serif] transition-colors ${breakpoint === bp ? "bg-[#373434] text-white" : "text-[#444] hover:text-[#888]"}`}>
                  {bp === "mobile" ? <Smartphone size={10} /> : <Monitor size={10} />}{bp}
                </button>
              ))}
            </div>
          )}

          {/* Orientation toggle — all types */}
          {!isDesktop && !isExperimemoWeb && (
            <div className="flex items-center gap-0.5 bg-black/30 rounded-[5px] p-0.5">
              {(["portrait", "landscape"] as EmuOrientation[]).map(o => (
                <button key={o} onClick={() => setOrientation(o)}
                  className={`flex items-center gap-1 px-2 py-1 rounded text-[10px] font-['Rounded_Mplus_1c',sans-serif] transition-colors ${orientation === o ? "bg-[#373434] text-white" : "text-[#444] hover:text-[#888]"}`}>
                  {o === "portrait" ? <Smartphone size={10} /> : <Monitor size={10} />}{o}
                </button>
              ))}
            </div>
          )}

          {/* Device picker — Android / iOS */}
          {(type === "android" || type === "ios") && (
            <select value={device} onChange={e => setDevice(e.target.value)}
              className="bg-[#252323] border border-white/8 rounded-[5px] px-2 py-1 text-[11px] font-['Rounded_Mplus_1c',sans-serif] text-[#c5c5c5] focus:outline-none focus:border-[#abefa3]/40 transition-colors">
              {(type === "android" ? ANDROID_DEVICES : IOS_DEVICES).map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          )}

          <div className="ml-auto flex items-center gap-2">
            <button onClick={() => setFullscreen(f => !f)}
              className="text-[#555] hover:text-[#abefa3] transition-colors"
              title={fullscreen ? "Exit fullscreen" : "Fullscreen"}>
              {fullscreen ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
            </button>
            <button onClick={onClose} aria-label="Close emulator" className="text-[#555] hover:text-[#c5c5c5] transition-colors"><X size={14} /></button>
          </div>
        </div>

        {/* Device body */}
        <div ref={bodyRef} className="flex-1 flex items-center justify-center bg-[#111] overflow-hidden p-2">
          {isExperimemoWeb ? (
            <ExactWebPreviewFrame
              version={previewVersion ?? "v1"}
              device={tutorial.previewDevice}
              orientation={tutorial.previewOrientation}
              mode="fill"
              className="p-2"
            />
          ) : (
            /* Opened: render at natural size (scale=1). Fullscreen: render at computed scale. */
            (!fullscreen || bodySize.w > 0) && (
              <div style={{
                width: Math.round(dim.w * scale),
                height: Math.round(dim.h * scale),
                flexShrink: 0, position: "relative", overflow: "hidden",
              }}>
                <div style={{ position: "absolute", top: 0, left: 0, transformOrigin: "top left", transform: `scale(${scale})` }}>
                  <DeviceFrame type={type} dim={dim} connected
                    device={device} isLandscape={orientation === "landscape"} isDesktop={isDesktop} />
                </div>
              </div>
            )
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── Standard widget modal ──────────────────────────────────────────────────

function WidgetModal({ id, label, fullscreen: initialFullscreen, onClose, ctx }: {
  id: WidgetId; label: string; fullscreen: boolean; onClose: () => void; ctx: AppContext;
}) {
  const [fullscreen, setFullscreen] = useState(initialFullscreen);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={onClose}>
      <motion.div
        initial={{ scale: 0.95, y: 8 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 8 }}
        transition={{ type: "spring", stiffness: 400, damping: 30 }}
        onClick={e => e.stopPropagation()}
        className={`bg-[#1a1a1a] border border-white/8 rounded-[10px] shadow-2xl flex flex-col overflow-hidden ${fullscreen ? "fixed inset-3" : "w-[860px] h-[580px]"}`}
      >
        <div className="flex items-center justify-between px-4 py-3 bg-[#1d1b20] border-b border-white/5 shrink-0">
          <span className="font-['Rounded_Mplus_1c',sans-serif] text-[13px] text-white">{label}</span>
          <div className="flex items-center gap-2">
            {fullscreen
              ? <button onClick={() => setFullscreen(false)} className="text-[#555] hover:text-[#abefa3] transition-colors" title="Exit fullscreen"><Minimize2 size={14} /></button>
              : <button onClick={() => setFullscreen(true)} className="text-[#555] hover:text-[#abefa3] transition-colors" title="Fullscreen"><Maximize2 size={14} /></button>
            }
            <button onClick={onClose} aria-label="Close emulator" className="text-[#555] hover:text-[#c5c5c5] transition-colors"><X size={14} /></button>
          </div>
        </div>
        <div className="flex-1 min-h-0 overflow-hidden">
          <WidgetContent id={id} ctx={ctx} expanded={true} />
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── Widget shell ───────────────────────────────────────────────────────────

function Widget({ label, children, onModal, onFullscreen, accentHeader = false, className = "" }: {
  label: string; children: React.ReactNode;
  onModal: () => void; onFullscreen: () => void; accentHeader?: boolean; className?: string;
}) {
  const clickRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countRef = useRef(0);

  const handleHeaderClick = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest("button") && !(e.target as HTMLElement).closest("[data-header-root]")) return;
    countRef.current += 1;
    if (clickRef.current) clearTimeout(clickRef.current);
    clickRef.current = setTimeout(() => {
      if (countRef.current === 2) onModal();
      else if (countRef.current >= 3) onFullscreen();
      countRef.current = 0;
    }, 260);
  };

  return (
    <div className={`flex flex-col rounded-[6px] overflow-hidden border border-white/5 shadow-md ${className}`}>
      <div data-header-root
        onClick={handleHeaderClick}
        className={`flex items-center justify-between px-3 py-[7px] shrink-0 border-b border-white/5 cursor-pointer select-none group transition-colors ${accentHeader ? "bg-[#abefa3]/8 hover:bg-[#abefa3]/12" : "bg-[#1d1b20] hover:bg-[#252323]"}`}
        title="Double-click to expand · Triple-click for fullscreen"
      >
        <div className="flex items-center gap-2">
          <GripVertical size={12} className="text-[#2a2a2a] group-hover:text-[#444] transition-colors" />
          <span className={`font-['Rounded_Mplus_1c',sans-serif] text-[11px] uppercase tracking-wide ${accentHeader ? "text-[#abefa3]" : "text-[#777] group-hover:text-[#aaa]"} transition-colors`}>{label}</span>
        </div>
        <button onClick={e => { e.stopPropagation(); onModal(); }} className="opacity-0 group-hover:opacity-100 text-[#444] hover:text-[#abefa3] transition-all p-0.5">
          <Maximize2 size={10} />
        </button>
      </div>
      {children}
    </div>
  );
}

// ─── Widgets picker ─────────────────────────────────────────────────────────

function WidgetsPicker({ onOpen }: { onOpen: (w: WidgetDef) => void }) {
  return (
    <div className="flex flex-col rounded-[6px] overflow-hidden border border-white/5 flex-1 min-h-0">
      <div className="flex items-center gap-2 px-3 py-[7px] bg-[#1d1b20] border-b border-white/5 shrink-0">
        <GripVertical size={12} className="text-[#2a2a2a]" />
        <span className="font-['Rounded_Mplus_1c',sans-serif] text-[11px] uppercase tracking-wide text-[#777]">Widgets</span>
      </div>
      <div className="bg-[#252323] p-2 grid grid-cols-3 gap-1.5 overflow-y-auto flex-1 min-h-0">
        {ALL_WIDGETS.map(w => (
          <button key={w.id} onClick={() => onOpen(w)}
            className="flex flex-col items-center gap-1.5 p-2.5 rounded-[6px] bg-[#1d1b20] border border-white/5 hover:border-[#abefa3]/25 hover:bg-[#252323] transition-all group"
            title={w.description}>
            <span className="text-[#555] group-hover:text-[#abefa3] transition-colors">{w.icon}</span>
            <span className="font-['Rounded_Mplus_1c',sans-serif] text-[9px] text-[#444] group-hover:text-[#777] transition-colors text-center leading-tight">{w.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── App context type ───────────────────────────────────────────────────────

interface AppContext {
  tree: FileNode[];
  goal: string; phase: SessionPhase;
  currentProject: string;
  agentTasks: CheckItem[]; toggleAgentTask: (id: string) => void; addAgentTask: (t: string) => void; deleteAgentTask: (id: string) => void;
  humanTests: CheckItem[]; toggleHumanTest: (id: string) => void; addHumanTest: (t: string) => void; deleteHumanTest: (id: string) => void;
  diffs: DiffFile[];
  emuConnected: boolean;
  sendMessage: (text: string) => void;
  globalTodos?: GlobalTodoItem[];
  toggleGlobalTodo?: (id: string) => void;
  addGlobalTodo?: (text: string, category: "project" | "general", projectId?: string, projectName?: string, sessionId?: string) => void;
  deleteGlobalTodo?: (id: string) => void;
  onNavigateProject?: (projectId: string) => void;
}

// ─── Left sidebar ───────────────────────────────────────────────────────────

function LeftColumn({ ctx, setGoal, openModal, openFullscreen }: {
  ctx: AppContext; setGoal: (g: string) => void;
  openModal: (id: WidgetId, label: string) => void;
  openFullscreen: (id: WidgetId, label: string) => void;
}) {
  return (
    <div className="w-[236px] shrink-0 flex flex-col gap-2.5 overflow-hidden min-h-0">
      {/* Explorer */}
      <Widget label="Explorer" onModal={() => openModal("explorer","Explorer")} onFullscreen={() => openFullscreen("explorer","Explorer")}>
        <div className="bg-[#252323] overflow-y-auto py-1 px-1 max-h-60">
          <ExplorerContent tree={ctx.tree} />
        </div>
      </Widget>

      {/* Project Folder */}
      <Widget label="Project Folder" accentHeader onModal={() => openModal("projectFolder","Project Folder")} onFullscreen={() => openFullscreen("projectFolder","Project Folder")}>
        <div className="bg-[#252323]">
          {["Info.md","Todo.md","Style.md","Guidelines.md"].map(f => (
            <div key={f} className="flex items-center gap-2 px-3 py-1.5 hover:bg-white/5 transition-colors cursor-pointer group">
              <FileText size={12} className="text-[#abefa3]/50 shrink-0" />
              <span className="font-['Rounded_Mplus_1c',sans-serif] text-[11px] text-[#c5c5c5] group-hover:text-white">{f}</span>
            </div>
          ))}
        </div>
      </Widget>

      {/* Current Goal */}
      <Widget label="Current Goal" onModal={() => openModal("currentGoal","Current Goal")} onFullscreen={() => openFullscreen("currentGoal","Current Goal")}>
        <div className="bg-[#252323] px-3 py-2.5">
          <GoalEditor goal={ctx.goal} onEdit={setGoal} />
        </div>
      </Widget>

      {/* Agent Tasks — fills remaining space to the bottom */}
      <Widget label="Agent Tasks" className="flex-1 min-h-0" onModal={() => openModal("agentTasks","Agent Tasks")} onFullscreen={() => openFullscreen("agentTasks","Agent Tasks")}>
        <div className="bg-[#252323] flex-1 overflow-y-auto min-h-0">
          <Checklist items={ctx.agentTasks} onToggle={ctx.toggleAgentTask} onAdd={ctx.addAgentTask} onDelete={ctx.deleteAgentTask} />
        </div>
      </Widget>
    </div>
  );
}

function GoalEditor({ goal, onEdit }: { goal: string; onEdit: (g: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(goal);
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => { if (editing) ref.current?.focus(); }, [editing]);
  return editing ? (
    <div className="flex gap-1.5">
      <input ref={ref} value={draft} onChange={e => setDraft(e.target.value)}
        onKeyDown={e => { if (e.key === "Enter") { onEdit(draft); setEditing(false); } if (e.key === "Escape") setEditing(false); }}
        className="flex-1 bg-[#1d1b20] border border-[#abefa3]/30 rounded px-2 py-1 text-[11px] font-['Rounded_Mplus_1c',sans-serif] text-white focus:outline-none" />
      <button onClick={() => { onEdit(draft); setEditing(false); }} className="text-[#abefa3]"><Check size={12} /></button>
    </div>
  ) : (
    <div className="flex items-start gap-2">
      <p className="flex-1 font-['Rounded_Mplus_1c',sans-serif] text-[11px] text-[#c5c5c5] leading-relaxed">{goal}</p>
      <button onClick={() => setEditing(true)} className="text-[#444] hover:text-[#abefa3] transition-colors mt-0.5 shrink-0"><Pencil size={11} /></button>
    </div>
  );
}

// ─── Right sidebar ──────────────────────────────────────────────────────────

function RightColumn({ ctx, openModal, openFullscreen, openWidgetFromPicker }: {
  ctx: AppContext;
  openModal: (id: WidgetId, label: string) => void;
  openFullscreen: (id: WidgetId, label: string) => void;
  openWidgetFromPicker: (w: WidgetDef) => void;
}) {
  return (
    <div className="w-[272px] shrink-0 flex flex-col gap-2.5 overflow-hidden min-h-0">
      {/* Human Testing */}
      <Widget label={`Human Testing ${ctx.humanTests.filter(i=>i.done).length}/${ctx.humanTests.length}`}
        onModal={() => openModal("humanTesting","Human Testing")} onFullscreen={() => openFullscreen("humanTesting","Human Testing")}>
        <div className="bg-[#252323] max-h-52 overflow-y-auto">
          <Checklist items={ctx.humanTests} onToggle={ctx.toggleHumanTest} onAdd={ctx.addHumanTest} onDelete={ctx.deleteHumanTest} />
        </div>
      </Widget>

      {/* Git */}
      <Widget label="Current Diffs" onModal={() => openModal("git","Current Diffs")} onFullscreen={() => openFullscreen("git","Current Diffs")}>
        <div className="bg-[#252323] max-h-72 overflow-y-auto">
          <GitContent commitDiffs={ctx.diffs} branchDiffs={BRANCH_DIFFS} />
        </div>
      </Widget>

      {/* Widgets — fills remaining height */}
      <WidgetsPicker onOpen={openWidgetFromPicker} />
    </div>
  );
}

// ─── Chat ───────────────────────────────────────────────────────────────────

function highlightText(text: string, query: string): React.ReactNode {
  if (!query.trim()) return text;
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const parts = text.split(new RegExp(`(${escaped})`, "gi"));
  return parts.map((part, i) =>
    part.toLowerCase() === query.toLowerCase()
      ? <mark key={i} className="bg-[#abefa3]/35 text-[#abefa3] rounded-[2px] not-italic">{part}</mark>
      : part
  );
}

function ChatBubble({ msg, searchQuery = "" }: { msg: Message; searchQuery?: string }) {
  const isUser = msg.role === "user";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"} mb-2`}>
      <div className={`max-w-[86%] rounded-[8px] px-3 py-2 text-[12px] font-['Rounded_Mplus_1c',sans-serif] leading-relaxed ${isUser ? "bg-[#abefa3] text-[#1d1b20]" : "bg-[#2a2828] text-[#d9d9d9] border border-white/6"}`}>
        {highlightText(msg.content, searchQuery)}
      </div>
    </div>
  );
}

type StartMode = "go" | "build" | "serve";
const START_MODES: { id: StartMode; label: string; sublabel: string; desc: string }[] = [
  { id: "go",    label: "Start App", sublabel: "Go",    desc: "Expo Go — instant start, no build required" },
  { id: "build", label: "Start App", sublabel: "Build", desc: "Dev Build — custom native modules" },
  { id: "serve", label: "Start App", sublabel: "Serve", desc: "Expo Serve — web server mode" },
];

function AppRunControls({ running, onStart, onRestart, onStop, compact = false }: {
  running: boolean; onStart: () => void; onRestart: () => void; onStop: () => void; compact?: boolean;
}) {
  const [mode, setMode] = useState<StartMode>("go");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!dropdownOpen) return;
    const handler = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setDropdownOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [dropdownOpen]);

  const currentMode = START_MODES.find(m => m.id === mode)!;

  if (!running) {
    return (
      <div ref={ref} className="relative flex items-stretch">
        {/* Main start button */}
        <button
          onClick={onStart}
          className={`${compact ? "h-7 pl-2.5 pr-2" : "h-8 pl-3 pr-2"} flex items-center gap-1.5 rounded-l-[5px] bg-[#abefa3]/15 border border-r-0 border-[#abefa3]/30 text-[#abefa3] hover:bg-[#abefa3]/25 font-['Rounded_Mplus_1c',sans-serif] transition-colors`}>
          <Play size={11} />
          <span className="text-[11px]">Start App</span>
          {/* Mode badge inside the button */}
          <span className="text-[9px] bg-[#abefa3]/20 border border-[#abefa3]/30 rounded-[3px] px-1.5 py-0.5 leading-none ml-0.5">
            {currentMode.sublabel}
          </span>
        </button>
        {/* Chevron dropdown trigger */}
        <button
          onClick={() => setDropdownOpen(o => !o)}
          className={`${compact ? "h-7" : "h-8"} px-1.5 flex items-center justify-center rounded-r-[5px] bg-[#abefa3]/15 border border-[#abefa3]/30 text-[#abefa3] hover:bg-[#abefa3]/25 transition-colors border-l border-[#abefa3]/20`}>
          <ChevronDown size={11} />
        </button>
        {/* Dropdown */}
        {dropdownOpen && (
          <div className="absolute bottom-full left-0 mb-1 z-50 bg-[#1d1b20] border border-white/10 rounded-[6px] shadow-xl overflow-hidden min-w-[190px]">
            {START_MODES.map(m => (
              <button key={m.id} onClick={() => { setMode(m.id); setDropdownOpen(false); }}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-left hover:bg-white/5 transition-colors ${mode === m.id ? "bg-[#abefa3]/8" : ""}`}>
                <span className={`text-[10px] font-['Rounded_Mplus_1c',sans-serif] border rounded-[3px] px-1.5 py-0.5 leading-none shrink-0 w-10 text-center ${mode === m.id ? "bg-[#abefa3]/20 border-[#abefa3]/40 text-[#abefa3]" : "border-white/10 text-[#666]"}`}>
                  {m.sublabel}
                </span>
                <span className="font-['Rounded_Mplus_1c',sans-serif] text-[11px] text-[#c5c5c5] leading-snug">{m.desc}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={`${compact ? "w-[86px]" : "w-[140px]"} h-8 grid grid-cols-2 gap-1`}>
      <button onClick={onRestart} title="Restart app"
        className="flex items-center justify-center rounded-[5px] bg-[#abefa3]/12 border border-[#abefa3]/25 text-[#abefa3] hover:bg-[#abefa3]/22 transition-colors">
        <RefreshCw size={12} />
      </button>
      <button onClick={onStop} title="Stop app"
        className="flex items-center justify-center rounded-[5px] bg-red-400/10 border border-red-400/20 text-red-300 hover:bg-red-400/18 transition-colors">
        <Square size={11} fill="currentColor" />
      </button>
    </div>
  );
}

function ChatPanel({ messages, phase, onSend, searchQuery = "", appRunning, onStartApp, onRestartApp, onStopApp, actionButtons }: {
  messages: Message[]; phase: SessionPhase; onSend: (t: string) => void; searchQuery?: string;
  appRunning: boolean; onStartApp: () => void; onRestartApp: () => void; onStopApp: () => void; actionButtons: ActionButtonDef[];
}) {
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);
  const send = () => { if (!input.trim()) return; onSend(input.trim()); setInput(""); };

  return (
    <div className="flex flex-col h-full rounded-[6px] overflow-hidden border border-white/5 shadow-lg">
      <div className="flex-1 overflow-y-auto bg-[#373434] px-4 py-4 min-h-0">
        {messages.map(m => <ChatBubble key={m.id} msg={m} searchQuery={searchQuery} />)}
        <div ref={bottomRef} />
      </div>
      <div className="bg-[#2a2828] border-t border-white/5 flex flex-col">
        <div className="px-3 pt-2.5 pb-2 flex gap-2 flex-wrap">
          <AppRunControls running={appRunning} onStart={onStartApp} onRestart={onRestartApp} onStop={onStopApp} />
          {actionButtons.map(btn => (
            <button key={btn.label} onClick={() => onSend(btn.cmd)}
              className={`h-8 flex items-center gap-1.5 px-2.5 rounded-[5px] text-[11px] font-['Rounded_Mplus_1c',sans-serif] transition-colors border ${btn.accent ? "bg-orange-500/15 border-orange-500/30 text-orange-400 hover:bg-orange-500/25" : "bg-white/4 border-white/8 text-[#aaa] hover:text-white hover:bg-white/8"}`}>
              {btn.icon}{btn.label}
            </button>
          ))}
        </div>
        <div className="mx-3 border-t border-white/8" />
        <div className="px-3 pb-3 pt-2.5 relative">
          <textarea value={input} onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) send(); }}
            placeholder="Message the agent…  ⌘↩ to send" rows={4}
            className="w-full bg-[#1d1b20] border border-white/10 rounded-[6px] px-3 py-2.5 pr-11 text-[12px] font-['Rounded_Mplus_1c',sans-serif] text-white placeholder-[#444] resize-none focus:outline-none focus:border-[#abefa3]/35 transition-colors" />
          <button onClick={send} className="absolute right-5 bottom-5 w-7 h-7 rounded-[5px] bg-[#abefa3] text-[#1d1b20] flex items-center justify-center hover:bg-[#8de085] transition-colors">
            <Send size={13} />
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Chat section (tab strip + search + fullscreen) ─────────────────────────

// ─── Infie identity ────────────────────────────────────────────────────────

const INFIE_TEAL = "#2dd4bf";

const INIT_INFIE_MESSAGES: Message[] = [
  { id: "i1", role: "assistant", content: "Session initialised. Scanning `expo-photo-share/project/Todo.md`… found 3 open tasks, 2 completed." },
  { id: "i2", role: "assistant", content: "Worktree `feature/photo-share` is active. Claude is working on `PhotoPicker.tsx` and `usePhotoShare.ts`. No conflicts between worktrees detected." },
  { id: "i3", role: "assistant", content: "Emulator connected on port 8081. Doctor passed all checks. Handing control to session agent." },
];

function InfieAvatar({ size = 20 }: { size?: number }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: size * 0.4,
      background: `${INFIE_TEAL}18`, border: `1px solid ${INFIE_TEAL}40`,
      display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
    }}>
      <span style={{ fontSize: size * 0.48, fontWeight: 800, color: INFIE_TEAL, fontFamily: "'Rounded Mplus 1c',sans-serif", lineHeight: 1 }}>I</span>
    </div>
  );
}

function InfieChatPanel({ onSend }: { onSend: (t: string) => void }) {
  const [messages, setMessages] = useState<Message[]>(INIT_INFIE_MESSAGES);
  const [draft, setDraft] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const send = () => {
    const text = draft.trim();
    if (!text) return;
    setDraft("");
    setMessages(ms => [...ms, { id: uid(), role: "user", content: text }]);
    setTimeout(() => {
      let reply = "Understood. Coordinating with the session agent.";
      const t = text.toLowerCase();
      if (t.includes("worktree") || t.includes("branch"))
        reply = "Scanning active worktrees… `feature/photo-share` is ahead of `main` by 4 commits. No merge conflicts.";
      else if (t.includes("agent") || t.includes("claude") || t.includes("codex"))
        reply = "Claude is active in worktree-1 working on the PhotoPicker component. Codex is idle. I can spin up a second agent if needed.";
      else if (t.includes("scan") || t.includes("project"))
        reply = "Re-scanning `expo-photo-share/project/`… Todo.md: 3 open / 2 done. Style.md: last updated 2h ago. No drift detected.";
      else if (t.includes("conflict"))
        reply = "No merge conflicts detected across worktrees. `PhotoPicker.tsx` is only modified in worktree-1.";
      setMessages(ms => [...ms, { id: uid(), role: "assistant", content: reply }]);
    }, 600);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Infie identity bar */}
      <div className="flex items-center gap-2.5 px-4 py-2 border-b shrink-0" style={{ borderColor: `${INFIE_TEAL}18`, background: `${INFIE_TEAL}05` }}>
        <InfieAvatar size={22} />
        <div>
          <p className="font-['Rounded_Mplus_1c',sans-serif] text-[12px] font-bold" style={{ color: INFIE_TEAL }}>Infie</p>
          <p className="font-['Rounded_Mplus_1c',sans-serif] text-[9px] text-[#555]">IDE Orchestrator · coordinates agents, worktrees &amp; project memory</p>
        </div>
        <div className="ml-auto flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full" style={{ background: INFIE_TEAL }} />
          <span className="font-['Rounded_Mplus_1c',sans-serif] text-[9px]" style={{ color: INFIE_TEAL }}>Active</span>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-4">
        {messages.map(msg => (
          <div key={msg.id} className={`flex gap-2.5 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
            {msg.role === "assistant"
              ? <InfieAvatar size={26} />
              : <div className="w-[26px] h-[26px] rounded-[6px] bg-white/6 border border-white/8 flex items-center justify-center shrink-0"><User size={13} className="text-[#888]" /></div>
            }
            <div className={`max-w-[80%] rounded-[10px] px-3.5 py-2.5 text-[12px] font-['Rounded_Mplus_1c',sans-serif] leading-relaxed ${
              msg.role === "user"
                ? "bg-[#373434] text-[#c5c5c5] rounded-tr-[3px]"
                : "rounded-tl-[3px] text-[#c5c5c5]"
            }`} style={msg.role === "assistant" ? { background: `${INFIE_TEAL}0d`, border: `1px solid ${INFIE_TEAL}20` } : {}}>
              {msg.content}
            </div>
          </div>
        ))}
      </div>

      {/* Input */}
      <div className="px-4 py-3 border-t border-white/5 shrink-0">
        <div className="flex items-end gap-2 rounded-[8px] px-3 py-2 border focus-within:border-opacity-60 transition-colors"
          style={{ background: "#252323", border: `1px solid ${INFIE_TEAL}25` }}>
          <textarea value={draft} onChange={e => setDraft(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); send(); } }}
            placeholder="Ask Infie to coordinate, scan, or switch agents… (⌘↵)"
            rows={1} style={{ resize: "none" }}
            className="flex-1 bg-transparent text-[12px] font-['Rounded_Mplus_1c',sans-serif] text-white placeholder-[#444] border-none outline-none leading-relaxed" />
          <button onClick={send}
            className="shrink-0 w-7 h-7 rounded-[6px] flex items-center justify-center transition-all hover:opacity-90 active:scale-95"
            style={{ background: draft.trim() ? INFIE_TEAL : "rgba(255,255,255,0.05)", color: draft.trim() ? "#0f1f1e" : "#444" }}>
            <Send size={13} />
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Chat section with Infie tab ────────────────────────────────────────────

type ChatTab = "infie" | "session";

function ChatSection({ messages, phase, onSend, appRunning, onStartApp, onRestartApp, onStopApp, actionButtons }: {
  messages: Message[]; phase: SessionPhase; onSend: (t: string) => void;
  appRunning: boolean; onStartApp: () => void; onRestartApp: () => void; onStopApp: () => void; actionButtons: ActionButtonDef[];
}) {
  const [activeTab, setActiveTab] = useState<ChatTab>("infie");
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [chatFullscreen, setChatFullscreen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (searchOpen) searchInputRef.current?.focus();
    else setSearchQuery("");
  }, [searchOpen]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (chatFullscreen) setChatFullscreen(false);
        else if (searchOpen) setSearchOpen(false);
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "f") {
        e.preventDefault();
        setSearchOpen(o => !o);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [chatFullscreen, searchOpen]);

  const visibleMessages = searchQuery.trim()
    ? messages.filter(m => m.content.toLowerCase().includes(searchQuery.toLowerCase()))
    : messages;
  const matchCount = searchQuery.trim() ? visibleMessages.length : 0;

  const tabStrip = (
    <div className="flex items-stretch bg-[#1d1b20] border-b border-white/5 px-1 shrink-0 rounded-t-[6px] overflow-x-auto">

      {/* ── Infie tab — always leftmost ── */}
      <button
        onClick={() => setActiveTab("infie")}
        className="flex items-center gap-1.5 px-3 py-[9px] text-[11px] font-['Rounded_Mplus_1c',sans-serif] shrink-0 transition-colors border-b-2 relative"
        style={{
          color: activeTab === "infie" ? INFIE_TEAL : "#555",
          borderBottomColor: activeTab === "infie" ? INFIE_TEAL : "transparent",
          background: activeTab === "infie" ? `${INFIE_TEAL}08` : "transparent",
        }}
      >
        <InfieAvatar size={14} />
        <span>Infie</span>
        {/* Always-on pulse dot when active */}
        {activeTab !== "infie" && (
          <span className="w-1 h-1 rounded-full ml-0.5 shrink-0" style={{ background: INFIE_TEAL, opacity: 0.7 }} />
        )}
      </button>

      {/* ── Divider ── */}
      <div className="w-px my-2 shrink-0" style={{ background: "rgba(255,255,255,0.06)" }} />

      {/* ── Session tab ── */}
      <button
        onClick={() => setActiveTab("session")}
        className={`flex items-center gap-1.5 px-3 py-[9px] text-[11px] font-['Rounded_Mplus_1c',sans-serif] shrink-0 transition-colors border-b-2 ${
          activeTab === "session"
            ? "text-[#abefa3] border-[#abefa3] bg-[#abefa3]/5"
            : "text-[#444] border-transparent hover:text-[#888]"
        }`}
      >
        <LayoutDashboard size={11} />
        <span>Sending photos feature</span>
      </button>

      <div className="flex items-center gap-1.5 px-3 py-[9px] text-[11px] font-['Rounded_Mplus_1c',sans-serif] text-[#333] hover:text-[#555] cursor-pointer transition-colors border-b-2 border-transparent shrink-0">
        <LayoutDashboard size={11} /><span>Fix dark mode on iOS</span>
      </div>

      {/* ── Right actions ── */}
      <div className="ml-auto flex items-center gap-0.5 px-2 shrink-0">
        {activeTab === "session" && (
          <button
            onClick={() => setSearchOpen(o => !o)}
            title="Search conversation  ⌘F"
            className={`p-1.5 rounded-[4px] transition-colors ${
              searchOpen ? "text-[#abefa3] bg-[#abefa3]/10" : "text-[#555] hover:text-[#abefa3] hover:bg-white/5"
            }`}
          >
            <Search size={13} />
          </button>
        )}
        <button
          onClick={() => setChatFullscreen(f => !f)}
          title={chatFullscreen ? "Exit fullscreen  Esc" : "Fullscreen"}
          className="p-1.5 rounded-[4px] text-[#555] hover:text-[#abefa3] hover:bg-white/5 transition-colors"
        >
          {chatFullscreen ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
        </button>
      </div>
    </div>
  );

  const searchBar = searchOpen && activeTab === "session" && (
    <div className="flex items-center gap-2 px-3 py-2 bg-[#1d1b20] border-b border-white/5 shrink-0">
      <Search size={12} className="text-[#555] shrink-0" />
      <input
        ref={searchInputRef}
        value={searchQuery}
        onChange={e => setSearchQuery(e.target.value)}
        placeholder="Search messages…"
        className="flex-1 bg-transparent text-[12px] font-['Rounded_Mplus_1c',sans-serif] text-white placeholder-[#444] border-none outline-none"
      />
      {searchQuery.trim() && (
        <span className="font-['Rounded_Mplus_1c',sans-serif] text-[10px] text-[#555] shrink-0 whitespace-nowrap">
          {matchCount} {matchCount === 1 ? "result" : "results"}
        </span>
      )}
      <button onClick={() => setSearchOpen(false)} className="text-[#555] hover:text-[#aaa] transition-colors shrink-0">
        <X size={12} />
      </button>
    </div>
  );

  const content = (
    <>
      {tabStrip}
      {searchBar}
      <div className="flex-1 min-h-0 overflow-hidden">
        <AnimatePresence mode="wait">
          {activeTab === "infie" ? (
            <motion.div key="infie" className="h-full" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
              <InfieChatPanel onSend={onSend} />
            </motion.div>
          ) : (
            <motion.div key="session" className="h-full" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
              <ChatPanel messages={visibleMessages} phase={phase} onSend={onSend} searchQuery={searchQuery} appRunning={appRunning} onStartApp={onStartApp} onRestartApp={onRestartApp} onStopApp={onStopApp} actionButtons={actionButtons} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );

  return (
    <div className={chatFullscreen
      ? "fixed inset-0 z-40 flex flex-col bg-[#3d3b3b]"
      : "flex-1 flex flex-col min-h-0 min-w-0"
    }>
      {content}
    </div>
  );
}

// ─── Screen 2 emulator canvas ──────────────────────────────────────────────

const CANVAS_DEVICES: { id: WidgetId; label: string; type: EmuType; port: number }[] = [
  { id: "emuWeb",     label: "Web (Mobile)", type: "web",     port: 8081 },
  { id: "emuAndroid", label: "Android",      type: "android", port: 8081 },
  { id: "emuIos",     label: "iOS",          type: "ios",     port: 8082 },
];

function EmulatorCanvas({ connected, openEmuModal }: {
  connected: boolean;
  openEmuModal: (id: WidgetId) => void;
}) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [canvasH, setCanvasH] = useState(0);

  useEffect(() => {
    if (!canvasRef.current) return;
    const ro = new ResizeObserver(([e]) => setCanvasH(e.contentRect.height));
    ro.observe(canvasRef.current);
    return () => ro.disconnect();
  }, []);

  // Tallest portrait device is iOS at 860px. Leave 56px for label + url bar.
  const targetH = Math.max(0, canvasH - 56);

  return (
    <div ref={canvasRef} className="flex-1 flex items-center justify-center gap-12 px-8 overflow-hidden bg-[#2a2828]">
      {canvasH > 0 && CANVAS_DEVICES.map(({ id, label, type, port }) => (
        <div key={id} className="flex flex-col items-center gap-3" style={{ flexShrink: 0 }}>
          {/* Floating label / double-click target */}
          <button
            onDoubleClick={() => openEmuModal(id)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-[6px] bg-[#1d1b20] border border-white/5 hover:bg-[#252323] transition-colors group select-none"
            title="Double-click to expand"
          >
            {type === "web" ? <Globe size={12} className="text-[#abefa3]" /> : <Smartphone size={12} className="text-[#abefa3]" />}
            <span className="font-['Rounded_Mplus_1c',sans-serif] text-[11px] text-[#c5c5c5]">{label}</span>
            <div className={`w-1.5 h-1.5 rounded-full ml-1 ${connected ? "bg-[#abefa3]" : "bg-[#444]"}`} />
            <Maximize2 size={11} className="ml-1 text-[#444] opacity-0 group-hover:opacity-100 hover:text-[#abefa3] transition-all" />
          </button>

          {/* Device — scaled to fill canvas height with no scrollbar */}
          <ScaledDevice type={type} orientation="portrait" connected={connected} targetH={targetH} />

          {/* URL bar below */}
          <div style={{ display: "flex", alignItems: "center", gap: 6, width: "100%" }}>
            <input defaultValue={`localhost:${port}`}
              style={{ flex: 1, background: "#1d1b20", border: "1px solid #252525", borderRadius: 4, padding: "3px 8px", fontSize: 11, fontFamily: "monospace", color: "#666", outline: "none" }} />
            <RefreshCw size={12} color="#444" style={{ cursor: "pointer", flexShrink: 0 }} />
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Status & TopBar ────────────────────────────────────────────────────────

function StatusBar({ phase, branch }: { phase: SessionPhase; branch: string }) {
  return (
    <div className="h-[22px] bg-[#1d1b20] border-t border-white/5 flex items-center px-3 gap-4 shrink-0">
      <div className="flex items-center gap-1.5">
        <GitBranch size={11} className="text-[#555]" />
        <span className="font-mono text-[10px] text-[#777]">{branch}</span>
      </div>
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1"><AlertTriangle size={10} className="text-red-400" /><span className="font-mono text-[10px] text-[#555]">1</span></div>
        <div className="flex items-center gap-1"><AlertTriangle size={10} className="text-yellow-400" /><span className="font-mono text-[10px] text-[#555]">2</span></div>
      </div>
      <div className="ml-auto flex items-center gap-3">
        <span className="font-['Rounded_Mplus_1c',sans-serif] text-[10px] text-[#555]">TypeScript</span>
        <span className="font-['Rounded_Mplus_1c',sans-serif] text-[10px] text-[#555]">UTF-8</span>
        <div className={`px-2 rounded-sm text-[10px] font-['Rounded_Mplus_1c',sans-serif] ${PHASE_COLOR[phase]}`}>{PHASE_LABEL[phase]}</div>
      </div>
    </div>
  );
}

const headerAssetPrefix = assetUrl("/assets");
const imgHeaderIcon = `${headerAssetPrefix}/92566.svg`;
const imgHeaderGames = `${headerAssetPrefix}/b9baf.svg`;
const imgHeaderWorkspace = `${headerAssetPrefix}/faa63.svg`;
const imgHeaderEmulators = `${headerAssetPrefix}/d0c3e.svg`;
const imgHeaderBell = `${headerAssetPrefix}/6b310.svg`;
const imgHeaderSettings = `${headerAssetPrefix}/6964b.svg`;

type HeaderScreenLevel = "home" | "project" | "session";

interface HeaderProps {
  className?: string;
  level?: string;
  activeLevel?: HeaderScreenLevel;
  projectLabel?: string;
  projectIcon?: React.ReactNode;
  sessionLabel?: string;
  sessionIcon?: React.ReactNode;
  onHome?: () => void;
  onOpenProject?: () => void;
  onOpenSession?: () => void;
  tab?: "Workspace" | "Emulators";
  onTabChange?: (tab: "Workspace" | "Emulators") => void;
  rightSlot?: React.ReactNode;
  onTutorials?: () => void;
  onWidgets?: () => void;
  onNotifications?: () => void;
  onSettings?: () => void;
  onScopeNotice?: (msg: string) => void;
  showHeaderControls?: boolean;
  showBreadcrumbs?: boolean;
  showTutorialsWidgetsGames?: boolean;
  showNotificationsSettings?: boolean;
  showLevelIndicator?: boolean;
  showTutorialsEntry?: boolean;
  animateIntro?: boolean;
  levelUpFlourish?: boolean;
  levelUpStage?: LevelUpAnimationStage;
  switchableProjects?: ProtoProject[];
  onSwitchProject?: (p: ProtoProject) => void;
  allSessions?: ProtoSession[];
  onSelectSession?: (s: ProtoSession) => void;
  currentProjectId?: string | null;
  levelPillDocked?: boolean;
  breadcrumbsDocked?: boolean;
  tutorialsWidgetsGamesDocked?: boolean;
  notificationsSettingsDocked?: boolean;
  highlightHomeNav?: boolean;
  highlightTutorialsNav?: boolean;
  disabled?: boolean;
}

// Animates a persistent Header element from a larger centered spotlight position
// into its exact docked Header slot without swapping DOM nodes.
function SpotlightToDock({
  children,
  animateIntro = false,
  spotlightScale = 1.6,
  spotlightY = 280,
  docked: controlledDocked,
  side = "auto",
}: {
  children: React.ReactNode;
  animateIntro?: boolean;
  spotlightScale?: number;
  spotlightY?: number;
  docked?: boolean;
  side?: "left" | "right" | "auto";
}) {
  const reduced = usePrefersReducedMotion();
  const shouldSpot = animateIntro && !reduced;
  const nodeRef = useRef<HTMLDivElement | null>(null);
  const measuredRef = useRef(false);
  const hasDockedRef = useRef<boolean>(!shouldSpot || controlledDocked === true);
  const [offset, setOffset] = useState<{ dx: number; dy: number } | null>(null);
  const [internalDocked, setInternalDocked] = useState<boolean>(
    () => !shouldSpot || controlledDocked === true
  );
  const docked = hasDockedRef.current
    ? true
    : controlledDocked !== undefined
    ? controlledDocked
    : internalDocked;

  if (docked) {
    hasDockedRef.current = true;
  }

  useLayoutEffect(() => {
    if (!shouldSpot || hasDockedRef.current || measuredRef.current || !nodeRef.current) {
      if (!shouldSpot || controlledDocked === true) {
        hasDockedRef.current = true;
        setInternalDocked(true);
      }
      return;
    }
    measuredRef.current = true;
    const rect = nodeRef.current.getBoundingClientRect();
    const dockCenterX = rect.left + rect.width / 2;
    const dockCenterY = rect.top + rect.height / 2;
    const vw = window.innerWidth;
    const effectiveSide = side === "auto" ? (dockCenterX > vw / 2 ? "right" : "left") : side;
    const spotlightCenterX =
      effectiveSide === "right"
        ? Math.min(vw - 80, Math.round(vw / 2 + 270 + 85))
        : Math.max(140, Math.round(vw / 2 - 270 - 200));
    setOffset({
      dx: Math.round(spotlightCenterX - dockCenterX),
      dy: Math.round(spotlightY - dockCenterY),
    });
    setInternalDocked(false);
  }, [shouldSpot, spotlightY, side, controlledDocked]);

  useEffect(() => {
    if (!shouldSpot || hasDockedRef.current || controlledDocked !== undefined || !offset) {
      return;
    }
    const timer = window.setTimeout(() => {
      hasDockedRef.current = true;
      setInternalDocked(true);
    }, 1500);
    return () => window.clearTimeout(timer);
  }, [shouldSpot, controlledDocked, offset]);

  if (!shouldSpot || !offset) {
    return (
      <div
        ref={nodeRef}
        data-docked={docked ? "true" : "false"}
        className="inline-flex items-center shrink-0"
        style={{ opacity: shouldSpot && !docked ? 0 : 1 }}
      >
        {children}
      </div>
    );
  }

  const targetX = docked ? 0 : offset.dx;
  const targetY = docked ? 0 : offset.dy;
  const targetScale = docked ? 1 : spotlightScale;

  return (
    <motion.div
      ref={nodeRef}
      data-docked={docked ? "true" : "false"}
      className="inline-flex items-center shrink-0"
      initial={{ opacity: 0, x: offset.dx, y: offset.dy, scale: spotlightScale }}
      animate={{ opacity: 1, x: targetX, y: targetY, scale: targetScale }}
      transition={{
        opacity: { duration: 0.35 },
        x: { duration: 0.75, ease: [0.22, 1, 0.36, 1] },
        y: { duration: 0.75, ease: [0.22, 1, 0.36, 1] },
        scale: { duration: 0.75, ease: [0.22, 1, 0.36, 1] },
      }}
      style={{
        position: "relative",
        zIndex: docked ? "auto" : 50,
        transformOrigin: "center center",
      }}
    >
      {children}
    </motion.div>
  );
}

function Header({
  className,
  level = "Lvl. 1",
  activeLevel = "home",
  projectLabel,
  projectIcon,
  sessionLabel,
  sessionIcon,
  onHome,
  onOpenProject,
  onOpenSession,
  tab,
  onTabChange,
  rightSlot,
  onTutorials,
  onWidgets,
  onNotifications,
  onSettings,
  onScopeNotice,
  showHeaderControls = true,
  showBreadcrumbs = true,
  showTutorialsWidgetsGames,
  showNotificationsSettings,
  showLevelIndicator = true,
  showTutorialsEntry = true,
  animateIntro = false,
  levelUpFlourish = false,
  levelUpStage = "idle",
  switchableProjects,
  onSwitchProject,
  allSessions,
  onSelectSession,
  currentProjectId,
  levelPillDocked,
  breadcrumbsDocked,
  tutorialsWidgetsGamesDocked,
  notificationsSettingsDocked,
  highlightHomeNav = false,
  highlightTutorialsNav = false,
  disabled = false,
}: HeaderProps) {
  const [internalTab, setInternalTab] = useState<"Workspace" | "Emulators">("Workspace");
  const [projectDropdownOpen, setProjectDropdownOpen] = useState(false);
  const [sessionDropdownOpen, setSessionDropdownOpen] = useState(false);
  const projectRef = useRef<HTMLDivElement | null>(null);
  const sessionRef = useRef<HTMLDivElement | null>(null);
  const currentTab = tab ?? internalTab;
  const handleTabChange = onTabChange ?? setInternalTab;

  useEffect(() => {
    const onDocDown = (e: MouseEvent) => {
      if (projectRef.current && !projectRef.current.contains(e.target as Node)) {
        setProjectDropdownOpen(false);
      }
      if (sessionRef.current && !sessionRef.current.contains(e.target as Node)) {
        setSessionDropdownOpen(false);
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setProjectDropdownOpen(false);
        setSessionDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", onDocDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onDocDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  const handleTutorials = onTutorials ?? (() => onScopeNotice?.("Interactive tutorials coming soon!"));
  const handleWidgets = onWidgets ?? (() => onScopeNotice?.("Widgets gallery coming soon!"));
  const handleNotifications = onNotifications ?? (() => onScopeNotice?.("No unread notifications."));
  const handleSettings = onSettings ?? (() => onScopeNotice?.("Settings configured to defaults."));

  const breadcrumbsVisible = showHeaderControls || showBreadcrumbs;
  const centerGroupVisible = showHeaderControls || Boolean(showTutorialsWidgetsGames);
  const rightNotificationsVisible = showHeaderControls || Boolean(showNotificationsSettings);

  if (
    !showHeaderControls &&
    !breadcrumbsVisible &&
    !centerGroupVisible &&
    !rightNotificationsVisible &&
    !showLevelIndicator
  ) {
    return null;
  }

  const isB21CenterStage =
    levelUpStage === "floating" ||
    levelUpStage === "shaking" ||
    levelUpStage === "rolling" ||
    levelUpStage === "glowing";
  const isRolodexOne =
    levelUpStage === "rolling" ||
    levelUpStage === "glowing" ||
    levelUpStage === "docked" ||
    level.includes("1");

  const levelPill = showLevelIndicator ? (
    <SpotlightToDock
      animateIntro={animateIntro}
      spotlightScale={1.65}
      spotlightY={280}
      docked={levelPillDocked}
      side="right"
    >
      <motion.div
        data-node-id="200:53"
        data-name="Level"
        data-levelup-stage={levelUpStage}
        animate={
          isB21CenterStage
            ? {
                x:
                  levelUpStage === "shaking"
                    ? [-440, -452, -428, -454, -426, -440]
                    : -440,
                y:
                  levelUpStage === "shaking"
                    ? [260, 252, 268, 250, 270, 260]
                    : 260,
                scale: 3.1,
              }
            : { x: 0, y: 0, scale: 1 }
        }
        transition={{
          duration: levelUpStage === "shaking" ? 0.55 : 0.65,
          ease: [0.22, 1, 0.36, 1],
        }}
        className={`bg-[rgba(171,239,163,0.07)] border-[0.667px] border-solid content-stretch flex items-center justify-center px-[12px] py-[5px] relative rounded-[100px] shrink-0 transition-colors duration-300 ${
          levelUpFlourish
            ? "border-[#2dd4bf] shadow-[0_0_28px_rgba(45,212,191,0.85)]"
            : "border-[rgba(171,239,163,0.2)]"
        }`}
        style={{
          zIndex: isB21CenterStage ? 80 : "auto",
          backgroundColor: isB21CenterStage
            ? "rgba(6, 24, 24, 0.94)"
            : undefined,
        }}
      >
        {levelUpStage !== "idle" ? (
          <div
            className={`font-['Space_Grotesk:Bold',sans-serif] font-bold leading-[19.5px] relative shrink-0 text-[13px] whitespace-nowrap flex items-center gap-1 ${
              levelUpFlourish ? "text-[#2dd4bf]" : "text-[rgba(255,255,255,0.4)]"
            }`}
            data-node-id="200:54"
          >
            <span>Lvl.</span>
            <span className="relative inline-flex h-[19.5px] w-[10px] overflow-hidden items-center justify-center">
              <motion.span
                animate={{ y: isRolodexOne ? "-100%" : "0%" }}
                transition={{ duration: 0.42, ease: "easeInOut" }}
                className="absolute inset-0 flex items-center justify-center"
              >
                0
              </motion.span>
              <motion.span
                animate={{ y: isRolodexOne ? "0%" : "100%" }}
                transition={{ duration: 0.42, ease: "easeInOut" }}
                className="absolute inset-0 flex items-center justify-center"
              >
                1
              </motion.span>
            </span>
          </div>
        ) : (
          <p
            className={`[word-break:break-word] font-['Space_Grotesk:Bold',sans-serif] font-bold leading-[19.5px] relative shrink-0 text-[13px] whitespace-nowrap transition-colors ${
              levelUpFlourish ? "text-[#abefa3]" : "text-[rgba(255,255,255,0.4)]"
            }`}
            data-node-id="200:54"
          >
            {level}
          </p>
        )}
      </motion.div>
    </SpotlightToDock>
  ) : null;

  const breadcrumbsGroup = breadcrumbsVisible ? (
    <SpotlightToDock
      animateIntro={animateIntro}
      spotlightScale={1.2}
      spotlightY={240}
      docked={breadcrumbsDocked}
      side="left"
    >
      <div className="content-stretch flex flex-wrap sm:flex-nowrap gap-2 sm:gap-[16px] min-h-[29px] items-center relative shrink-0 max-w-full" data-node-id="200:4" data-name="HeaderBreadcrumbs">
        {/* i2 pill */}
        <div className="content-stretch flex items-center relative shrink-0" data-node-id="200:5" data-name="Container">
          <button
            type="button"
            onClick={(!disabled || highlightHomeNav) && activeLevel !== "home" ? onHome : undefined}
            disabled={disabled && !highlightHomeNav}
            title={disabled && !highlightHomeNav ? undefined : activeLevel !== "home" ? "Back to i2 Home" : "i2 Home"}
            className={`content-stretch flex gap-[8px] h-[30px] items-center justify-center relative rounded-[9px] shrink-0 w-[57px] transition-all ${
              highlightHomeNav
                ? "bg-[rgba(45,212,191,0.22)] border border-[#2dd4bf] shadow-[0_0_20px_rgba(45,212,191,0.65)] cursor-pointer"
                : disabled
                ? "bg-[rgba(171,239,163,0.12)] opacity-50 cursor-default"
                : activeLevel === "home"
                ? "bg-[#abefa3] cursor-default"
                : "bg-[rgba(171,239,163,0.16)] hover:bg-[rgba(171,239,163,0.25)] cursor-pointer"
            }`}
            data-node-id="200:6"
            data-name="Container"
          >
            <div className="relative shrink-0 size-[18px]" data-node-id="200:7" data-name="Icon">
              <img
                alt=""
                className={`absolute block inset-0 max-w-none size-full transition-opacity ${
                  activeLevel === "home" ? "" : "brightness-0 invert opacity-75"
                }`}
                src={imgHeaderIcon}
              />
            </div>
            <p
              className={`[word-break:break-word] font-['Space_Grotesk:Bold',sans-serif] font-bold leading-[27px] relative shrink-0 text-[18px] tracking-[-0.54px] whitespace-nowrap transition-colors ${
                activeLevel === "home" ? "text-[#061413]" : "text-[rgba(255,255,255,0.7)]"
              }`}
              data-node-id="200:9"
            >
              i2
            </p>
          </button>
        </div>

        {/* Project pill */}
        <div ref={projectRef} className="content-stretch flex items-center relative shrink-0" data-node-id="200:10" data-name="Container">
          <button
            type="button"
            onClick={() => {
              if (disabled) return;
              setSessionDropdownOpen(false);
              setProjectDropdownOpen((v) => !v);
            }}
            disabled={disabled}
            title={disabled ? undefined : "Projects"}
            aria-expanded={projectDropdownOpen}
            className={`content-stretch flex gap-[6px] h-[30px] items-center justify-center relative rounded-[9px] shrink-0 transition-all ${
              disabled ? "cursor-default opacity-60" : "cursor-pointer"
            } ${
              projectLabel && projectLabel !== "Project" ? "px-[12px] min-w-[73px]" : "w-[73px]"
            } ${
              activeLevel === "project"
                ? "bg-[#abefa3] hover:brightness-95 text-[#061413]"
                : "bg-[rgba(171,239,163,0.16)] hover:bg-[rgba(171,239,163,0.25)] text-white/80 hover:text-white"
            }`}
            data-node-id="200:11"
            data-name="Container"
          >
            {projectIcon && (
              <span className={`shrink-0 flex items-center justify-center ${activeLevel === "project" ? "text-[#061413]" : "text-[rgba(255,255,255,0.7)]"}`}>
                {projectIcon}
              </span>
            )}
            <p
              className={`[word-break:break-word] font-['Space_Grotesk:Bold',sans-serif] font-bold leading-[27px] relative shrink-0 text-[18px] tracking-[-0.54px] whitespace-nowrap transition-colors ${
                activeLevel === "project"
                  ? "text-[#061413]"
                  : activeLevel === "session"
                  ? "text-[rgba(255,255,255,0.85)]"
                  : projectLabel && projectLabel !== "Project"
                  ? "text-[rgba(255,255,255,0.8)]"
                  : "text-[rgba(255,255,255,0.7)]"
              }`}
              data-node-id="200:12"
            >
              {projectLabel || "Project"}
            </p>
          </button>

          {projectDropdownOpen && (
            <div
              data-name="ProjectDropdownMenu"
              className="absolute left-0 top-full mt-2 z-50 min-w-[220px] rounded-[10px] border border-white/10 bg-[#1a1818] py-1 shadow-2xl"
            >
              <div className="px-3 py-1.5 border-b border-white/[0.06] mb-1">
                <span className="text-[10px] font-['Space_Grotesk',sans-serif] font-semibold text-white/40 uppercase tracking-wider">
                  Projects
                </span>
              </div>
              {(switchableProjects && switchableProjects.length > 0 ? switchableProjects : []).map((p) => {
                const isCurrent = p.name === projectLabel || p.id === currentProjectId;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      setProjectDropdownOpen(false);
                      onSwitchProject?.(p);
                    }}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 text-left text-[12px] font-['Space_Grotesk',sans-serif] transition-colors ${
                      isCurrent
                        ? "text-[#abefa3] bg-[#abefa3]/10 font-semibold"
                        : "text-[#c5c5c5] hover:bg-white/5 hover:text-white"
                    }`}
                  >
                    <ProjectGlyph size={14} color={isCurrent ? "#abefa3" : "rgba(255,255,255,0.5)"} />
                    <span className="flex-1 truncate">{p.name}</span>
                    <span className="text-[10px] text-white/35">{p.framework}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Session pill */}
        <div ref={sessionRef} className="content-stretch flex items-center relative shrink-0" data-node-id="200:13" data-name="Container">
          <button
            type="button"
            onClick={() => {
              if (disabled) return;
              setProjectDropdownOpen(false);
              setSessionDropdownOpen((v) => !v);
            }}
            disabled={disabled}
            title={disabled ? undefined : "Sessions"}
            aria-expanded={sessionDropdownOpen}
            className={`content-stretch flex gap-[6px] h-[30px] items-center justify-center relative rounded-[9px] shrink-0 transition-all ${
              disabled ? "cursor-default opacity-60" : "cursor-pointer"
            } ${
              sessionLabel && sessionLabel !== "Session" ? "px-[12px] min-w-[73px]" : "w-[73px]"
            } ${
              activeLevel === "session"
                ? "bg-[#abefa3] hover:brightness-95 text-[#061413]"
                : "bg-[rgba(171,239,163,0.16)] hover:bg-[rgba(171,239,163,0.25)] text-white/80 hover:text-white"
            }`}
            data-node-id="200:14"
            data-name="Container"
          >
            {sessionIcon && (
              <span className={`shrink-0 flex items-center justify-center ${activeLevel === "session" ? "text-[#061413]" : "text-[rgba(255,255,255,0.7)]"}`}>
                {sessionIcon}
              </span>
            )}
            <p
              title={sessionLabel || "Session"}
              className={`font-['Space_Grotesk:Bold',sans-serif] font-bold leading-[27px] relative shrink-0 text-[16px] sm:text-[18px] tracking-[-0.54px] truncate max-w-[110px] sm:max-w-[210px] transition-colors ${
                activeLevel === "session"
                  ? "text-[#061413]"
                  : sessionLabel && sessionLabel !== "Session"
                  ? "text-[rgba(255,255,255,0.85)]"
                  : "text-[rgba(255,255,255,0.7)]"
              }`}
              data-node-id="200:15"
            >
              {sessionLabel || "Session"}
            </p>
          </button>

          {sessionDropdownOpen && (
            <div
              data-name="SessionDropdownMenu"
              className="absolute left-0 top-full mt-2 z-50 min-w-[270px] max-h-[380px] overflow-y-auto rounded-[10px] border border-white/10 bg-[#1a1818] py-1 shadow-2xl"
            >
              {activeLevel === "home" && (!currentProjectId || !projectLabel || projectLabel === "Project") ? (
                // On Home when no project is open: All sessions grouped by project
                <>
                  <div className="px-3 py-1.5 border-b border-white/[0.06] mb-1">
                    <span className="text-[10px] font-['Space_Grotesk',sans-serif] font-semibold text-white/40 uppercase tracking-wider">
                      All Sessions by Project
                    </span>
                  </div>
                  {(switchableProjects && switchableProjects.length > 0 ? switchableProjects : []).map((prj) => {
                    const prjSessions = (allSessions || []).filter((s) => s.projectId === prj.id);
                    if (prjSessions.length === 0) return null;
                    return (
                      <div key={prj.id} className="flex flex-col border-b border-white/[0.04] last:border-b-0 pb-1 mb-1">
                        <div className="px-3 pt-2 pb-1 flex items-center gap-1.5">
                          <ProjectGlyph size={12} color="#abefa3" />
                          <span className="text-[10.5px] font-['Space_Grotesk',sans-serif] font-semibold text-[#abefa3] uppercase tracking-wider">
                            {prj.name}
                          </span>
                        </div>
                        {prjSessions.map((s) => (
                          <button
                            key={s.id}
                            type="button"
                            onClick={() => {
                              setSessionDropdownOpen(false);
                              onSelectSession?.(s);
                            }}
                            className="w-full flex items-center justify-between px-3 py-1.5 pl-6 text-left text-[12px] font-['Space_Grotesk',sans-serif] text-[#c5c5c5] hover:bg-white/5 hover:text-white transition-colors"
                          >
                            <span className="truncate">{s.name}</span>
                            <span className="text-[9.5px] text-white/40 font-mono ml-2 shrink-0">{s.initial}</span>
                          </button>
                        ))}
                      </div>
                    );
                  })}
                </>
              ) : (
                // In a project (or session of a project): Sessions for that project
                <>
                  <div className="px-3 py-1.5 border-b border-white/[0.06] mb-1">
                    <span className="text-[10px] font-['Space_Grotesk',sans-serif] font-semibold text-white/40 uppercase tracking-wider">
                      {projectLabel || "Project"} · Sessions
                    </span>
                  </div>
                  {(allSessions || []).length === 0 && (
                    <p data-testid="session-dropdown-empty" className="px-3 py-2 text-[12px] font-['Space_Grotesk',sans-serif] text-white/40">
                      No sessions yet
                    </p>
                  )}
                  {((allSessions || []).filter((s) => {
                    if (currentProjectId && s.projectId === currentProjectId) return true;
                    if (projectLabel && projectLabel.toLowerCase().includes("pet") && s.projectId === "pet") return true;
                    if (projectLabel && projectLabel.toLowerCase().includes("hotdog") && s.projectId === "nothotdog") return true;
                    return false;
                  }).length > 0
                    ? (allSessions || []).filter((s) => {
                        if (currentProjectId && s.projectId === currentProjectId) return true;
                        if (projectLabel && projectLabel.toLowerCase().includes("pet") && s.projectId === "pet") return true;
                        if (projectLabel && projectLabel.toLowerCase().includes("hotdog") && s.projectId === "nothotdog") return true;
                        return false;
                      })
                    : allSessions || []
                  ).map((s) => {
                    const isCurrent = s.name === sessionLabel;
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => {
                          setSessionDropdownOpen(false);
                          onSelectSession?.(s);
                        }}
                        className={`w-full flex items-center justify-between px-3 py-2 text-left text-[12px] font-['Space_Grotesk',sans-serif] transition-colors ${
                          isCurrent
                            ? "text-[#abefa3] bg-[#abefa3]/10 font-semibold"
                            : "text-[#c5c5c5] hover:bg-white/5 hover:text-white"
                        }`}
                      >
                        <span className="truncate">{s.name}</span>
                        <span className={`text-[9.5px] font-mono ml-2 shrink-0 ${isCurrent ? "text-[#abefa3]/80" : "text-white/40"}`}>
                          {s.initial}
                        </span>
                      </button>
                    );
                  })}
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </SpotlightToDock>
  ) : null;

  const centerTutorialsWidgetsGamesGroup = centerGroupVisible ? (
    <SpotlightToDock
      animateIntro={animateIntro}
      spotlightScale={1.35}
      spotlightY={250}
      docked={tutorialsWidgetsGamesDocked}
      side="left"
    >
      <div
        className="content-stretch flex gap-[2px] h-[28px] items-center pl-[16px] relative shrink-0"
        data-node-id="200:16"
        data-name="HeaderTutorialsWidgetsGames"
      >
        {showTutorialsEntry && (
          <button
            type="button"
            onClick={disabled ? undefined : handleTutorials}
            disabled={disabled}
            className={`content-stretch flex flex-col items-center justify-center px-[12px] py-[4px] relative rounded-[7px] shrink-0 transition-all ${
              highlightTutorialsNav
                ? "border border-[#2dd4bf] shadow-[0_0_18px_rgba(45,212,191,0.55)] bg-[rgba(45,212,191,0.14)]"
                : disabled
                ? "opacity-60 cursor-default pointer-events-none"
                : "hover:bg-white/5 cursor-pointer"
            }`}
            data-node-id="200:17"
            data-name="Button"
          >
            <p
              className={`[word-break:break-word] font-['Space_Grotesk:Regular',sans-serif] font-normal leading-[19.5px] relative shrink-0 text-[13px] text-center whitespace-nowrap transition-colors ${
                highlightTutorialsNav
                  ? "text-[#2dd4bf] font-semibold"
                  : "text-[rgba(255,255,255,0.55)] hover:text-white/80"
              }`}
              data-node-id="200:18"
            >
              Tutorials
            </p>
          </button>
        )}
        <button
          type="button"
          onClick={disabled ? undefined : handleWidgets}
          disabled={disabled}
          className={`content-stretch flex flex-col items-center justify-center px-[12px] py-[4px] relative rounded-[7px] shrink-0 transition-colors ${
            disabled ? "opacity-60 cursor-default pointer-events-none" : "hover:bg-white/5 cursor-pointer"
          }`}
          data-node-id="200:19"
          data-name="Button"
        >
          <p
            className="[word-break:break-word] font-['Space_Grotesk:Regular',sans-serif] font-normal leading-[19.5px] relative shrink-0 text-[13px] text-[rgba(255,255,255,0.55)] hover:text-white/80 text-center whitespace-nowrap transition-colors"
            data-node-id="200:20"
          >
            Widgets
          </p>
        </button>
        <button
          type="button"
          onClick={disabled ? undefined : () => onScopeNotice?.("Games unlock at Level 5!")}
          disabled={disabled}
          className={`content-stretch flex flex-col items-center justify-center px-[12px] py-[4px] relative rounded-[7px] shrink-0 transition-colors ${
            disabled ? "opacity-60 cursor-default pointer-events-none" : "hover:bg-white/5 cursor-pointer"
          }`}
          data-node-id="200:22"
          data-name="Button"
        >
          <p
            className="[word-break:break-word] font-['Space_Grotesk:Regular',sans-serif] font-normal leading-[19.5px] relative shrink-0 text-[13px] text-[rgba(255,255,255,0.55)] hover:text-white/80 text-center whitespace-nowrap transition-colors"
            data-node-id="200:26"
          >
            Games
          </p>
        </button>
      </div>
    </SpotlightToDock>
  ) : null;

  const rightNotificationsSettingsGroup = rightNotificationsVisible ? (
    <SpotlightToDock
      animateIntro={animateIntro}
      spotlightScale={1.45}
      spotlightY={250}
      docked={notificationsSettingsDocked}
      side="right"
    >
      <div
        className="content-stretch flex items-center relative shrink-0"
        data-node-id="200:43"
        data-name="HeaderNotificationsSettings"
      >
        <div className="bg-[rgba(171,239,163,0.07)] border-[0.667px] border-[rgba(171,239,163,0.2)] border-solid content-stretch flex gap-[6px] items-center px-[12px] py-[5px] relative rounded-[100px] shrink-0" data-node-id="200:44" data-name="Container">
          <button
            type="button"
            onClick={disabled ? undefined : handleNotifications}
            disabled={disabled}
            title={disabled ? undefined : "Notifications"}
            className={`content-stretch flex flex-col items-start justify-center p-[4px] relative shrink-0 transition-opacity ${
              disabled ? "opacity-50 cursor-default pointer-events-none" : "hover:opacity-80 cursor-pointer"
            }`}
            data-node-id="200:45"
            data-name="Button"
          >
            <div className="overflow-clip relative shrink-0 size-[15px]" data-node-id="200:46" data-name="Icon">
              <div className="-translate-x-1/2 -translate-y-1/2 absolute left-1/2 size-[15px] top-1/2" data-node-id="200:47" data-name="bell">
                <img alt="Bell" className="absolute block inset-0 max-w-none size-full" src={imgHeaderBell} />
              </div>
            </div>
          </button>
          <button
            type="button"
            onClick={disabled ? undefined : handleSettings}
            disabled={disabled}
            title={disabled ? undefined : "Settings"}
            className={`content-stretch flex flex-col items-start justify-center p-[4px] relative shrink-0 transition-opacity ${
              disabled ? "opacity-50 cursor-default pointer-events-none" : "hover:opacity-80 cursor-pointer"
            }`}
            data-node-id="200:49"
            data-name="Button"
          >
            <div className="relative shrink-0 size-[15px]" data-node-id="200:50" data-name="Icon">
              <img alt="Settings" className="absolute block inset-0 max-w-none size-full" src={imgHeaderSettings} />
            </div>
          </button>
        </div>
      </div>
    </SpotlightToDock>
  ) : null;

  return (
    <div
      className={
        className ||
        `${
          showHeaderControls
            ? "border-[rgba(255,255,255,0.06)] border-b-[0.667px] border-solid "
            : ""
        }content-stretch flex flex-wrap lg:flex-nowrap min-h-[59px] lg:h-[59px] gap-2 items-center justify-between px-3 sm:px-[24px] py-2 lg:py-0 relative w-full shrink-0 z-20`
      }
      data-node-id="200:3"
      data-name="Header"
    >
      {/* Left — breadcrumbs: i2, Project, Session */}
      {breadcrumbsGroup ?? <div aria-hidden="true" />}

      {/* Center — Tutorials / Widgets / Games */}
      {centerTutorialsWidgetsGamesGroup ?? <div aria-hidden="true" />}

      {/* Segmented toggle — Workspace / Emulators */}
      {showHeaderControls ? (
      <div className="bg-[rgba(0,0,0,0.25)] content-stretch flex gap-[2px] items-center p-[2px] relative rounded-[6px] shrink-0" data-node-id="200:29" data-name="Container">
        <button
          type="button"
          onClick={disabled ? undefined : () => handleTabChange("Workspace")}
          disabled={disabled}
          className={`content-stretch flex gap-[6px] items-center px-[12px] py-[4px] relative rounded-[4px] shrink-0 transition-all ${
            currentTab === "Workspace"
              ? "bg-[#373434] drop-shadow-[0px_1px_1.5px_rgba(0,0,0,0.1),0px_1px_1px_rgba(0,0,0,0.1)]"
              : "hover:bg-white/5"
          } ${disabled ? "pointer-events-none opacity-40 cursor-default" : "cursor-pointer"}`}
          data-node-id="200:30"
          data-name="Button"
        >
          <div className="relative shrink-0 size-[11px]" data-node-id="200:31" data-name="Icon">
            <img
              alt=""
              className={`absolute block inset-0 max-w-none size-full transition-opacity ${
                currentTab === "Workspace" ? "" : "brightness-50 opacity-40"
              }`}
              src={imgHeaderWorkspace}
            />
          </div>
          <p className={`[word-break:break-word] font-['Rounded_Mplus_1c:Medium',sans-serif] font-medium leading-[16.5px] not-italic relative shrink-0 text-[11px] text-center whitespace-nowrap transition-colors ${
            currentTab === "Workspace" ? "text-white" : "text-[#444]"
          }`} data-node-id="200:34">
            Workspace
          </p>
        </button>
        <button
          type="button"
          onClick={disabled ? undefined : () => handleTabChange("Emulators")}
          disabled={disabled}
          className={`content-stretch flex gap-[6px] items-center px-[12px] py-[4px] relative rounded-[4px] shrink-0 transition-all ${
            currentTab === "Emulators"
              ? "bg-[#373434] drop-shadow-[0px_1px_1.5px_rgba(0,0,0,0.1),0px_1px_1px_rgba(0,0,0,0.1)]"
              : "hover:bg-white/5"
          } ${disabled ? "pointer-events-none opacity-40 cursor-default" : "cursor-pointer"}`}
          data-node-id="200:35"
          data-name="Button"
        >
          <div className="relative shrink-0 size-[11px]" data-node-id="200:36" data-name="Icon">
            <img
              alt=""
              className={`absolute block inset-0 max-w-none size-full transition-all ${
                currentTab === "Emulators" ? "brightness-0 invert" : ""
              }`}
              src={imgHeaderEmulators}
            />
          </div>
          <p className={`[word-break:break-word] font-['Rounded_Mplus_1c:Medium',sans-serif] font-medium leading-[16.5px] not-italic relative shrink-0 text-[11px] text-center whitespace-nowrap transition-colors ${
            currentTab === "Emulators" ? "text-white" : "text-[#444]"
          }`} data-node-id="200:41">
            Emulators
          </p>
        </button>
      </div>
      ) : (
        <div aria-hidden="true" />
      )}

      {/* Right — custom action slot + Bell/Settings pill + Level pill */}
      <div className="content-stretch flex gap-[12px] items-center justify-end relative shrink-0" data-node-id="200:42" data-name="Container:align">
        {showHeaderControls && rightSlot && (
          <div className="flex items-center shrink-0">
            {rightSlot}
          </div>
        )}
        {rightNotificationsSettingsGroup}
        {levelPill}
      </div>
    </div>
  );
}

function TopBar({ activeScreen, appRunning, onScreenChange, onStartApp, onRestartApp, onStopApp, onHome }: {
  activeScreen: ActiveScreen; appRunning: boolean;
  onScreenChange: (s: ActiveScreen) => void; onStartApp: () => void; onRestartApp: () => void; onStopApp: () => void;
  onHome?: () => void;
}) {
  return (
    <Header
      activeLevel="session"
      projectLabel="expo-photo-share"
      sessionLabel="feature/photo-share"
      onHome={onHome}
      tab={activeScreen === "screen1" ? "Workspace" : "Emulators"}
      onTabChange={(t) => onScreenChange(t === "Workspace" ? "screen1" : "screen2")}
      rightSlot={
        <div className="flex items-center gap-2">
          <AppRunControls running={appRunning} onStart={onStartApp} onRestart={onRestartApp} onStop={onStopApp} compact />
        </div>
      }
    />
  );
}

// ─── Welcome screen slides ─────────────────────────────────────────────────

const SLIDES = [
  {
    key: "s1",
    render: () => (
      <div className="flex flex-col justify-center h-full px-24 max-w-5xl">
        <p className="font-['Rounded_Mplus_1c',sans-serif] leading-tight mb-2" style={{ fontSize: 52, color: "#c5c5c5" }}>
          Most agentic IDEs let you use an agent.
        </p>
        <p style={{ fontSize: 52, fontFamily: "'Rounded Mplus 1c',sans-serif", fontWeight: 800, color: "#abefa3", lineHeight: 1.25, marginBottom: 40 }}>
          This IDE is an agent.
        </p>
        <p className="font-['Rounded_Mplus_1c',sans-serif] leading-relaxed" style={{ fontSize: 28, color: "#666", maxWidth: 780 }}>
          It moves and changes along with you according to the current phase of your session and project, giving you the tools you need when you need them…
        </p>
        <p className="font-['Rounded_Mplus_1c',sans-serif] mt-8" style={{ fontSize: 28, color: "#888" }}>…without all the noise.</p>
      </div>
    ),
  },
  {
    key: "s2",
    render: () => (
      <div className="flex flex-col justify-center h-full px-24 items-end text-right max-w-5xl ml-auto">
        <p className="font-['Rounded_Mplus_1c',sans-serif] leading-tight mb-6" style={{ fontSize: 48, color: "#c5c5c5", maxWidth: 700 }}>
          The IDE knows your project structure, context, and game plan.
        </p>
        <p className="font-['Rounded_Mplus_1c',sans-serif] mb-8" style={{ fontSize: 36, color: "#c5c5c5" }}>
          Less typing →{" "}
          <span style={{ fontWeight: 800, color: "#abefa3" }}>more building!</span>
        </p>
        <div className="flex flex-col gap-2 text-right" style={{ fontSize: 28, color: "#666" }}>
          {["Repetitive actions", "Wondering what's next", "Stumbling over common issues", "Security vulnerabilities"].map(item => (
            <div key={item} className="flex items-center justify-end gap-3">
              <span className="font-['Rounded_Mplus_1c',sans-serif]">{item}</span>
              <span className="w-2 h-2 rounded-full bg-[#abefa3] shrink-0" />
            </div>
          ))}
        </div>
        <p className="font-['Rounded_Mplus_1c',sans-serif] mt-8" style={{ fontSize: 28, color: "rgba(255,255,255,0.12)" }}>a thing of the past.</p>
      </div>
    ),
  },
  {
    key: "s3",
    render: () => (
      <div className="flex flex-col items-center justify-center h-full px-24 text-center">
        <div className="flex flex-col gap-10 max-w-2xl">
          <p className="font-['Rounded_Mplus_1c',sans-serif] leading-tight" style={{ fontSize: 40, color: "#c5c5c5" }}>
            Intelligent model switching balances efficiency and affordability.
          </p>
          <p className="font-['Rounded_Mplus_1c',sans-serif] leading-relaxed" style={{ fontSize: 40, color: "#c5c5c5" }}>
            Built-in emulators give feedback to the agent via visuals and real time logs.
          </p>
          <p className="font-['Rounded_Mplus_1c',sans-serif] leading-tight" style={{ fontSize: 40, color: "#c5c5c5" }}>
            All the tools to plan, build, and publish in{" "}
            <span style={{ fontWeight: 800, color: "#abefa3" }}>one application</span>.
          </p>
        </div>
      </div>
    ),
  },
];

const RECENT_SESSIONS = ALL_SESSIONS.slice(0, 5);

const RECENT_PROJECTS = [
  { id: "p1", name: "expo-photo-share",          type: "Expo",      sessions: 2, status: "active", lastActive: "Now",    desc: "Photo sharing social app" },
  { id: "p2", name: "portfolio.code-workspace",  type: "Workspace", sessions: 1, status: "active", lastActive: "1d ago", desc: "Multi-repo portfolio" },
  { id: "p3", name: "DJsPortfolio",              type: "Generic",   sessions: 1, status: "idle",   lastActive: "5d ago", desc: "Personal portfolio site" },
  { id: "p4", name: "not-hot-dog",               type: "Expo",      sessions: 1, status: "idle",   lastActive: "1w ago", desc: "Image classification app" },
  { id: "p5", name: "PokePages",                 type: "Generic",   sessions: 1, status: "idle",   lastActive: "2w ago", desc: "Pokémon wiki project" },
];

// ─── i2 Home Screen feature card sub-components ─────────────────────────────

function FeatureBullet({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <circle cx="7" cy="7" r="7" fill="rgba(255,255,255,0.06)" />
        <path d="M4.5 7L6.2 8.7L9.5 5.3" stroke="rgba(255,255,255,0.5)" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <span style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 13, color: "rgba(255,255,255,0.6)" }}>{text}</span>
    </div>
  );
}

function I2FeatureCard({ accent, icon, title, subtitle, bullets, badge }: {
  accent: "green" | "purple";
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  bullets: string[];
  badge?: string;
}) {
  const accentColor = accent === "green" ? "#abefa3" : "#a78bfa";
  return (
    <div style={{
      backdropFilter: "blur(10px)", background: "rgba(4,0,28,0.7)",
      borderRadius: 24, border: "1px solid rgba(81,79,110,0.5)",
      padding: "32px 28px", display: "flex", flexDirection: "column", gap: 28,
      flex: 1, minWidth: 240, maxWidth: 340,
    }}>
      {/* Icon */}
      <div style={{ width: 48, height: 48, borderRadius: 10, background: `${accentColor}12`, border: `1px solid ${accentColor}25`, display: "flex", alignItems: "center", justifyContent: "center" }}>
        {icon}
      </div>
      {/* Title */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <p style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 18, fontWeight: 600, color: "#fff", lineHeight: 1.2 }}>{title}</p>
        <p style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 14, color: "rgba(160,163,189,1)", lineHeight: 1.5 }}>{subtitle}</p>
      </div>
      {/* Divider */}
      <div style={{ borderTop: "1px solid rgba(81,79,110,0.3)" }} />
      {/* Bullets */}
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {bullets.map(b => <FeatureBullet key={b} text={b} />)}
      </div>
    </div>
  );
}

function I2FeaturedCard({ icon, title, subtitle, bullets }: {
  icon: React.ReactNode; title: string; subtitle: string; bullets: string[];
}) {
  return (
    <div style={{
      background: "#2dd4bf", borderRadius: 24, padding: "18px 2px 2px",
      display: "flex", flexDirection: "column", gap: 0,
      flex: 1.1, minWidth: 260, maxWidth: 360,
    }}>
      <p style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 16, fontWeight: 600, color: "#0a1f1e", textAlign: "center", paddingBottom: 16, letterSpacing: "-0.01em" }}>
        ✦ Infie-Powered
      </p>
      <div style={{
        backdropFilter: "blur(10px)", background: "#1e1a37",
        borderRadius: 22, padding: "32px 28px",
        display: "flex", flexDirection: "column", gap: 28, flex: 1,
      }}>
        {/* Icon */}
        <div style={{ width: 48, height: 48, borderRadius: 10, background: "rgba(45,212,191,0.12)", border: "1px solid rgba(45,212,191,0.3)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          {icon}
        </div>
        {/* Title */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <p style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 18, fontWeight: 600, color: "#fff", lineHeight: 1.2 }}>{title}</p>
          <p style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 14, color: "rgba(160,163,189,1)", lineHeight: 1.5 }}>{subtitle}</p>
        </div>
        {/* Divider */}
        <div style={{ borderTop: "1px solid rgba(45,212,191,0.2)" }} />
        {/* Bullets */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {bullets.map(b => (
            <div key={b} className="flex items-center gap-2.5">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <circle cx="7" cy="7" r="7" fill="rgba(45,212,191,0.12)" />
                <path d="M4.5 7L6.2 8.7L9.5 5.3" stroke="#2dd4bf" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 13, color: "rgba(255,255,255,0.6)" }}>{b}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function RecentProjectCard({ project, onClick }: { project: typeof RECENT_PROJECTS[0]; onClick?: () => void }) {
  const isActive = project.status === "active";
  return (
    <button onClick={onClick} style={{
      background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)",
      borderRadius: 14, padding: "16px 18px", textAlign: "left",
      minWidth: 200, maxWidth: 260, display: "flex", flexDirection: "column", gap: 8,
      cursor: "pointer", transition: "border-color 0.15s, background 0.15s",
    }}
    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.15)"; (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.05)"; }}
    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.07)"; (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.03)"; }}
    >
      <div className="flex items-start justify-between gap-2">
        <p style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 13, fontWeight: 500, color: "#fff", wordBreak: "break-all" }}>{project.name}</p>
        {isActive && <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#abefa3", flexShrink: 0, marginTop: 3 }} />}
      </div>
      <p style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 12, color: "rgba(255,255,255,0.35)" }}>{project.desc}</p>
      <div className="flex items-center gap-2 mt-1">
        <span style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 10, color: "rgba(255,255,255,0.25)", padding: "2px 7px", borderRadius: 4, border: "1px solid rgba(255,255,255,0.08)" }}>{project.type}</span>
        <span style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 11, color: "rgba(255,255,255,0.25)" }}>{project.sessions} session{project.sessions !== 1 ? "s" : ""}</span>
        <span style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 11, color: "rgba(255,255,255,0.2)", marginLeft: "auto" }}>{project.lastActive}</span>
      </div>
    </button>
  );
}

// ─── i2 Home Screen ──────────────────────────────────────────────────────────

// ─── Animated ambient background glows ─────────────────────────────────────

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const handler = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener?.("change", handler);
    return () => mq.removeEventListener?.("change", handler);
  }, []);
  return reduced;
}

const GLOW_CIRCLES = [
  { color: "rgba(45,212,191,0.08)",  size: 800, top: -250 as number | string, left: -200 as number | string, x: [0, 70, -30, 0],  y: [0, 50, 90, 0],   dur: 26 },
  { color: "rgba(74,58,255,0.07)",   size: 700, top: 50,   left: "auto", right: -150,                                 x: [0, -60, 25, 0], y: [0, 65, -35, 0],  dur: 32 },
  { color: "rgba(171,239,163,0.05)", size: 600, top: "auto", bottom: -80, left: "35%",                                x: [0, 45, -70, 0], y: [0, -45, 35, 0],  dur: 22 },
] as const;

function AnimatedGlows() {
  const reduced = usePrefersReducedMotion();
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {GLOW_CIRCLES.map((g, i) => (
        <motion.div
          key={i}
          style={{
            position: "absolute", width: g.size, height: g.size, borderRadius: "50%",
            background: `radial-gradient(circle, ${g.color} 0%, transparent 65%)`,
            top: (g as any).top, bottom: (g as any).bottom, left: (g as any).left, right: (g as any).right,
          }}
          animate={reduced ? undefined : { x: g.x as unknown as number[], y: g.y as unknown as number[], scale: [1, 1.12, 1.05, 1] }}
          transition={reduced ? undefined : { duration: g.dur, repeat: Infinity, ease: "easeInOut" }}
        />
      ))}
      <img src={imgNoiseTexture} alt="" className="absolute inset-0 size-full object-cover mix-blend-soft-light opacity-20 pointer-events-none select-none" />
    </div>
  );
}

// ─── Reusable i2 logo (infinity glyph + wordmark) ──────────────────────────

function I2Logo({ size = 30 }: { size?: number }) {
  return (
    <div className="flex items-center gap-2.5 shrink-0">
      <div style={{ width: size, height: size, borderRadius: size * 0.3, background: "#abefa3", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <InfinityIcon size={size * 0.6} strokeWidth={2.5} style={{ color: "#0a0814" }} />
      </div>
      <span style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 18, fontWeight: 700, color: "#fff", letterSpacing: "-0.03em" }}>i2</span>
    </div>
  );
}

const INFIE_HOME_GREETING = "Hey! Infie here — I coordinate your agents, sessions, and PRs so you can focus on building. Ask me anything, or open a project to get started.";

function infieHomeReply(text: string): string {
  const t = text.toLowerCase();
  if (/session|branch|worktree/.test(t)) return "Each session gets its own branch and git worktree, so parallel work never collides. Want me to spin one up?";
  if (/library|component|design|mds/.test(t)) return "The Library is your design-resource registry — drag components in and I'll handle any conflicts against your MDS source of truth.";
  if (/pricing|plan|price|cost|upgrade/.test(t)) return "You can review plans on the pricing page — Free to get going, Premium and Pro for heavier orchestration, or Team/Enterprise for your org.";
  if (/generate|super ?stack|new project|scaffold/.test(t)) return "I can scaffold a fresh project with Super Stack — pick your framework in the Generate button and I'll set up project memory for you.";
  if (/open|project|folder|workspace/.test(t)) return "Hit “Open Project Workspace” below and I'll scan the folder, detect the stack, and load your sessions.";
  if (/hi|hey|hello|yo/.test(t)) return "Hey! Ready when you are — want to open a project or generate a new one?";
  return "Got it. I'll keep that in mind as we work. Open a project whenever you're ready and I'll take it from there.";
}

// ═══════════════════════════════════════════════════════════════════════════
// Interactive prototype — session status machine, data & reusable components
// ═══════════════════════════════════════════════════════════════════════════

type SessionStatus =
  | "READY" | "CODING" | "WAITING ON TEST" | "NEEDS YOU"
  | "REVIEW FIXES" | "FIXING" | "VERIFIED" | "PR OPEN"
  | "MERGED" | "COMPLETE" | "BLOCKED" | "PAUSED";

type ActionPreset = "teal" | "purple" | "blue" | "amber" | "red" | "gray";

// RGB triplets for the glowing-glass action style
const PRESET_RGB: Record<ActionPreset, string> = {
  teal: "45,212,191", purple: "167,139,250", blue: "96,165,250",
  amber: "251,191,36", red: "248,113,113", gray: "148,148,148",
};

// Glowing-glass surface: dark translucent, 1px colored stroke @50%, outer glow,
// inner shadow same color @25% / 25px blur.
function glassStyle(preset: ActionPreset): React.CSSProperties {
  const c = PRESET_RGB[preset];
  return {
    background: "rgba(15,15,20,0.6)",
    border: `1px solid rgba(${c},0.5)`,
    boxShadow: `0 0 20px rgba(${c},0.28), inset 0 0 25px rgba(${c},0.25)`,
    color: "#fff",
  };
}

const STATUS_PRESET: Record<SessionStatus, ActionPreset> = {
  READY: "teal", CODING: "blue", "WAITING ON TEST": "amber", "NEEDS YOU": "amber",
  "REVIEW FIXES": "red", FIXING: "blue", VERIFIED: "teal", "PR OPEN": "blue",
  MERGED: "purple", COMPLETE: "teal", BLOCKED: "red", PAUSED: "gray",
};

type IconCmp = React.ComponentType<{ size?: number }>;

interface FlowStep { label: string; preset: ActionPreset; icon: IconCmp; next: SessionStatus | null; }

// Status → primary action (label / preset / icon / next status)
const SESSION_FLOW: Record<SessionStatus, FlowStep> = {
  READY:             { label: "Start Session",  preset: "teal",   icon: Play,          next: "CODING" },
  CODING:            { label: "Continue",       preset: "blue",   icon: ArrowRight,    next: "WAITING ON TEST" },
  "WAITING ON TEST": { label: "Test App",       preset: "amber",  icon: FlaskConical,  next: "NEEDS YOU" },
  "NEEDS YOU":       { label: "Record Testing", preset: "amber",  icon: CheckCircle2,  next: "VERIFIED" }, // gated by checklist
  "REVIEW FIXES":    { label: "Fix Problems",   preset: "red",    icon: AlertTriangle, next: "FIXING" },
  FIXING:            { label: "Continue",       preset: "blue",   icon: ArrowRight,    next: "VERIFIED" },
  VERIFIED:          { label: "Open PR",        preset: "teal",   icon: GitPullRequest,next: "PR OPEN" },
  "PR OPEN":         { label: "Review Changes", preset: "blue",   icon: Search,        next: "MERGED" },
  MERGED:            { label: "Check Project",  preset: "purple", icon: Stethoscope,   next: "COMPLETE" },
  COMPLETE:          { label: "What's Next?",   preset: "teal",   icon: Zap,           next: null },
  BLOCKED:           { label: "Unblock",        preset: "red",    icon: RotateCcw,     next: "CODING" },
  PAUSED:            { label: "Resume",         preset: "teal",   icon: Play,          next: "CODING" },
};

// ─── Prototype data ────────────────────────────────────────────────────────

interface ProtoProject { id: string; name: string; desc: string; framework: string; sessions: number; ago: string; active?: boolean; wired: boolean; }

// Tutorial-owned Experimemo records. They exist only after Jenny completes (project) and after
// Start Session (session); they are never part of the static prototype lists below.
export const EXPERIMEMO_PROJECT_ID = "experimemo";
export const EXPERIMEMO_SESSION_ID = "experimemo-session";

export function buildExperimemoProject(sessionCount: number): ProtoProject {
  return {
    id: EXPERIMEMO_PROJECT_ID,
    name: "Experimemo",
    desc: "Field notebook for simple experiments",
    framework: "Exact",
    sessions: sessionCount,
    ago: "Now",
    active: true,
    wired: true,
  };
}

export const EXPERIMEMO_SESSION: ProtoSession = {
  id: EXPERIMEMO_SESSION_ID,
  projectId: EXPERIMEMO_PROJECT_ID,
  name: SESSION_NAME,
  branch: SESSION_BRANCH,
  model: "OpenAI · Claude · Gemini",
  agents: 3,
  tasksTotal: 3,
  tasksDone: 0,
  initial: "CODING",
  wired: true,
  desc: SESSION_GOAL,
};

const PROTOTYPE_PROJECTS: ProtoProject[] = [
  { id: "pet",       name: "Pet Show and Tell", desc: "Pet photo sharing social app",     framework: "Expo",      sessions: 2, ago: "Now",   active: true,  wired: true  },
  { id: "nothotdog", name: "Not Hotdog",        desc: "Image classification app",         framework: "Expo",      sessions: 1, ago: "1w ago", wired: true  },
];

interface ProtoSession {
  id: string; projectId: string; name: string; branch: string; model: string;
  agents: number; tasksTotal: number; tasksDone: number; initial: SessionStatus; wired: boolean;
  desc?: string;
}

const PROTOTYPE_SESSIONS: ProtoSession[] = [
  { id: "add-comments",     projectId: "pet",       name: "Add Comments",                 branch: "feat/add-comments",      model: "Claude Sonnet", agents: 3, tasksTotal: 12, tasksDone: 4, initial: "WAITING ON TEST", wired: true  },
  { id: "fix-reaction-bug", projectId: "pet",       name: "Fix Reactions Bug",            branch: "chore/fix-reaction-bug", model: "GPT-5.6 Terra", agents: 2, tasksTotal: 8,  tasksDone: 6, initial: "MERGED",          wired: false },
  { id: "not-hotdog",       projectId: "nothotdog", name: "Improve Not Hotdog Classifier", branch: "feat/edge-cases",       model: "Claude Sonnet", agents: 1, tasksTotal: 7,  tasksDone: 0, initial: "READY",           wired: true, desc: "Make the classifier better at edge cases." },
];

// Per-session Infie messages, keyed by status
const SESSION_MESSAGES: Record<string, Partial<Record<SessionStatus, string>>> = {
  "add-comments": {
    "WAITING ON TEST": "Test the changes and add one more comment if you find an edge case.",
    "NEEDS YOU":       "Show and Tell: run the checklist below and record what you see. I'll verify once the required items pass.",
    VERIFIED:          "Verification passed. The comment changes are ready for a pull request.",
    "PR OPEN":         "The pull request is open. Review the diff before merging.",
    MERGED:            "The comments feature merged. Run one final project check.",
    COMPLETE:          "Add Comments session complete. What would you like to build next?",
    "REVIEW FIXES":    "Review flagged a couple of issues. Want me to fix them?",
    FIXING:            "Applying the review fixes now — I'll hand back once they're in.",
  },
  "not-hotdog": {
    READY:             "Ready to start improving the classifier.",
    CODING:            "I'm adding edge-case image examples and updating the evaluation set.",
    "WAITING ON TEST": "Test the classifier with a few images that are clearly not hot dogs.",
    "NEEDS YOU":       "Show and Tell: try three edge cases and record what the app predicts.",
    VERIFIED:          "Verification passed. The classifier changes are ready for a pull request.",
    "PR OPEN":         "The pull request is open. Review the evaluation results before merging.",
    MERGED:            "The classifier update merged. Run one final project check.",
    COMPLETE:          "Not Hotdog classifier session complete. What would you like to improve next?",
    "REVIEW FIXES":    "The evaluation flagged a regression. Want me to fix it?",
    FIXING:            "Retraining on the edge cases and re-running the eval set.",
  },
};

// Human-testing checklist seeds per session (all required)
const SESSION_HUMAN_TESTS: Record<string, string[]> = {
  "add-comments": [
    "Send button disabled with no photo selected",
    "Photo picker opens on iOS and Android",
    "Attempt to add a comment and react to it",
  ],
  "not-hotdog": [
    "Photo of a hot dog is classified correctly",
    "Photo of a taco is classified NOT hotdog",
    "Blurry edge-case image returns a confidence score",
  ],
};

function infieMessageFor(sessionId: string, status: SessionStatus): string {
  return SESSION_MESSAGES[sessionId]?.[status]
    ?? `Session is ${status.toLowerCase()}. Next up: ${SESSION_FLOW[status].label}.`;
}

// ─── Session / project glyphs (replace the spec's & and # placeholders) ─────

function SessionGlyph({ size = 16, color = "#2dd4bf" }: { size?: number; color?: string }) {
  return <Package size={size} style={{ color }} />;
}
function ProjectGlyph({ size = 16, color = "#abefa3" }: { size?: number; color?: string }) {
  return <FolderOpen size={size} style={{ color }} />;
}

// ─── StatusChip ────────────────────────────────────────────────────────────

function StatusChip({ status, size = "md" }: { status: SessionStatus; size?: "sm" | "md" }) {
  const c = PRESET_RGB[STATUS_PRESET[status]];
  const pad = size === "sm" ? "2px 7px" : "4px 10px";
  const fs = size === "sm" ? 9 : 10;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", padding: pad, borderRadius: 6,
      background: `rgba(${c},0.1)`, border: `1px solid rgba(${c},0.35)`, color: `rgb(${c})`,
      fontFamily: "'Rounded Mplus 1c',sans-serif", fontSize: fs, fontWeight: 600,
      letterSpacing: "0.05em", textTransform: "uppercase", whiteSpace: "nowrap",
    }}>{status}</span>
  );
}

// ─── InfieModeChip (GUIDED — a mode, never a status) ────────────────────────

function InfieModeChip() {
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 4, padding: "3px 9px", borderRadius: 6,
      background: "rgba(45,212,191,0.12)", border: "1px solid rgba(45,212,191,0.3)", color: "#2dd4bf",
      fontFamily: "'Rounded Mplus 1c',sans-serif", fontSize: 9, fontWeight: 600, letterSpacing: "0.06em",
    }}>
      <InfinityIcon size={10} /> GUIDED
    </span>
  );
}

// ─── SessionMeta (branch · progress · agents) ──────────────────────────────

function SessionMeta({ branch, done, total, agents }: { branch: string; done: number; total: number; agents: number }) {
  const item = (icon: React.ReactNode, text: string) => (
    <div className="flex items-center gap-1.5" style={{ fontFamily: "'Rounded Mplus 1c',sans-serif", fontSize: 11, color: "rgba(255,255,255,0.5)" }}>
      {icon}<span>{text}</span>
    </div>
  );
  return (
    <div className="flex items-center gap-4 flex-wrap">
      {item(<GitBranch size={12} className="text-white/30" />, branch)}
      {item(<CheckCircle2 size={12} className="text-white/30" />, `${done} / ${total} tasks`)}
      {item(<Bot size={12} className="text-white/30" />, `${agents} agent${agents !== 1 ? "s" : ""}`)}
    </div>
  );
}

// ─── InfieActionButton (glowing-glass pill) ────────────────────────────────

function InfieActionButton({ label, preset, icon: Icon, density = "Compact", message, disabled, onClick }: {
  label: string; preset: ActionPreset; icon?: IconCmp;
  density?: "Compact" | "Expanded"; message?: string; disabled?: boolean; onClick?: () => void;
}) {
  const style = disabled
    ? { background: "rgba(15,15,20,0.5)", border: "1px solid rgba(148,148,148,0.25)", color: "rgba(255,255,255,0.35)" } as React.CSSProperties
    : glassStyle(preset);
  return (
    <button
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      className={`flex items-center gap-2 rounded-full transition-all text-left ${disabled ? "cursor-not-allowed" : "hover:brightness-110"}`}
      style={{ ...style, padding: density === "Expanded" ? "10px 16px" : "8px 14px", cursor: disabled ? "not-allowed" : "pointer" }}
    >
      {Icon && <Icon size={14} />}
      <span className="flex flex-col">
        <span style={{ fontFamily: "'Rounded Mplus 1c',sans-serif", fontSize: 13, fontWeight: 600, lineHeight: 1.2 }}>{label}</span>
        {density === "Expanded" && message && (
          <span style={{ fontFamily: "'Rounded Mplus 1c',sans-serif", fontSize: 11, color: "rgba(255,255,255,0.55)", lineHeight: 1.35, marginTop: 2, maxWidth: 260 }}>{message}</span>
        )}
      </span>
    </button>
  );
}

// ─── InfieActionRow (1 primary + up to 3 secondaries, 8px gap) ─────────────

interface RowAction { label: string; preset: ActionPreset; icon?: IconCmp; message?: string; disabled?: boolean; onClick?: () => void; }

function InfieActionRow({ primary, secondaries = [] }: { primary: RowAction; secondaries?: RowAction[] }) {
  return (
    <div className="flex items-center flex-wrap" style={{ gap: 8 }}>
      <InfieActionButton {...primary} density="Expanded" />
      {secondaries.slice(0, 3).map((s, i) => <InfieActionButton key={i} {...s} density="Compact" />)}
    </div>
  );
}

// ─── SessionStatusCard (project-home session card) ─────────────────────────

function SessionStatusCard({ session, status, done, onOpen }: { session: ProtoSession; status: SessionStatus; done: number; onOpen: () => void }) {
  const flow = SESSION_FLOW[status];
  return (
    <div style={{ background: "#0b131d", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14 }} className="p-5 flex flex-col gap-4 flex-1 min-w-[280px]">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div style={{ width: 34, height: 34, borderRadius: 8, background: "rgba(45,212,191,0.1)", border: "1px solid rgba(45,212,191,0.25)" }} className="flex items-center justify-center">
            <SessionGlyph size={16} />
          </div>
          <div>
            <p style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 15, fontWeight: 600, color: "#fff" }}>{session.name}</p>
            <p style={{ fontFamily: "'Rounded Mplus 1c',sans-serif", fontSize: 11, color: "rgba(255,255,255,0.35)" }}>{session.branch}</p>
          </div>
        </div>
        <InfieActionButton label={flow.label} preset={flow.preset} icon={flow.icon} onClick={onOpen} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <MetaCell label="STATUS" value={<StatusChip status={status} />} />
        <MetaCell label="MODEL" value={<span style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 13, fontWeight: 600, color: "#fff" }}>{session.model}</span>} />
        <MetaCell label="PROGRESS" value={<span style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 13, fontWeight: 600, color: "#fff" }}>{done} / {session.tasksTotal} tasks</span>} />
        <MetaCell label="AGENTS" value={<span style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 13, fontWeight: 600, color: "#fff" }}>{session.agents}</span>} />
      </div>
    </div>
  );
}

function MetaCell({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span style={{ fontFamily: "'Rounded Mplus 1c',sans-serif", fontSize: 9, fontWeight: 600, color: "rgba(255,255,255,0.3)", letterSpacing: "0.1em" }}>{label}</span>
      {value}
    </div>
  );
}

// Rough progress heuristic driven by how far the status has advanced
function statusProgress(session: ProtoSession, status: SessionStatus): number {
  const order: SessionStatus[] = ["READY", "CODING", "WAITING ON TEST", "NEEDS YOU", "REVIEW FIXES", "FIXING", "VERIFIED", "PR OPEN", "MERGED", "COMPLETE"];
  const idx = Math.max(0, order.indexOf(status));
  return Math.min(session.tasksTotal, Math.round((idx / (order.length - 1)) * session.tasksTotal));
}

// ─── HumanTestingChecklist ─────────────────────────────────────────────────

function HumanTestingChecklist({ items, onToggle, title = "Human Testing" }: {
  items: CheckItem[]; onToggle: (id: string) => void; title?: string;
}) {
  const done = items.filter(i => i.done).length;
  return (
    <div style={{ background: "#252323", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 10 }} className="p-3.5 flex flex-col gap-2.5">
      <div className="flex items-center justify-between">
        <span style={{ fontFamily: "'Rounded Mplus 1c',sans-serif", fontSize: 10, fontWeight: 600, color: "rgba(255,255,255,0.4)", letterSpacing: "0.08em", textTransform: "uppercase" }}>{title}</span>
        <span style={{ fontFamily: "'Rounded Mplus 1c',sans-serif", fontSize: 11, color: done === items.length ? "#2dd4bf" : "rgba(255,255,255,0.4)" }}>{done}/{items.length}</span>
      </div>
      {items.map(it => (
        <button key={it.id} onClick={() => onToggle(it.id)} className="flex items-start gap-2.5 text-left group">
          {it.done
            ? <CheckCircle2 size={15} className="text-[#2dd4bf] shrink-0 mt-0.5" />
            : <Circle size={15} className="text-white/25 shrink-0 mt-0.5 group-hover:text-white/45 transition-colors" />}
          <span style={{ fontFamily: "'Rounded Mplus 1c',sans-serif", fontSize: 12, lineHeight: 1.45, color: it.done ? "rgba(255,255,255,0.4)" : "rgba(255,255,255,0.75)", textDecoration: it.done ? "line-through" : "none" }}>{it.text}</span>
        </button>
      ))}
    </div>
  );
}

// ─── PrototypeScopeNotice (modal for non-wired cards) ──────────────────────

function PrototypeScopeNotice({ message, onOpenPet, onOpenNotHotdog, onClose }: {
  message: string; onOpenPet: () => void; onOpenNotHotdog: () => void; onClose: () => void;
}) {
  return (
    <PrototypeLimit
      title="Prototype Limit"
      subtitle="Feature Boundary"
      description={message}
      onClose={onClose}
      suggestedActions={[
        {
          label: "Open Pet Show and Tell",
          onClick: onOpenPet,
          icon: <ProjectGlyph size={15} color="#06201d" />,
        },
        {
          label: "Open Not Hotdog",
          onClick: onOpenNotHotdog,
          icon: <ProjectGlyph size={15} color="#abefa3" />,
        },
      ]}
    />
  );
}

// ─── Status Playground ─────────────────────────────────────────────────────

function StatusPlayground({ onClose }: { onClose: () => void }) {
  const all = Object.keys(SESSION_FLOW) as SessionStatus[];
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-8" onClick={onClose}>
      <motion.div initial={{ scale: 0.97, y: 10 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.97, y: 10 }}
        onClick={e => e.stopPropagation()} className="w-full max-w-[560px] max-h-full overflow-y-auto"
        style={{ background: "#12101c", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 16 }}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/8">
          <span style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 15, fontWeight: 600, color: "#fff" }}>Status Playground</span>
          <button onClick={onClose} className="text-white/40 hover:text-white/80 transition-colors"><X size={16} /></button>
        </div>
        <div className="p-5 flex flex-col gap-3">
          {all.map(s => {
            const f = SESSION_FLOW[s];
            return (
              <div key={s} className="flex items-center justify-between gap-3">
                <StatusChip status={s} />
                <InfieActionButton label={f.label} preset={f.preset} icon={f.icon} />
              </div>
            );
          })}
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── Prototype chrome (top bar + Project/Session breadcrumb) ───────────────

function PrototypeChrome({ crumbs, right, onHome }: {
  crumbs: { icon?: React.ReactNode; label: string; onClick?: () => void; active?: boolean }[];
  right?: React.ReactNode;
  onHome: () => void;
}) {
  const activeIdx = crumbs.findIndex(c => c.active);
  const activeLevel: HeaderScreenLevel = activeIdx === 0 ? "project" : activeIdx === 1 ? "session" : "home";
  const projectCrumb = crumbs[0];
  const sessionCrumb = crumbs[1];

  return (
    <Header
      activeLevel={activeLevel}
      projectLabel={projectCrumb?.label}
      projectIcon={projectCrumb?.icon}
      sessionLabel={sessionCrumb?.label}
      sessionIcon={sessionCrumb?.icon}
      onHome={onHome}
      onOpenProject={projectCrumb?.onClick}
      onOpenSession={sessionCrumb?.onClick}
      rightSlot={right}
    />
  );
}

// ─── Project Home helpers ──────────────────────────────────────────────────

function OP4InfieAvatar() {
  return (
    <div className="relative shrink-0 size-[22px]">
      <svg className="absolute block inset-0 size-full" fill="none" viewBox="0 0 22 22">
        <mask fill="white" id="op4-av"><path d={svgPathsOP4.p3d935080} /></mask>
        <path d={svgPathsOP4.p3d935080} fill="#2DD4BF" fillOpacity="0.094" />
        <path d={svgPathsOP4.pd00cf00} fill="#2DD4BF" fillOpacity="0.25" mask="url(#op4-av)" />
        <path d={svgPathsOP4.p141f87c0} stroke="#2DD4BF" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.875" />
      </svg>
    </div>
  );
}

function OP4DotIcon() {
  return (
    <div className="relative shrink-0 size-[12px]">
      <svg className="absolute block inset-0 size-full" fill="none" viewBox="0 0 12 12">
        <path d={svgPathsOP4.p233bb300} stroke="#2A2A2A" strokeLinecap="round" strokeLinejoin="round" />
        <path d={svgPathsOP4.p358d1c00} stroke="#2A2A2A" strokeLinecap="round" strokeLinejoin="round" />
        <path d={svgPathsOP4.p31563d00} stroke="#2A2A2A" strokeLinecap="round" strokeLinejoin="round" />
        <path d={svgPathsOP4.p37817400} stroke="#2A2A2A" strokeLinecap="round" strokeLinejoin="round" />
        <path d={svgPathsOP4.p14c67980} stroke="#2A2A2A" strokeLinecap="round" strokeLinejoin="round" />
        <path d={svgPathsOP4.p1acad500} stroke="#2A2A2A" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}

function OP4CodesandboxIcon({ size = 16, color = "#ABEFA3" }: { size?: number; color?: string }) {
  return (
    <div className="shrink-0 flex items-center justify-center relative" style={{ width: size, height: size }}>
      <svg className="size-full" fill="none" viewBox="0 0 24 24">
        <path d="M12 2L3 7V17L12 22L21 17V7L12 2Z" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M3 7L12 12L21 7" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M12 12V22" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}

function OP4BigCodesandboxIcon({ color = "#ABEFA3" }: { color?: string }) {
  return (
    <div className="shrink-0 flex items-center justify-center relative size-[40px]">
      <svg className="size-[32px]" fill="none" viewBox="0 0 24 24">
        <path d="M12 2L3 7V17L12 22L21 17V7L12 2Z" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M3 7L12 12L21 7" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M12 12V22" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}

function OP4FileIcon() {
  return (
    <div className="relative shrink-0 size-[12px]">
      <svg className="absolute block inset-0 size-full" fill="none" viewBox="0 0 12 12">
        <path d={svgPathsOP4.p17c66200} stroke="#ABEFA3" strokeLinecap="round" strokeLinejoin="round" strokeOpacity="0.5" />
        <path d={svgPathsOP4.p31eedf00} stroke="#ABEFA3" strokeLinecap="round" strokeLinejoin="round" strokeOpacity="0.5" />
        <path d="M5 4.5H4" stroke="#ABEFA3" strokeLinecap="round" strokeLinejoin="round" strokeOpacity="0.5" />
        <path d="M8 6.5H4" stroke="#ABEFA3" strokeLinecap="round" strokeLinejoin="round" strokeOpacity="0.5" />
        <path d="M8 8.5H4" stroke="#ABEFA3" strokeLinecap="round" strokeLinejoin="round" strokeOpacity="0.5" />
      </svg>
    </div>
  );
}

function OP4FolderIcon() {
  return (
    <div className="relative shrink-0 size-[13px]">
      <svg className="absolute block inset-0 size-full" fill="none" viewBox="0 0 13 13">
        <path d={svgPathsOP4.p7c0da00} stroke="#ABEFA3" strokeLinecap="round" strokeLinejoin="round" strokeOpacity="0.7" strokeWidth="1.08333" />
      </svg>
    </div>
  );
}

function OP4FolderOpenIcon() {
  return (
    <div className="relative shrink-0 size-[13px]">
      <svg className="absolute block inset-0 size-full" fill="none" viewBox="0 0 13 13">
        <path d={svgPathsOP4.p18519200} stroke="#ABEFA3" strokeLinecap="round" strokeLinejoin="round" strokeOpacity="0.7" strokeWidth="1.08333" />
      </svg>
    </div>
  );
}

function OP4TsxFileIcon() {
  return (
    <div className="relative shrink-0 size-[13px]">
      <svg className="absolute block inset-0 size-full" fill="none" viewBox="0 0 13 13">
        <path d={svgPathsOP4.p2a6a1c00} stroke="#7B9AB5" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.08333" />
        <path d={svgPathsOP4.p238db870} stroke="#7B9AB5" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.08333" />
        <path d="M5.41667 4.875H4.33333" stroke="#7B9AB5" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.08333" />
        <path d="M8.66667 7.04167H4.33333" stroke="#7B9AB5" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.08333" />
        <path d="M8.66667 9.20833H4.33333" stroke="#7B9AB5" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.08333" />
      </svg>
    </div>
  );
}

function OP4CheckIconTeal() {
  return (
    <svg className="size-[13px]" fill="none" viewBox="0 0 13 13">
      <path d={svgPathsOP4.p1d11280} stroke="#ABEFA3" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.08333" />
      <path d={svgPathsOP4.p3c156f40} stroke="#ABEFA3" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.08333" />
    </svg>
  );
}

function OP4CheckIconGrey() {
  return (
    <svg className="size-[13px]" fill="none" viewBox="0 0 13 13">
      <path d={svgPathsOP4.p1d11280} stroke="#555555" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.08333" />
    </svg>
  );
}

function OP4SessionIcon({ size = 12, color = "#ABEFA3" }: { size?: number; color?: string }) {
  return (
    <div className="shrink-0 flex items-center justify-center relative" style={{ width: size, height: size }}>
      <svg className="size-full" fill="none" viewBox="0 0 16 16">
        <path d="M8 1.5L2 4.5V11.5L8 14.5L14 11.5V4.5L8 1.5Z" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M2 4.5L8 7.5L14 4.5" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M8 7.5V14.5" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}

function OP4SectionHeader({ label, color = "dark", icon }: { label: string; color?: "green" | "dark"; icon?: React.ReactNode }) {
  return (
    <div className={`flex items-center gap-[8px] justify-between px-[12px] py-[7px] w-full shrink-0 border-b border-[rgba(255,255,255,0.05)] ${color === "dark" ? "bg-[#1d1b20]" : "bg-[rgba(171,239,163,0.08)]"}`}>
      <div className="flex items-center gap-[8px]">
        {icon}
        <span className={`font-['Rounded_Mplus_1c',sans-serif] text-[11px] tracking-[0.275px] uppercase ${color === "dark" ? "text-[#777]" : "text-[#abefa3]"}`}>{label}</span>
      </div>
    </div>
  );
}

function OP4CheckRow({ done, text }: { done: boolean; text: string }) {
  return (
    <div className="border-b border-[rgba(255,255,255,0.05)] flex gap-[8px] items-start px-[12px] py-[8px] w-full shrink-0">
      <div className="flex flex-col h-[15px] items-start justify-center pt-[2px] shrink-0 w-[13px]">
        {done ? <OP4CheckIconTeal /> : <OP4CheckIconGrey />}
      </div>
      <p className={`font-['Rounded_Mplus_1c',sans-serif] text-[11px] leading-[17.875px] flex-1 ${done ? "line-through text-[#555]" : "text-[#c5c5c5]"}`}>{text}</p>
    </div>
  );
}

function OP4AddItemRow() {
  return (
    <div className="flex flex-col items-start px-[12px] py-[6px] w-full border-t border-[rgba(255,255,255,0.05)]">
      <div className="flex gap-[4px] items-center">
        <svg className="size-[10px]" fill="none" viewBox="0 0 10 10">
          <path d="M2.08333 5H7.91667" stroke="#444444" strokeLinecap="round" strokeLinejoin="round" strokeWidth="0.833333" />
          <path d="M5 2.08333V7.91667" stroke="#444444" strokeLinecap="round" strokeLinejoin="round" strokeWidth="0.833333" />
        </svg>
        <p className="font-['Rounded_Mplus_1c',sans-serif] text-[#444] text-[10px]">Add item</p>
      </div>
    </div>
  );
}

function OP4ChevronDown() {
  return (
    <div className="relative shrink-0 size-[12px]">
      <svg className="absolute block inset-0 size-full" fill="none" viewBox="0 0 12 12">
        <path d="M3 4.5L6 7.5L9 4.5" stroke="#666666" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}

function OP4ChevronRight() {
  return (
    <div className="relative shrink-0 size-[12px]">
      <svg className="absolute block inset-0 size-full" fill="none" viewBox="0 0 12 12">
        <path d="M4.5 9L7.5 6L4.5 3" stroke="#666666" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}

function OP4MyWidgetsGrid({ onOpenWidget }: { onOpenWidget?: (id: WidgetId, label: string) => void }) {
  const widgets: { id: WidgetId; label: string; icon?: React.ReactNode; paths?: React.ReactNode }[] = [
    { id: "globalTodo", label: "Global To-Do", icon: <CheckSquare size={14} className="text-[#abefa3]" /> },
    { label: "Terminal", paths: <><path d={svgPathsOP4.pf6e9500} stroke="#555" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.16667" /><path d="M7 11.0833H11.6667" stroke="#555" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.16667" /></> },
    { label: "EAS Build", paths: <><path d={svgPathsOP4.p2f03b200} stroke="#555" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.16667" /><path d={svgPathsOP4.p1e0c2e80} stroke="#555" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.16667" /><path d={svgPathsOP4.p8dd880} stroke="#555" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.16667" /><path d={svgPathsOP4.p7d50f00} stroke="#555" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.16667" /></> },
    { label: "Stylist", paths: <><path d={svgPathsOP4.p1ad2ef00} fill="#555" stroke="#555" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.16667" /><path d={svgPathsOP4.p31d77900} fill="#555" stroke="#555" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.16667" /><path d={svgPathsOP4.p41ae980} fill="#555" stroke="#555" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.16667" /><path d={svgPathsOP4.p2f386100} fill="#555" stroke="#555" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.16667" /><path d={svgPathsOP4.p272e2f40} stroke="#555" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.16667" /></> },
    { label: "Doctor", paths: <><path d="M6.41667 1.16667V2.33333" stroke="#555" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.16667" /><path d="M2.91667 1.16667V2.33333" stroke="#555" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.16667" /><path d={svgPathsOP4.p2faa3500} stroke="#555" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.16667" /><path d={svgPathsOP4.p5185540} stroke="#555" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.16667" /><path d={svgPathsOP4.p1a5b1f00} stroke="#555" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.16667" /></> },
    { label: "Problems", paths: <><path d={svgPathsOP4.p3ba1200} stroke="#555" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.16667" /><path d="M7 5.25V7.58333" stroke="#555" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.16667" /><path d="M7 9.91667H7.00583" stroke="#555" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.16667" /></> },
    { label: "Extensions", paths: <><path d={svgPathsOP4.p2ebe2e00} stroke="#555" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.16667" /><path d="M7 12.8333V7" stroke="#555" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.16667" /><path d={svgPathsOP4.p21a6a770} stroke="#555" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.16667" /><path d="M4.375 2.49083L9.625 5.495" stroke="#555" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.16667" /></> },
    { label: "Timeline", paths: <><path d={svgPathsOP4.pc012c00} stroke="#555" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.16667" /><path d="M7 3.5V7L9.33333 8.16667" stroke="#555" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.16667" /></> },
    { label: "Search", paths: <><path d={svgPathsOP4.p8cdb700} stroke="#555" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.16667" /><path d="M12.25 12.25L9.74167 9.74167" stroke="#555" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.16667" /></> },
    { label: "Outline", paths: <><path d="M12.25 7H7.58333" stroke="#555" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.16667" /><path d="M12.25 3.5H4.66667" stroke="#555" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.16667" /><path d="M12.25 10.5H7.58333" stroke="#555" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.16667" /><path d={svgPathsOP4.p1a8c4100} stroke="#555" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.16667" /><path d={svgPathsOP4.p1fd0e700} stroke="#555" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.16667" /></> },
    { label: "Git", paths: <><path d="M3.5 1.75V8.75" stroke="#555" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.16667" /><path d={svgPathsOP4.p1d4d8100} stroke="#555" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.16667" /><path d={svgPathsOP4.p2d33bc00} stroke="#555" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.16667" /><path d={svgPathsOP4.p1f119680} stroke="#555" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.16667" /></> },
    { label: "Human Testing", paths: <><path d={svgPathsOP4.p100e7280} stroke="#555" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.16667" /><path d={svgPathsOP4.p38a00300} stroke="#555" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.16667" /></> },
    { label: "Web Preview", paths: <><path d={svgPathsOP4.pc012c00} stroke="#555" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.16667" /><path d={svgPathsOP4.p2913d800} stroke="#555" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.16667" /><path d="M1.16667 7H12.8333" stroke="#555" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.16667" /></> },
    { label: "Android", paths: <path d={svgPathsOP4.p94c4b0} stroke="#555" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.16667" /> },
    { label: "iOS", paths: <path d={svgPathsOP4.p94c4b0} stroke="#555" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.16667" /> },
    { label: "Sessions", paths: <><path d={svgPathsOP4.p16dcb0} stroke="#555" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.16667" /><path d={svgPathsOP4.p29a9aa00} stroke="#555" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.16667" /><path d={svgPathsOP4.p9f2bd80} stroke="#555" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.16667" /><path d={svgPathsOP4.p13c0200} stroke="#555" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.16667" /></> },
    { label: "Actions", paths: <path d={svgPathsOP4.p33035500} stroke="#555" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.16667" /> },
    { label: "Library", paths: <><path d={svgPathsOP4.p3b016f00} stroke="#555" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.16667" /><path d={svgPathsOP4.p23023200} stroke="#555" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.16667" /><path d={svgPathsOP4.pb269580} stroke="#555" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.16667" /></> },
  ];
  return (
    <div className="bg-[#252323] flex-1 gap-x-[6px] gap-y-[6px] grid grid-cols-3 overflow-clip p-[8px] w-full">
      {widgets.map(w => (
        <button
          key={w.label}
          type="button"
          onClick={() => onOpenWidget?.(w.id, w.label)}
          className="bg-[#1d1b20] border-[0.667px] border-[rgba(255,255,255,0.05)] hover:border-[#abefa3]/30 hover:bg-[#252323] transition-all flex flex-col gap-[6px] items-center justify-center p-[10px] rounded-[6px] group cursor-pointer"
        >
          {w.icon ? w.icon : <svg className="shrink-0 size-[14px]" fill="none" viewBox="0 0 14 14">{w.paths}</svg>}
          <p className="font-['Rounded_Mplus_1c',sans-serif] text-[#444] group-hover:text-[#aaa] text-[9px] text-center leading-[11.25px] transition-colors">{w.label}</p>
        </button>
      ))}
    </div>
  );
}

// ─── Experimemo walkthrough building blocks ────────────────────────────────

const TASK_STATUS_LABEL: Record<TaskStatus, string> = {
  pending: "pending",
  in_progress: "in progress",
  needs_fix: "needs fix",
  completed: "completed",
};

// The session/project-home composer: a real input with a real Send button. `glow` marks the
// scripted step where Infie wants the viewer to press Send. `readOnly` locks fixed tutorial answers.
function InfieComposer({
  value,
  onChange,
  onSend,
  placeholder,
  glow = false,
  disabled = false,
  readOnly = false,
  ariaLabel = "Message Infie",
  className = "",
}: {
  value: string;
  onChange: (v: string) => void;
  onSend: () => void;
  placeholder: string;
  glow?: boolean;
  disabled?: boolean;
  readOnly?: boolean;
  ariaLabel?: string;
  className?: string;
}) {
  const canSend = !disabled && value.trim().length > 0;
  const glowOn = glow && canSend;
  return (
    <div className={`bg-[#252323] border border-[rgba(45,212,191,0.14)] rounded-[8px] flex gap-2 items-end px-3 py-2 ${className}`}>
      <input
        data-testid="composer-input"
        value={value}
        onChange={e => { if (!readOnly) onChange(e.target.value); }}
        onKeyDown={e => { if (e.key === "Enter" && canSend) onSend(); }}
        disabled={disabled}
        readOnly={readOnly}
        aria-readonly={readOnly || undefined}
        placeholder={placeholder}
        aria-label={ariaLabel}
        className={`flex-1 min-w-0 bg-transparent text-[12px] text-white placeholder-[#555] focus:outline-none disabled:opacity-60 ${readOnly ? "cursor-default select-none text-[#2dd4bf] font-medium" : ""}`}
        style={{ fontFamily: "'Rounded Mplus 1c',sans-serif" }}
      />
      {readOnly && value.trim().length > 0 && (
        <span
          data-testid="composer-fixed-badge"
          className="px-1.5 py-0.5 rounded bg-[rgba(45,212,191,0.1)] border border-[rgba(45,212,191,0.28)] text-[9px] font-mono uppercase tracking-wide text-[#2dd4bf] shrink-0"
        >
          Fixed reply
        </span>
      )}
      <button
        type="button"
        data-testid="composer-send"
        data-glow={glowOn ? "true" : "false"}
        disabled={!canSend}
        onClick={onSend}
        aria-label="Send"
        className={`rounded-[6px] flex items-center justify-center shrink-0 size-7 transition-colors disabled:opacity-40 ${glowOn ? "animate-pulse motion-reduce:animate-none" : "bg-[rgba(255,255,255,0.05)] hover:bg-white/10"}`}
        style={glowOn ? { ...glassStyle("teal"), cursor: "pointer" } : undefined}
      >
        <Send size={13} color={glowOn ? "#2dd4bf" : "#444"} />
      </button>
    </div>
  );
}

// The capsule-style Infie action (What's Next, Start Session, Continue, Fix Problems...).
function InfieFlowPill({
  label,
  preset,
  icon: Icon,
  glow = true,
  onClick,
  testId,
}: {
  label: string;
  preset: ActionPreset;
  icon?: IconCmp;
  glow?: boolean;
  onClick: () => void;
  testId: string;
}) {
  const c = PRESET_RGB[preset];
  return (
    <button
      type="button"
      data-testid={testId}
      data-glow={glow ? "true" : "false"}
      onClick={onClick}
      className="relative rounded-[999px] shrink-0 hover:brightness-110 transition-all"
      style={{ filter: `drop-shadow(0px 0px ${glow ? 10 : 6}px rgba(${c},${glow ? 0.55 : 0.35}))` }}
    >
      <div aria-hidden className="absolute inset-0 pointer-events-none rounded-[999px]" style={{ background: `rgba(${c},0.12)` }} />
      <div aria-hidden className="absolute inset-0 pointer-events-none rounded-[999px]" style={{ border: `1px solid rgba(${c},0.6)` }} />
      <div className="flex gap-2 items-center pl-3 pr-4 py-[7px] whitespace-nowrap relative">
        {Icon ? <span style={{ color: `rgb(${c})` }}><Icon size={14} /></span> : <span className="font-medium text-[14px]" style={{ color: `rgb(${c})` }}>✦</span>}
        <span className="font-['Inter',sans-serif] font-semibold text-[13px] text-white">{label}</span>
      </div>
      <div aria-hidden className="absolute inset-0 pointer-events-none rounded-[inherit]" style={{ boxShadow: `inset 0px 0px 25px 0px rgba(${c},0.25)` }} />
    </button>
  );
}

function ProviderAvatar({ provider }: { provider: ProviderId }) {
  return (
    <div
      className="size-[22px] rounded-full bg-[#18181f] border flex items-center justify-center shrink-0"
      style={{ borderColor: `${PROVIDER_ACCENT[provider]}66` }}
      aria-label={PROVIDER_LABEL[provider]}
    >
      <ProviderIcon provider={provider} size={13} />
    </div>
  );
}

// One scripted message (Infie, viewer or a provider) in the Experimemo project/session chats.
function FlowMessageBubble({
  msg,
  infieAvatar,
  onJump,
}: {
  msg: FlowMessage;
  infieAvatar: React.ReactNode;
  onJump?: (tab: SessionTabId) => void;
}) {
  const isUser = msg.role === "user";
  const isProvider = msg.role !== "infie" && msg.role !== "user";
  const avatar = isUser ? null : isProvider ? <ProviderAvatar provider={msg.role as ProviderId} /> : infieAvatar;
  const tone =
    msg.kind === "problem"
      ? "bg-[rgba(251,191,36,0.07)] border-[rgba(251,191,36,0.35)]"
      : msg.kind === "report"
      ? "bg-[#151822] border-[rgba(45,212,191,0.25)]"
      : msg.kind === "handoff"
      ? "bg-[rgba(45,212,191,0.06)] border-[rgba(45,212,191,0.28)]"
      : "";
  return (
    <div
      data-testid="flow-message"
      data-role={msg.role}
      data-kind={msg.kind ?? "plain"}
      className={`flex gap-[10px] items-start w-full ${isUser ? "justify-end" : "justify-start"}`}
    >
      {avatar}
      <div className={`max-w-[88%] flex flex-col gap-1 ${isUser ? "items-end" : "items-start"}`}>
        {!isUser && (
          <div className="flex flex-wrap items-center gap-2 text-[10px] text-[#71717a] px-0.5">
            <span className="font-semibold text-[#94a3b8]">{msg.sender}</span>
            {msg.badge && (
              <span className="px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-[9px] font-mono uppercase tracking-wide text-[#a1a1aa]">
                {msg.badge}
              </span>
            )}
          </div>
        )}
        <div
          className={`break-words text-[12px] leading-[19.5px] font-['Rounded_Mplus_1c',sans-serif] ${
            isUser
              ? "bg-[#2dd4bf] text-[#06201d] px-[14px] py-[10px] rounded-[12px]"
              : `px-[14px] py-[10px] rounded-bl-[10px] rounded-br-[10px] rounded-tl-[3px] rounded-tr-[10px] border text-[#d4d4d8] ${tone || "bg-[rgba(45,212,191,0.05)] border-[rgba(45,212,191,0.16)]"}`
          }`}
        >
          <p>{msg.text}</p>
          {msg.details && msg.details.length > 0 && (
            <ul className="mt-1.5 font-mono text-[10px] text-[#7dd3fc] space-y-0.5">
              {msg.details.map((d, i) => <li key={i}>{d}</li>)}
            </ul>
          )}
          {msg.kind === "handoff" && msg.target && onJump && (
            <button
              type="button"
              data-testid={`handoff-jump-${msg.target}`}
              onClick={() => onJump(msg.target!)}
              className="mt-2 px-2 py-0.5 rounded bg-[rgba(45,212,191,0.16)] border border-[rgba(45,212,191,0.35)] text-[#2dd4bf] text-[10px] font-semibold hover:brightness-110 flex items-center gap-1 cursor-pointer"
            >
              <span>Open {PROVIDER_TOPIC[msg.target]}</span>
              <ArrowRight size={10} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// Inline web preview for Experimemo: same real iframe and shared viewport state as the enlarged modal.
function ExperimemoPreviewWidget({ onEnlarge, glow = false }: { onEnlarge: () => void; glow?: boolean }) {
  const tutorial = useTutorial();
  return (
    <div
      data-testid="inline-web-preview"
      data-web-preview-glow={glow ? "true" : "false"}
      className={`flex flex-col rounded-[6px] overflow-clip shrink-0 w-full transition-all ${
        glow
          ? "border border-[#2dd4bf] shadow-[0_0_20px_rgba(45,212,191,0.45)]"
          : "border border-[rgba(255,255,255,0.05)] shadow-[0px_4px_6px_-1px_rgba(0,0,0,0.1)]"
      }`}
    >
      <div className="flex items-center justify-between gap-[8px] px-[12px] py-[7px] w-full shrink-0 border-b border-[rgba(255,255,255,0.05)] bg-[#1d1b20]">
        <span className="font-['Rounded_Mplus_1c',sans-serif] text-[11px] tracking-[0.275px] uppercase text-[#777]">Web Preview</span>
        <button
          type="button"
          data-testid="inline-web-preview-enlarge"
          onClick={onEnlarge}
          aria-label="Enlarge web preview"
          title="Enlarge"
          className="text-[#555] hover:text-[#abefa3] transition-colors"
        >
          <Maximize2 size={11} />
        </button>
      </div>
      <div className="bg-[#252323] p-2 flex flex-col gap-2">
        <PreviewViewportControls
          device={tutorial.previewDevice}
          orientation={tutorial.previewOrientation}
          onDeviceChange={tutorial.setPreviewDevice}
          onOrientationChange={tutorial.setPreviewOrientation}
        />
        <ExactWebPreviewFrame
          version={tutorial.previewVersion}
          device={tutorial.previewDevice}
          orientation={tutorial.previewOrientation}
          mode="inline"
          maxHeight={440}
        />
      </div>
    </div>
  );
}

// Restored Human Testing panel for Experimemo's project home: empty until a session creates its rows.
function ExperimemoHumanTesting({ session }: { session: SessionFlowState | null }) {
  const rows = session?.humanTests ?? [];
  const done = rows.filter(r => r.done).length;
  return (
    <div data-name="HumanTestingPanel" className="border border-[rgba(255,255,255,0.05)] flex flex-col overflow-clip rounded-[6px] shadow-[0px_4px_6px_-1px_rgba(0,0,0,0.1)] shrink-0 w-full">
      <OP4SectionHeader label={`Human Testing ${done}/${rows.length}`} color="dark" icon={<OP4DotIcon />} />
      <div className="bg-[#252323] flex flex-col w-full">
        {session && rows.length > 0 && (
          <>
            <div className="bg-[rgba(29,27,32,0.5)] border-b border-[rgba(255,255,255,0.05)] flex items-center gap-[8px] px-[12px] py-[7px] shrink-0 w-full">
              <OP4CodesandboxIcon size={16} />
              <p className="font-['Rounded_Mplus_1c',sans-serif] text-[11px] tracking-[0.275px] uppercase text-[#777] truncate">{SESSION_NAME}</p>
            </div>
            {rows.map(r => <OP4CheckRow key={r.id} done={r.done} text={r.text} />)}
          </>
        )}
        <OP4AddItemRow />
      </div>
    </div>
  );
}

// Progressive PPP Plan widget rendered in the Project Home lower slot during ping-pong planning and plan-ready.
function ExperimemoPlanWidget({ planCursor, planNotes }: { planCursor: number; planNotes: string[] }) {
  const plan = getProgressivePlan(planCursor, planNotes);
  const progressSteps = Math.min(planCursor, 6);
  return (
    <div
      data-testid="plan-widget"
      data-plan-cursor={planCursor}
      className="border border-[rgba(45,212,191,0.22)] flex flex-col h-[320px] overflow-clip rounded-[6px] shadow-[0px_4px_6px_-1px_rgba(0,0,0,0.1)] shrink-0 w-full"
    >
      <OP4SectionHeader label="Plan" color="green" icon={<OP4DotIcon />} />
      <div className="bg-[#18171c] border-b border-[rgba(255,255,255,0.05)] flex flex-wrap items-center justify-between gap-2 px-3 py-1.5 shrink-0">
        <span className="font-mono text-[10px] text-[#2dd4bf]">
          Ping-pong synthesis · step {progressSteps}/6
        </span>
        <span className="font-mono text-[10px] text-[#94a3b8]">
          Scripted demo · no live model calls
        </span>
      </div>
      <div className="bg-[#252323] flex-1 min-h-0 overflow-y-auto p-3 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        <div className="bg-[#0b131d] border border-[rgba(255,255,255,0.06)] rounded-[8px] p-2.5 flex flex-col gap-1.5">
          <div className="flex items-center justify-between gap-2">
            <span className="font-['Inter',sans-serif] text-[10px] uppercase tracking-wider text-[#2dd4bf] font-semibold">
              {plan.schemaTitle}
            </span>
          </div>
          {plan.schemaFields.length > 0 ? (
            <ul className="font-mono text-[10px] text-[#d4d4d8] space-y-0.5">
              {plan.schemaFields.map((line, i) => (
                <li key={i}>{line}</li>
              ))}
            </ul>
          ) : (
            <p className="text-[11px] text-[#71717a]">Waiting for OpenAI schema proposal…</p>
          )}
          <p className="font-mono text-[10px] text-[#7dd3fc] mt-0.5">{plan.storageDetail}</p>
        </div>

        <div className="bg-[#0b131d] border border-[rgba(255,255,255,0.06)] rounded-[8px] p-2.5 flex flex-col gap-1.5">
          <span className="font-['Inter',sans-serif] text-[10px] uppercase tracking-wider text-[#abefa3] font-semibold">
            Screens &amp; dependencies
          </span>
          {plan.screens.length > 0 ? (
            <div className="flex flex-wrap gap-1">
              {plan.screens.map((s) => (
                <span key={s} className="px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-[10px] text-[#e4e4e7]">
                  {s}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-[11px] text-[#71717a]">Waiting for Claude screen flow…</p>
          )}
          {plan.dependencies.length > 0 && (
            <ul className="text-[10.5px] text-[#cbd5e1] space-y-0.5 mt-0.5">
              {plan.dependencies.map((d, i) => (
                <li key={i}>{d}</li>
              ))}
            </ul>
          )}
        </div>

        {plan.cameraDetail && (
          <div className="bg-[#0b131d] border border-[rgba(255,255,255,0.06)] rounded-[8px] p-2.5 flex flex-col gap-1">
            <span className="font-['Inter',sans-serif] text-[10px] uppercase tracking-wider text-[#fbbf24] font-semibold">
              Camera &amp; web testing
            </span>
            <p className="text-[11px] text-[#d4d4d8] leading-snug">{plan.cameraDetail}</p>
            {plan.processDetail && (
              <p className="font-mono text-[10px] text-[#94a3b8] mt-1">{plan.processDetail}</p>
            )}
          </div>
        )}

        {plan.models && (
          <div className="bg-[#0b131d] border border-[rgba(45,212,191,0.22)] rounded-[8px] p-2.5 flex flex-col gap-1">
            <span className="font-['Inter',sans-serif] text-[10px] uppercase tracking-wider text-[#c084fc] font-semibold">
              Model assignments
            </span>
            <p className="text-[11px] text-[#f3f4f6]">
              <strong className="text-[#c084fc]">Architecture &amp; review:</strong> {plan.models.architectureReview}
            </p>
            <ul className="text-[10.5px] text-[#cbd5e1] space-y-0.5">
              {plan.models.gruntWork.map((m, i) => (
                <li key={i}>{m}</li>
              ))}
            </ul>
            <p className="text-[10px] text-[#94a3b8] mt-0.5">{plan.models.policyNote}</p>
          </div>
        )}

        {plan.notes.length > 0 && (
          <div className="sm:col-span-2 bg-[rgba(45,212,191,0.06)] border border-[rgba(45,212,191,0.22)] rounded-[8px] p-2.5 flex flex-col gap-1">
            <span className="font-['Inter',sans-serif] text-[10px] uppercase tracking-wider text-[#2dd4bf] font-semibold">
              Your plan notes
            </span>
            <ul className="text-[11px] text-[#e2e8f0] space-y-0.5">
              {plan.notes.map((note, i) => (
                <li key={i}>{note}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

// Inline i²-styled PR Review widget shown in the split workspace during Review Changes & Wrap up.
function ExperimemoPRReviewWidget({ session }: { session: SessionFlowState }) {
  const phase = session.wrapUpPhase;
  const cursor = session.wrapUpCursor;
  const doctorOk = phase === "green" || phase === "merged" || (phase === "polling" && cursor >= 1);
  const ciState =
    phase === "green" || phase === "merged"
      ? "passing"
      : phase === "polling" && cursor >= 2
      ? "fixing lint warning…"
      : phase === "polling"
      ? "polling…"
      : "queued for Wrap up";
  const commentsState =
    phase === "green" || phase === "merged"
      ? "all comments addressed"
      : phase === "polling" && cursor >= 3
      ? "applying fix…"
      : phase === "polling"
      ? "checking threads…"
      : "awaiting Wrap up";
  const statusLabel =
    phase === "merged"
      ? "Merge simulated"
      : phase === "green"
      ? "Checks green"
      : phase === "polling"
      ? "Polling checks…"
      : "Ready for Wrap up";
  const statusTone =
    phase === "merged"
      ? "text-[#c084fc] border-[rgba(192,132,252,0.4)] bg-[rgba(192,132,252,0.12)]"
      : phase === "green"
      ? "text-[#abefa3] border-[rgba(171,239,163,0.4)] bg-[rgba(171,239,163,0.12)]"
      : phase === "polling"
      ? "text-[#2dd4bf] border-[rgba(45,212,191,0.4)] bg-[rgba(45,212,191,0.12)]"
      : "text-[#60a5fa] border-[rgba(96,165,250,0.4)] bg-[rgba(96,165,250,0.12)]";

  return (
    <div
      data-testid="pr-review-widget"
      data-wrapup-phase={phase}
      className="flex-1 min-w-0 md:w-1/2 min-h-[220px] flex flex-col rounded-[6px] overflow-hidden border border-[rgba(96,165,250,0.28)] bg-[#141318] shadow-[0px_4px_12px_rgba(0,0,0,0.25)]"
    >
      <div className="bg-[#1d1b20] border-b border-[rgba(255,255,255,0.06)] flex items-center justify-between gap-2 px-3 py-2 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <GitPullRequest size={14} className="text-[#60a5fa] shrink-0" />
          <div className="min-w-0">
            <p className="font-['Inter',sans-serif] font-semibold text-[12px] text-white truncate">
              Pull Request Review
            </p>
            <p className="font-mono text-[10px] text-[#94a3b8] truncate">
              {SESSION_BRANCH} → main
            </p>
          </div>
        </div>
        <span
          data-testid="pr-review-status-pill"
          className={`px-2 py-0.5 rounded-[5px] border font-mono text-[10px] uppercase tracking-wide shrink-0 ${statusTone}`}
        >
          {statusLabel}
        </span>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto p-3 flex flex-col gap-3">
        <div className="bg-[#1b1a22] border border-[rgba(255,255,255,0.06)] rounded-[8px] p-3 flex flex-col gap-1.5">
          <span className="font-['Inter',sans-serif] text-[10px] uppercase tracking-wider text-[#2dd4bf] font-semibold">
            Story summary
          </span>
          <p className="text-[12px] text-[#e4e4e7] leading-relaxed">{SESSION_GOAL}</p>
          <ul className="text-[11px] text-[#a1a1aa] space-y-1 list-disc pl-4">
            <li>Schema &amp; offline storage wired to <span className="font-mono text-[#7dd3fc]">app:/data/experiments.json</span>.</li>
            <li>New, Track, Experiment Editor, and App Info views connected end to end.</li>
            <li>Camera capture updated with <span className="font-mono text-[#7dd3fc]">app.ts</span> grant <span className="font-mono text-[#7dd3fc]">device.camera purpose.camera</span> and <span className="font-mono text-[#7dd3fc]">strings/en.json</span> <span className="font-mono text-[#7dd3fc]">purpose.camera</span>.</li>
          </ul>
          <p className="font-mono text-[10px] text-[#71717a] mt-0.5">
            Simulated PR view · no remote repository or network requests triggered
          </p>
        </div>

        <div className="bg-[#1b1a22] border border-[rgba(255,255,255,0.06)] rounded-[8px] p-3 flex flex-col gap-2">
          <span className="font-['Inter',sans-serif] text-[10px] uppercase tracking-wider text-[#94a3b8] font-semibold">
            Simulated checks
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px]">
            <div className="bg-[#121118] border border-white/5 rounded-[6px] p-2">
              <p className="font-mono text-[10px] text-[#71717a] uppercase">Doctor</p>
              <p className={`font-semibold mt-0.5 ${doctorOk ? "text-[#abefa3]" : "text-[#e4e4e7]"}`}>
                {doctorOk ? "Zero errors" : "Pending check"}
              </p>
            </div>
            <div className="bg-[#121118] border border-white/5 rounded-[6px] p-2">
              <p className="font-mono text-[10px] text-[#71717a] uppercase">CI suite</p>
              <p className={`font-semibold mt-0.5 ${ciState === "passing" ? "text-[#abefa3]" : "text-[#fbbf24]"}`}>
                {ciState}
              </p>
            </div>
            <div className="bg-[#121118] border border-white/5 rounded-[6px] p-2">
              <p className="font-mono text-[10px] text-[#71717a] uppercase">Review comments</p>
              <p className={`font-semibold mt-0.5 ${commentsState === "all comments addressed" ? "text-[#abefa3]" : "text-[#60a5fa]"}`}>
                {commentsState}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-[#1b1a22] border border-[rgba(255,255,255,0.06)] rounded-[8px] overflow-hidden">
          <div className="bg-[rgba(37,35,35,0.6)] border-b border-[rgba(255,255,255,0.05)] flex items-center justify-between px-3 py-2">
            <span className="font-['Rounded_Mplus_1c',sans-serif] text-[11px] uppercase tracking-[0.275px] text-[#cbd5e1]">
              Session diffs
            </span>
            <span className="font-mono text-[10px] text-[#94a3b8]">
              {session.diffs.length} {session.diffs.length === 1 ? "file" : "files"}
            </span>
          </div>
          <div className="divide-y divide-[rgba(255,255,255,0.05)]">
            {session.diffs.map((d, idx) => (
              <OS1DiffRow key={idx} status={d.status} name={d.name} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Project Home ──────────────────────────────────────────────────────────

function ProjectHomeScreen({
  project,
  onOpenSession,
  onScopeNotice,
  onHome,
  onPlayground,
  levelText = "Lvl. 1",
  showHeaderControls = true,
  showLevelIndicator = true,
  showTutorialsEntry = true,
  showRoadmapSessions = true,
  showWidgetsPanel = true,
  showStartAppSlot = true,
  switchableProjects,
  onSwitchProject,
  onWidgets,
  onNotifications,
  allSessions,
  onSelectSession,
  onOpenWidget,
  levelPillDocked,
  breadcrumbsDocked,
  disabled,
  musicSlotRef,
}: {
  project: ProtoProject;
  onOpenSession: (s: ProtoSession, opts?: { justStarted?: boolean }) => void;
  onScopeNotice: (msg: string) => void;
  onHome: () => void;
  onPlayground: () => void;
  levelText?: string;
  showHeaderControls?: boolean;
  showLevelIndicator?: boolean;
  showTutorialsEntry?: boolean;
  showRoadmapSessions?: boolean;
  showWidgetsPanel?: boolean;
  showStartAppSlot?: boolean;
  switchableProjects?: ProtoProject[];
  onSwitchProject?: (p: ProtoProject) => void;
  onWidgets?: () => void;
  onNotifications?: () => void;
  allSessions?: ProtoSession[];
  onSelectSession?: (s: ProtoSession) => void;
  onOpenWidget?: (id: WidgetId, label: string) => void;
  levelPillDocked?: boolean;
  breadcrumbsDocked?: boolean;
  disabled?: boolean;
  /** Bottom-of-right-column slot where the bordered music widget renders. */
  musicSlotRef?: (el: HTMLDivElement | null) => void;
}) {
  const sessions = PROTOTYPE_SESSIONS.filter(
    s => s.projectId === project.id || (project.id === "tutorial-demo" && s.projectId === "pet")
  );
  const fixReaction = sessions.find(s => s.id === "fix-reaction-bug");
  const addComments = sessions.find(s => s.id === "add-comments") ?? sessions[0];
  const tutorial = useTutorial();
  const openSession = (s: ProtoSession | undefined) => {
    if (!s) return;
    s.wired ? onOpenSession(s) : onScopeNotice("This session is not wired into this prototype yet.");
  };
  const {
    isTutorialActive,
    currentBeat,
    turnIndex,
    setTurnIndex,
    dockedChat,
    agentQuestionReplied,
    agentQuestionReplyText,
    submitAgentQuestionReply,
  } = useOnboarding();
  const [inlineAgentReplyDraft, setInlineAgentReplyDraft] = useState(B14_AGENT_REPLY_DEFAULT);
  const highlightDemoSessionCard =
    isTutorialActive && currentBeat === "B14" && turnIndex === 2;
  const showDockedContinue = Boolean(isTutorialActive && dockedChat.showContinue && dockedChat.onContinue);
  // Keep the newest tutorial line in view (scroll only the message list, never ancestors).
  const projectChatListRef = useRef<HTMLDivElement>(null);
  const isExperimemoHome = project.id === EXPERIMEMO_PROJECT_ID;
  const experimemoFlow = tutorial.flow;
  useEffect(() => {
    const el = projectChatListRef.current;
    if ((isTutorialActive || isExperimemoHome) && el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [isTutorialActive, dockedChat.history, isExperimemoHome, experimemoFlow.homeMessages.length]);

  return (
    <div className="size-full flex flex-col relative overflow-hidden" style={{ background: "#0a0814" }}>
      {/* Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute left-[-200px] rounded-[400px] size-[800px] top-[-250px]" style={{ backgroundImage: "url(\"data:image/svg+xml;utf8,<svg viewBox='0 0 800 800' xmlns='http://www.w3.org/2000/svg'><rect width='100%25' height='100%25' fill='url(%23g)'/><defs><radialGradient id='g' gradientUnits='userSpaceOnUse' cx='0' cy='0' r='10' gradientTransform='matrix(0 -56.569 -56.569 0 400 400)'><stop stop-color='rgba(45,212,191,0.08)' offset='0'/><stop stop-color='rgba(45,212,191,0)' offset='0.65'/></radialGradient></defs></svg>\")" }} />
        <div className="absolute rounded-[350px] size-[700px]" style={{ left: 1155, top: 50, backgroundImage: "url(\"data:image/svg+xml;utf8,<svg viewBox='0 0 700 700' xmlns='http://www.w3.org/2000/svg'><rect width='100%25' height='100%25' fill='url(%23g)'/><defs><radialGradient id='g' gradientUnits='userSpaceOnUse' cx='0' cy='0' r='10' gradientTransform='matrix(0 -49.497 -49.497 0 350 350)'><stop stop-color='rgba(74,58,255,0.07)' offset='0'/><stop stop-color='rgba(74,58,255,0)' offset='0.65'/></radialGradient></defs></svg>\")" }} />
        <div className="absolute rounded-[300px] size-[600px]" style={{ left: 597, top: 411, backgroundImage: "url(\"data:image/svg+xml;utf8,<svg viewBox='0 0 600 600' xmlns='http://www.w3.org/2000/svg'><rect width='100%25' height='100%25' fill='url(%23g)'/><defs><radialGradient id='g' gradientUnits='userSpaceOnUse' cx='0' cy='0' r='10' gradientTransform='matrix(0 -42.426 -42.426 0 300 300)'><stop stop-color='rgba(171,239,163,0.05)' offset='0'/><stop stop-color='rgba(171,239,163,0)' offset='0.65'/></radialGradient></defs></svg>\")" }} />
        <div className="absolute inset-0 opacity-20"><img alt="" className="absolute inset-0 size-full object-cover" src={imgOP4} /></div>
      </div>

      {/* Header */}
      <Header
        activeLevel="project"
        level={levelText}
        showHeaderControls={showHeaderControls}
        showLevelIndicator={showLevelIndicator}
        showTutorialsEntry={showTutorialsEntry}
        projectLabel={project.name}
        currentProjectId={project.id}
        projectIcon={<ProjectGlyph size={14} color="#061413" />}
        onHome={onHome}
        onWidgets={onWidgets}
        onNotifications={onNotifications}
        switchableProjects={switchableProjects}
        onSwitchProject={onSwitchProject}
        allSessions={allSessions}
        onSelectSession={onSelectSession ?? onOpenSession}
        levelPillDocked={levelPillDocked}
        breadcrumbsDocked={breadcrumbsDocked}
        disabled={disabled}
        tab={project.id === "experimemo" ? "Workspace" : undefined}
        onTabChange={
          project.id === "experimemo"
            ? (t) => {
                if (t === "Emulators") onOpenWidget?.("emuWeb", "Web Preview");
              }
            : undefined
        }
        onOpenSession={() => {
          const firstWired = project.id === EXPERIMEMO_PROJECT_ID
            ? (tutorial.sessionStarted ? EXPERIMEMO_SESSION : undefined)
            : sessions.find(s => s.wired);
          if (firstWired) openSession(firstWired);
        }}
        onScopeNotice={onScopeNotice}
        rightSlot={
          project.id === "experimemo" ? (
            <div className="flex items-center gap-2">
              <button
                type="button"
                data-testid="project-home-web-preview-button"
                onClick={() => onOpenWidget?.("emuWeb", "Web Preview")}
                className="bg-[#2dd4bf] text-[#061413] flex gap-[6px] h-[28px] items-center px-[10px] rounded-[5px] font-bold text-[11px] hover:brightness-110 cursor-pointer shadow-sm transition-all"
              >
                <Globe size={12} />
                <span>Web Preview</span>
              </button>
            </div>
          ) : showStartAppSlot ? (
            <div className="flex items-center">
              <div className="bg-[rgba(171,239,163,0.15)] border-[rgba(171,239,163,0.3)] border-b border-l border-t border-solid flex gap-[6px] h-[28px] items-center pl-[10px] pr-[8px] rounded-bl-[5px] rounded-tl-[5px]">
                <svg className="size-[11px]" fill="rgba(171,239,163,0.8)" viewBox="0 0 11 11"><path d={svgPathsOP4.p20d46b80} /></svg>
                <p className="font-['Rounded_Mplus_1c',sans-serif] text-[#abefa3] text-[11px]">Start App</p>
                <div className="bg-[rgba(171,239,163,0.2)] border border-[rgba(171,239,163,0.3)] flex items-center justify-center rounded-[3px] px-[6px] h-[18px]">
                  <p className="font-['Rounded_Mplus_1c',sans-serif] text-[#abefa3] text-[11px]">Go</p>
                </div>
              </div>
              <div className="bg-[rgba(171,239,163,0.15)] border border-[rgba(171,239,163,0.3)] border-solid flex items-center justify-center h-[28px] w-[24px] rounded-br-[5px] rounded-tr-[5px]">
                <svg className="size-[11px]" fill="none" viewBox="0 0 11 11">
                  <path d={svgPathsOP4.p26a1c040} stroke="rgba(171,239,163,0.8)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" />
                </svg>
              </div>
            </div>
          ) : undefined
        }
      />

      {/* 3-column body */}
      <div className="flex-1 flex gap-[8px] items-stretch p-[10px] overflow-hidden min-h-0 relative z-10">

        {/* ── LEFT COLUMN ── */}
        {showRoadmapSessions && <div className="hidden md:flex w-[236px] shrink-0 flex-col gap-[24px] overflow-y-auto">

          {/* Project Folder */}
          <div className="border border-[rgba(255,255,255,0.05)] flex flex-col h-[146.5px] overflow-clip rounded-[6px] shadow-[0px_4px_6px_-1px_rgba(0,0,0,0.1)] shrink-0 w-full">
            <OP4SectionHeader label="Project Folder" color="green" icon={<OP4DotIcon />} />
            <div className="bg-[#252323] flex flex-col w-full">
              {["Info.md", "Todo.md", "Style.md", "Guidelines.md"].map(f => (
                <div key={f} className="flex gap-[8px] items-center px-[12px] py-[6px] w-full">
                  <OP4FileIcon />
                  <p className="font-['Rounded_Mplus_1c',sans-serif] text-[#c5c5c5] text-[11px]">{f}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Activity (not part of the Experimemo project home) */}
          {project.id !== EXPERIMEMO_PROJECT_ID && (
          <div className="border border-[rgba(255,255,255,0.05)] flex flex-col h-[118px] overflow-clip rounded-[6px] shadow-[0px_4px_6px_-1px_rgba(0,0,0,0.1)] shrink-0 w-full">
            <OP4SectionHeader label="Recent Activity" color="green" icon={<OP4DotIcon />} />
            <div className="bg-[#252323] flex flex-col w-full">
              {(project.id === "experimemo"
                ? ["screens-and-function", "initial-workspace"]
                : ["add comments", "fix-reaction-bug"]
              ).map(name => (
                <div key={name} className="flex gap-[8px] items-center px-[12px] py-[6px] w-full">
                  <OP4CodesandboxIcon size={16} />
                  <p className="font-['Rounded_Mplus_1c',sans-serif] text-[#c5c5c5] text-[16px]">{name}</p>
                </div>
              ))}
              <OP4AddItemRow />
            </div>
          </div>
          )}

          {/* Agent Tasks */}
          <div className="border border-[rgba(255,255,255,0.05)] flex flex-1 flex-col min-h-px overflow-clip rounded-[6px] shadow-[0px_4px_6px_-1px_rgba(0,0,0,0.1)] w-full">
            <OP4SectionHeader label="Agent Tasks" color="dark" icon={<OP4DotIcon />} />
            {project.id === "experimemo" ? (
              <>
                {/* INFIE */}
                <div className="bg-[rgba(29,27,32,0.5)] border-b border-[rgba(255,255,255,0.05)] flex items-center gap-[8px] px-[12px] py-[7px] shrink-0 w-full">
                  <div className="relative shrink-0 size-[22px]">
                    <svg className="absolute block inset-0 size-full" fill="none" viewBox="0 0 22 22">
                      <mask fill="white" id="op4-at-mask-exp"><path d={svgPathsOP4.p3d935080} /></mask>
                      <path d={svgPathsOP4.p3d935080} fill="#2DD4BF" fillOpacity="0.094" />
                      <path d={svgPathsOP4.pd00cf00} fill="#2DD4BF" fillOpacity="0.25" mask="url(#op4-at-mask-exp)" />
                      <path d={svgPathsOP4.p141f87c0} stroke="#2DD4BF" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.875" />
                    </svg>
                  </div>
                  <p className="font-['Rounded_Mplus_1c',sans-serif] text-[11px] tracking-[0.275px] uppercase text-[#777]">Infie</p>
                </div>
                <div className="bg-[#252323] flex flex-col w-full">
                  <OP4CheckRow done={true} text="Generate Experimemo workspace" />
                  <OP4AddItemRow />
                </div>
                {tutorial.session && (
                  <>
                    <div className="bg-[rgba(29,27,32,0.5)] border-b border-[rgba(255,255,255,0.05)] border-t flex items-center gap-[8px] px-[12px] py-[7px] shrink-0 w-full">
                      <OP4CodesandboxIcon size={16} />
                      <p className="font-['Rounded_Mplus_1c',sans-serif] text-[11px] tracking-[0.275px] uppercase text-[#777] truncate">{SESSION_NAME}</p>
                    </div>
                    <div className="bg-[#252323] flex flex-col w-full">
                      {tutorial.session.tasks.map(t => (
                        <OP4CheckRow key={t.id} done={t.status === "completed"} text={t.label} />
                      ))}
                      <OP4AddItemRow />
                    </div>
                  </>
                )}
              </>
            ) : (
              <>
                {/* INFIE */}
                <div className="bg-[rgba(29,27,32,0.5)] border-b border-[rgba(255,255,255,0.05)] flex items-center gap-[8px] px-[12px] py-[7px] shrink-0 w-full">
                  <div className="relative shrink-0 size-[22px]">
                    <svg className="absolute block inset-0 size-full" fill="none" viewBox="0 0 22 22">
                      <mask fill="white" id="op4-at-mask"><path d={svgPathsOP4.p3d935080} /></mask>
                      <path d={svgPathsOP4.p3d935080} fill="#2DD4BF" fillOpacity="0.094" />
                      <path d={svgPathsOP4.pd00cf00} fill="#2DD4BF" fillOpacity="0.25" mask="url(#op4-at-mask)" />
                      <path d={svgPathsOP4.p141f87c0} stroke="#2DD4BF" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.875" />
                    </svg>
                  </div>
                  <p className="font-['Rounded_Mplus_1c',sans-serif] text-[11px] tracking-[0.275px] uppercase text-[#777]">Infie</p>
                </div>
                <div className="bg-[#252323] flex flex-col w-full">
                  <OP4CheckRow done={true} text="Create add comments session" />
                  <OP4CheckRow done={true} text="Create Fix Reaction Bugs session" />
                  <OP4CheckRow done={false} text="Open PR for Project folder" />
                  <OP4AddItemRow />
                </div>
                {/* ADD COMMENTS */}
                <div className="bg-[rgba(29,27,32,0.5)] border-b border-[rgba(255,255,255,0.05)] border-t flex items-center gap-[8px] px-[12px] py-[7px] shrink-0 w-full">
                  <OP4CodesandboxIcon size={16} />
                  <p className="font-['Rounded_Mplus_1c',sans-serif] text-[11px] tracking-[0.275px] uppercase text-[#777]">add comments</p>
                </div>
                <div className="bg-[#252323] flex flex-col w-full">
                  <OP4CheckRow done={true} text="Implement PhotoPicker component" />
                  <OP4CheckRow done={true} text="Wire up usePhotoShare hook" />
                  <OP4CheckRow done={false} text="Compress images before upload" />
                  <OP4AddItemRow />
                </div>
                {/* FIX REACTION BUGS */}
                <div className="bg-[rgba(29,27,32,0.5)] border-b border-[rgba(255,255,255,0.05)] border-t flex items-center gap-[8px] px-[12px] py-[7px] shrink-0 w-full">
                  <OP4CodesandboxIcon size={16} />
                  <p className="font-['Rounded_Mplus_1c',sans-serif] text-[11px] tracking-[0.275px] uppercase text-[#777]">fix reaction bugs</p>
                </div>
                <div className="bg-[#252323] flex flex-col w-full">
                  <OP4CheckRow done={true} text="Implement PhotoPicker component" />
                  <OP4CheckRow done={true} text="Wire up usePhotoShare hook" />
                  <OP4CheckRow done={true} text="Wire up usePhotoShare hook" />
                  <OP4CheckRow done={false} text="Add friend list query to Supabase" />
                  <OP4CheckRow done={false} text="Handle photo library permissions" />
                  <OP4AddItemRow />
                </div>
              </>
            )}
          </div>
          {/* Explorer — bottom-left for Experimemo */}
          {project.id === EXPERIMEMO_PROJECT_ID && (
            <div data-testid="project-explorer" className="border border-[rgba(255,255,255,0.05)] flex flex-col h-[210px] overflow-clip rounded-[6px] shadow-[0px_4px_6px_-1px_rgba(0,0,0,0.1)] shrink-0 w-full">
              <OP4SectionHeader label="Explorer" color="dark" icon={<OP4DotIcon />} />
              <div className="bg-[#252323] flex flex-1 flex-col overflow-clip p-[4px]">
                <div className="flex gap-[6px] items-center px-[8px] py-[3px] rounded-[6px] w-full"><OP4ChevronDown /><OP4FolderIcon /><p className="font-['Rounded_Mplus_1c',sans-serif] text-[#c5c5c5] text-[11px] truncate">experimemo-i2Workspace</p></div>
                <div className="flex gap-[6px] items-center pl-[22px] pr-[8px] py-[3px] rounded-[6px] w-full"><OP4ChevronRight /><OP4FolderOpenIcon /><p className="font-['Rounded_Mplus_1c',sans-serif] text-[#c5c5c5] text-[11px]">main</p></div>
                {tutorial.session && (
                  <div className="flex gap-[6px] items-center pl-[22px] pr-[8px] py-[3px] rounded-[6px] w-full"><OP4ChevronRight /><OP4FolderOpenIcon /><p className="font-['Rounded_Mplus_1c',sans-serif] text-[#c5c5c5] text-[11px] truncate">{EXPERIMEMO_SESSION.branch}</p></div>
                )}
                <div className="flex gap-[6px] items-center pl-[22px] pr-[8px] py-[3px] rounded-[6px] w-full"><OP4ChevronRight /><OP4FolderOpenIcon /><p className="font-['Rounded_Mplus_1c',sans-serif] text-[#c5c5c5] text-[11px]">project</p></div>
                <div className="flex gap-[6px] items-center pl-[22px] pr-[8px] py-[3px] rounded-[6px] w-full"><OP4ChevronRight /><OP4FolderOpenIcon /><p className="font-['Rounded_Mplus_1c',sans-serif] text-[#c5c5c5] text-[11px]">generated</p></div>
                <div className="flex gap-[6px] items-center pl-[22px] pr-[8px] py-[3px] rounded-[6px] w-full"><OP4ChevronRight /><OP4FolderOpenIcon /><p className="font-['Rounded_Mplus_1c',sans-serif] text-[#c5c5c5] text-[11px]">test-apps</p></div>
              </div>
            </div>
          )}
        </div>}

        {/* ── CENTER COLUMN ── */}
        <div className="flex-1 min-w-0 flex flex-col gap-0 overflow-hidden">
          {/* Messages + Infie header + actions + input */}
          <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
            {/* Infie header row */}
            <div className="bg-[rgba(45,212,191,0.02)] border-b border-[rgba(45,212,191,0.09)] flex gap-[10px] items-center px-[16px] py-[8px] w-full shrink-0">
              <OP4InfieAvatar />
              <div className="flex flex-col flex-1 min-w-0">
                <p className="font-['Rounded_Mplus_1c',sans-serif] font-extrabold text-[#2dd4bf] text-[12px]">Infie</p>
                <p className="font-['Rounded_Mplus_1c',sans-serif] text-[#555] text-[9px]">IDE Orchestrator · coordinates agents, worktrees & project memory</p>
              </div>
              <div className="flex gap-[6px] items-center shrink-0">
                <div className="bg-[#2dd4bf] rounded-full size-[6px]" />
                <p className="font-['Rounded_Mplus_1c',sans-serif] text-[#2dd4bf] text-[9px]">Active</p>
              </div>
            </div>
            <div ref={projectChatListRef} className="flex-1 overflow-y-auto p-[16px] flex flex-col gap-[16px]">
              {isExperimemoHome ? (
                experimemoFlow.homeMessages.map(m => (
                  <FlowMessageBubble key={m.id} msg={m} infieAvatar={<OP4InfieAvatar />} />
                ))
              ) : isTutorialActive ? (
                <>
                  {dockedChat.history.map((m, idx) => {
                    const isLatest = idx === dockedChat.history.length - 1;
                    if (m.kind === "agent_question") {
                      // B14: the demo agent question arrives as an ordinary chat message,
                      // in conversation order, with its bordered reply field and Send.
                      return (
                        <div
                          key={m.id}
                          data-name="InlineAgentQuestionMessage"
                          data-message-id={m.id}
                          className="flex gap-[10px] items-start w-full"
                        >
                          <OP4InfieAvatar />
                          <div
                            className="flex flex-col gap-2.5 items-start px-[14px] py-[12px] rounded-bl-[10px] rounded-br-[10px] rounded-tl-[3px] rounded-tr-[10px] flex-1"
                            style={{
                              background: "transparent",
                              border: "1px solid rgba(45, 212, 191, 0.45)",
                            }}
                          >
                            <p className="font-['Space_Grotesk',sans-serif] font-semibold text-[#2dd4bf] text-[12px]">
                              Agent question · {addComments?.name || "Add Comments"}: “{m.text}”
                            </p>
                            {agentQuestionReplied ? (
                              <span className="inline-flex items-center gap-1.5 font-['Rounded_Mplus_1c',sans-serif] text-[12px] text-[#abefa3]">
                                <Check size={13} /> Reply sent to session agent: “{agentQuestionReplyText}”
                              </span>
                            ) : (
                              <form
                                onSubmit={(e) => {
                                  e.preventDefault();
                                  const reply = inlineAgentReplyDraft.trim() || B14_AGENT_REPLY_DEFAULT;
                                  submitAgentQuestionReply(reply);
                                  setTurnIndex(2);
                                }}
                                className="flex flex-wrap items-end gap-2.5 w-full"
                                style={{ background: "transparent", border: "none" }}
                              >
                                <FloatingField
                                  id="b14-agent-reply"
                                  label="Reply to agent"
                                  placeholder="Newest first…"
                                  value={inlineAgentReplyDraft}
                                  onChange={setInlineAgentReplyDraft}
                                  className="flex-1 min-w-[220px]"
                                />
                                <FloatingButton type="submit" variant="primary">
                                  <Send size={13} />
                                  <span>Send</span>
                                </FloatingButton>
                              </form>
                            )}
                          </div>
                        </div>
                      );
                    }
                    return (
                      <div key={m.id} className="flex gap-[10px] items-start w-full">
                        <OP4InfieAvatar />
                        <div
                          data-slot={isLatest ? "infie-message" : undefined}
                          data-message-id={m.id}
                          role={isLatest ? "status" : undefined}
                          aria-live={isLatest ? "polite" : undefined}
                          className="flex flex-col items-start px-[14px] py-[10px] rounded-bl-[10px] rounded-br-[10px] rounded-tl-[3px] rounded-tr-[10px] flex-1"
                          style={{
                            background: "transparent",
                            border: isLatest
                              ? "1px solid rgba(45, 212, 191, 0.45)"
                              : "1px solid rgba(45, 212, 191, 0.16)",
                          }}
                        >
                          <p className="font-['Rounded_Mplus_1c',sans-serif] text-[#e5e7eb] text-[13px] leading-[19.5px]">
                            {m.text}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </>
              ) : (
                [
                  "Session initialised. Scanning `expo-photo-share/project/Todo.md`… found 3 open tasks, 2 completed.",
                  "Worktree `feature/photo-share` is active. Claude is working on `PhotoPicker.tsx` and `usePhotoShare.ts`. No conflicts between worktrees detected.",
                  "Emulator connected on port 8081. Doctor passed all checks. Handing control to session agent.",
                ].map((msg, i) => (
                  <div key={i} className="flex gap-[10px] items-start w-full">
                    <OP4InfieAvatar />
                    <div className="bg-[rgba(45,212,191,0.05)] border border-[rgba(45,212,191,0.13)] flex flex-col items-start px-[14px] py-[10px] rounded-bl-[10px] rounded-br-[10px] rounded-tl-[3px] rounded-tr-[10px] flex-1">
                      <p className="font-['Rounded_Mplus_1c',sans-serif] text-[#c5c5c5] text-[12px] leading-[19.5px]">{msg}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
            {/* Action pills — directly above the input, no backdrop. The docked tutorial Continue
                sits first; the other pills are greyed out during the tutorial. */}
            <div className="w-full shrink-0">
              <div
                data-name="DockedChatActionRow"
                className={`flex flex-wrap gap-[8px] items-center justify-center p-[8px] ${
                  isTutorialActive ? "min-h-[54px]" : ""
                }`}
              >
                {project.id === "experimemo" ? (
                  <>
                    {experimemoFlow.stage === "starter" && (
                      <InfieFlowPill
                        testId="whats-next-button"
                        label="What's Next"
                        preset="teal"
                        onClick={() => tutorial.dispatchFlow({ type: "WHATS_NEXT" })}
                      />
                    )}
                    {experimemoFlow.stage === "plan-ready" && (
                      <InfieFlowPill
                        testId="start-session-button"
                        label={SESSION_FLOW.READY.label}
                        preset={SESSION_FLOW.READY.preset}
                        icon={SESSION_FLOW.READY.icon}
                        onClick={() => {
                          tutorial.dispatchFlow({ type: "START_SESSION" });
                          onOpenSession(EXPERIMEMO_SESSION, { justStarted: true });
                        }}
                      />
                    )}
                  </>
                ) : (
                  <>
                    {showDockedContinue && <FloatingContinueButton onClick={dockedChat.onContinue!} />}
                    {/* Teal: Wrap up */}
                    <div
                      className={`drop-shadow-[0px_0px_6px_rgba(45,212,191,0.35)] relative rounded-[999px] shrink-0 ${isTutorialActive ? TUTORIAL_DISABLED_ACTION_CLS : ""}`}
                      data-tutorial-disabled={isTutorialActive ? "true" : undefined}
                      aria-disabled={isTutorialActive || undefined}
                    >
                      <div className="absolute bg-[rgba(17,40,37,0.75)] inset-0 pointer-events-none rounded-[999px]" />
                      <div className="absolute border border-[rgba(45,212,191,0.5)] inset-0 pointer-events-none rounded-[999px]" />
                      <div className="flex gap-[8px] items-start pl-[12px] pr-[16px] py-[10px] relative">
                        <p className="font-medium text-[#2dd4bf] text-[14px] leading-normal">✦</p>
                        <div className="flex flex-col gap-[2px] overflow-hidden">
                          <div className="flex gap-[4px] items-center">
                            <p className="font-['Inter',sans-serif] font-semibold text-white text-[13px] whitespace-nowrap">Wrap up</p>
                            <OP4SessionIcon />
                            <p className="font-['Inter',sans-serif] text-[rgba(255,255,255,0.6)] text-[11px] whitespace-nowrap">fix-reaction-bug</p>
                          </div>
                          <p className="font-['Inter',sans-serif] text-[rgba(255,255,255,0.7)] text-[11px] whitespace-nowrap">All tasks are complete</p>
                        </div>
                      </div>
                      <div className="absolute inset-0 pointer-events-none rounded-[inherit] shadow-[inset_0px_0px_25px_0px_rgba(45,212,191,0.25)]" />
                    </div>
                    {/* Amber: Test changes */}
                    <div
                      className={`drop-shadow-[0px_0px_6px_rgba(251,191,36,0.35)] relative rounded-[999px] shrink-0 ${isTutorialActive ? TUTORIAL_DISABLED_ACTION_CLS : ""}`}
                      data-tutorial-disabled={isTutorialActive ? "true" : undefined}
                      aria-disabled={isTutorialActive || undefined}
                    >
                      <div className="absolute bg-[rgba(45,37,15,0.75)] inset-0 pointer-events-none rounded-[999px]" />
                      <div className="absolute border border-[rgba(251,191,36,0.5)] inset-0 pointer-events-none rounded-[999px]" />
                      <div className="flex gap-[8px] items-start pl-[12px] pr-[16px] py-[10px] relative">
                        <p className="font-['Inter',sans-serif] font-medium text-[#fbbf24] text-[14px] leading-normal">⚠</p>
                        <div className="flex flex-col gap-[2px] overflow-hidden">
                          <div className="flex gap-[4px] items-center">
                            <p className="font-['Inter',sans-serif] font-semibold text-white text-[13px] whitespace-nowrap">Test changes in</p>
                            <OP4SessionIcon />
                            <p className="font-['Inter',sans-serif] text-[rgba(255,255,255,0.6)] text-[11px] whitespace-nowrap">Add comments</p>
                          </div>
                          <p className="font-['Inter',sans-serif] text-[rgba(255,255,255,0.7)] text-[11px] whitespace-nowrap">Attempt to add comment and react to it.</p>
                        </div>
                      </div>
                      <div className="absolute inset-0 pointer-events-none rounded-[inherit] shadow-[inset_0px_0px_25px_0px_rgba(251,191,36,0.25)]" />
                    </div>
                    {/* Compact teal */}
                    <div
                      className={`drop-shadow-[0px_0px_6px_rgba(45,212,191,0.35)] relative rounded-[999px] shrink-0 ${isTutorialActive ? TUTORIAL_DISABLED_ACTION_CLS : ""}`}
                      data-tutorial-disabled={isTutorialActive ? "true" : undefined}
                      aria-disabled={isTutorialActive || undefined}
                    >
                      <div className="absolute bg-[rgba(17,40,37,0.75)] inset-0 pointer-events-none rounded-[999px]" />
                      <div className="absolute border border-[rgba(45,212,191,0.5)] inset-0 pointer-events-none rounded-[999px]" />
                      <div className="flex gap-[8px] items-center pl-[12px] pr-[16px] py-[7px] relative whitespace-nowrap">
                        <p className="font-medium text-[#2dd4bf] text-[14px]">✦</p>
                        <p className="font-['Inter',sans-serif] font-semibold text-white text-[13px]">Recommendation</p>
                      </div>
                      <div className="absolute inset-0 pointer-events-none rounded-[inherit] shadow-[inset_0px_0px_25px_0px_rgba(45,212,191,0.25)]" />
                    </div>
                  </>
                )}
              </div>
            </div>
            {/* Input */}
            <div className="border-t border-[rgba(255,255,255,0.05)] flex flex-col items-start py-[12px] w-full shrink-0">
              {isExperimemoHome ? (
                <InfieComposer
                  className="w-full"
                  value={experimemoFlow.homeDraft}
                  onChange={v => tutorial.dispatchFlow({ type: "SET_HOME_DRAFT", value: v })}
                  onSend={() => tutorial.dispatchFlow({ type: "SEND_HOME", text: experimemoFlow.homeDraft })}
                  placeholder={
                    experimemoFlow.stage === "plan-ready"
                      ? PLAN_COMPOSER_GHOST
                      : "Ask Infie to coordinate, scan, or switch agents… (⌘↵)"
                  }
                  glow={experimemoFlow.stage === "question" || experimemoFlow.stage === "schema-question"}
                  readOnly={experimemoFlow.stage === "question" || experimemoFlow.stage === "schema-question"}
                  disabled={
                    experimemoFlow.stage === "scanning" ||
                    experimemoFlow.stage === "planning" ||
                    experimemoFlow.stage === "session" ||
                    experimemoFlow.stage === "cleaned-up"
                  }
                />
              ) : (
              <div className="bg-[#252323] border border-[rgba(45,212,191,0.14)] flex gap-[8px] items-end px-[12px] py-[8px] rounded-[8px] w-full">
                  <p className="flex-1 font-['Rounded_Mplus_1c',sans-serif] text-[#444] text-[12px] leading-[19.5px]">Ask Infie to coordinate, scan, or switch agents… (⌘↵)</p>
                  <div className="bg-[rgba(255,255,255,0.05)] flex items-center justify-center rounded-[6px] size-[28px] shrink-0">
                    <svg className="size-[13px]" fill="none" viewBox="0 0 13 13">
                      <path d={svgPathsOP4.p2ca29780} stroke="#444" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.08333" />
                      <path d={svgPathsOP4.p3f86e380} stroke="#444" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.08333" />
                    </svg>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Sessions / Plan panel */}
          {showRoadmapSessions && (
            isExperimemoHome && (experimemoFlow.stage === "planning" || experimemoFlow.stage === "plan-ready") ? (
              <ExperimemoPlanWidget
                planCursor={experimemoFlow.planCursor}
                planNotes={experimemoFlow.planNotes}
              />
            ) : (
              <div className="border border-[rgba(255,255,255,0.05)] flex flex-col h-[320px] overflow-clip rounded-[6px] shadow-[0px_4px_6px_-1px_rgba(0,0,0,0.1)] shrink-0 w-full">
                <OP4SectionHeader label="Sessions" color="green" icon={<OP4DotIcon />} />
                <div className="bg-[#252323] flex flex-1 gap-[6px] items-center justify-center min-h-px p-[10px]">
                  {project.id === "experimemo" ? (
                    tutorial.session ? (
                      <div
                        data-name="ExperimemoSessionCard"
                        data-testid="experimemo-session-card"
                        onClick={() => openSession(EXPERIMEMO_SESSION)}
                        className="bg-[#0b131d] flex flex-col gap-[20px] items-start p-[20px] relative rounded-[12px] flex-1 min-w-0 h-full cursor-pointer hover:brightness-105 transition-all"
                      >
                        <div className="absolute border border-[rgba(45,212,191,0.3)] inset-0 pointer-events-none rounded-[12px]" />
                        <div className="flex items-center justify-between w-full">
                          <div className="flex items-center gap-[4px] flex-1 min-w-0">
                            <OP4BigCodesandboxIcon />
                            <div className="flex-1 min-w-0">
                              <p className="font-['Inter',sans-serif] font-bold text-[#f3f4f6] text-[18px] truncate">
                                {EXPERIMEMO_SESSION.name}
                              </p>
                              <p className="font-['Cousine',monospace] text-[#9ca3af] text-[12px] truncate">
                                {"⊣"} {EXPERIMEMO_SESSION.branch}
                              </p>
                            </div>
                          </div>
                          <button
                            type="button"
                            data-testid="open-experimemo-session-button"
                            onClick={(e) => {
                              e.stopPropagation();
                              openSession(EXPERIMEMO_SESSION);
                            }}
                            className="bg-[#2dd4bf] flex gap-[6px] items-center px-[14px] py-[8px] rounded-[8px] text-[#061413] font-semibold text-[12px] hover:brightness-110 shrink-0 ml-2"
                          >
                            <Play size={13} fill="#061413" />
                            <span>Open session</span>
                          </button>
                        </div>
                        <div className="flex flex-col gap-[8px] w-full">
                          <div className="flex gap-[8px]">
                            <div className="bg-[#0b0a15] flex flex-1 flex-col gap-[6px] p-[12px] rounded-[8px]">
                              <p className="font-['Inter',sans-serif] font-semibold text-[#9ca3af] text-[10px] uppercase">Status</p>
                              <div data-testid="project-session-status"><StatusChip status={tutorial.session.status} /></div>
                            </div>
                            <div className="bg-[#0b0a15] flex flex-1 flex-col gap-[6px] p-[12px] rounded-[8px]">
                              <p className="font-['Inter',sans-serif] font-semibold text-[#9ca3af] text-[10px] uppercase">Model</p>
                              <p className="font-['Inter',sans-serif] font-bold text-[#f3f4f6] text-[14px] truncate w-full">{EXPERIMEMO_SESSION.model}</p>
                            </div>
                          </div>
                          <div className="flex gap-[8px]">
                            <div className="bg-[#0b0a15] flex flex-1 flex-col gap-[6px] p-[12px] rounded-[8px]">
                              <p className="font-['Inter',sans-serif] font-semibold text-[#9ca3af] text-[10px] uppercase">Progress</p>
                              <p className="font-['Inter',sans-serif] font-bold text-[#f3f4f6] text-[14px]">
                                {countCompletedTasks(tutorial.session)} / {tutorial.session.tasks.length} tasks
                              </p>
                            </div>
                            <div className="bg-[#0b0a15] flex flex-1 flex-col gap-[6px] p-[12px] rounded-[8px]">
                              <p className="font-['Inter',sans-serif] font-semibold text-[#9ca3af] text-[10px] uppercase">Agents</p>
                              <p className="font-['Inter',sans-serif] font-bold text-[#f3f4f6] text-[14px]">{PROVIDERS.length}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <p data-testid="project-sessions-empty" className="font-['Rounded_Mplus_1c',sans-serif] text-[12px] text-[#71717a] text-center">
                        {experimemoFlow.archivedSessionCount > 0
                          ? `No active sessions · ${experimemoFlow.archivedSessionCount} completed session archived`
                          : "No sessions yet."}
                      </p>
                    )
                  ) : (
                <>
                  {/* Fix Reaction Bug */}
                  <button onClick={() => openSession(fixReaction)} className="bg-[#0b131d] flex flex-col gap-[20px] items-start p-[20px] relative rounded-[12px] flex-1 min-w-0 h-full text-left hover:brightness-110 transition-all">
                    <div className="absolute border border-[rgba(255,255,255,0.1)] inset-0 pointer-events-none rounded-[12px]" />
                    <div className="flex items-center gap-[4px] w-full">
                      <OP4BigCodesandboxIcon />
                      <div className="flex-1 min-w-0">
                        <p className="font-['Inter',sans-serif] font-bold text-[#f3f4f6] text-[20px] truncate">Fix Reaction Bug</p>
                        <p className="font-['Cousine',monospace] text-[#9ca3af] text-[12px] truncate">{"⊣"} chore/fix-reaction-bug</p>
                      </div>
                    </div>
                    <div className="flex flex-col gap-[8px] w-full">
                      <div className="flex gap-[8px]">
                        <div className="bg-[#0b0a15] flex flex-1 flex-col gap-[6px] p-[12px] rounded-[8px]">
                          <p className="font-['Inter',sans-serif] font-semibold text-[#9ca3af] text-[10px] uppercase">Status</p>
                          <div className="bg-[rgba(45,212,191,0.08)] flex items-center px-[10px] py-[4px] relative rounded-[6px]">
                            <div className="absolute border border-[rgba(45,212,191,0.2)] inset-0 pointer-events-none rounded-[6px]" />
                            <p className="font-['Inter',sans-serif] font-bold text-[#2dd4bf] text-[11px] uppercase">Coding</p>
                          </div>
                        </div>
                        <div className="bg-[#0b0a15] flex flex-1 flex-col gap-[6px] p-[12px] rounded-[8px]">
                          <p className="font-['Inter',sans-serif] font-semibold text-[#9ca3af] text-[10px] uppercase">Model</p>
                          <p className="font-['Inter',sans-serif] font-bold text-[#f3f4f6] text-[14px] truncate w-full">GPT-5.6 Terra</p>
                        </div>
                      </div>
                      <div className="flex gap-[8px]">
                        <div className="bg-[#0b0a15] flex flex-1 flex-col gap-[6px] p-[12px] rounded-[8px]">
                          <p className="font-['Inter',sans-serif] font-semibold text-[#9ca3af] text-[10px] uppercase">Progress</p>
                          <p className="font-['Inter',sans-serif] font-bold text-[#f3f4f6] text-[14px]">4 / 8 tasks</p>
                        </div>
                        <div className="bg-[#0b0a15] flex flex-1 flex-col gap-[6px] p-[12px] rounded-[8px]">
                          <p className="font-['Inter',sans-serif] font-semibold text-[#9ca3af] text-[10px] uppercase">Agents</p>
                          <p className="font-['Inter',sans-serif] font-bold text-[#f3f4f6] text-[14px]">2</p>
                        </div>
                      </div>
                    </div>
                  </button>
                  {/* Add Comments */}
                  <div
                    data-name="DemoSessionCard"
                    onClick={() => openSession(addComments)}
                    className={`bg-[#0b131d] flex flex-col gap-[20px] items-start p-[20px] relative rounded-[12px] flex-1 min-w-0 h-full cursor-pointer transition-all ${
                      highlightDemoSessionCard
                        ? "shadow-[0_0_24px_rgba(45,212,191,0.5)]"
                        : ""
                    }`}
                  >
                    <div
                      className={`absolute inset-0 pointer-events-none rounded-[12px] border ${
                        highlightDemoSessionCard
                          ? "border-[#2dd4bf]"
                          : "border-[rgba(255,255,255,0.1)]"
                      }`}
                    />
                    <div className="flex items-center justify-between w-full">
                      <div className="flex items-center gap-[4px] flex-1 min-w-0">
                        <OP4BigCodesandboxIcon />
                        <div className="flex-1 min-w-0">
                          <p className="font-['Inter',sans-serif] font-bold text-[#f3f4f6] text-[20px] truncate">{addComments?.name || "Add Comments"}</p>
                          <p className="font-['Cousine',monospace] text-[#9ca3af] text-[12px] truncate">{"⊣"} {addComments?.branch || "feat/add-comments"}</p>
                        </div>
                      </div>
                      <button onClick={(e) => { e.stopPropagation(); openSession(addComments); }} className="bg-[rgba(245,158,11,0.08)] flex gap-[8px] items-center px-[14px] py-[10px] relative rounded-[8px] shrink-0 hover:brightness-110 transition-all ml-2">
                        <div className="absolute border border-[rgba(245,158,11,0.2)] inset-0 pointer-events-none rounded-[8px]" />
                        <Play size={13} className="text-[#f59e0b] fill-[#f59e0b]" />
                        <p className="font-['Inter',sans-serif] font-medium text-[#f59e0b] text-[12px] whitespace-nowrap">Test now</p>
                      </button>
                    </div>
                    <div className="flex flex-col gap-[8px] w-full">
                      <div className="flex gap-[8px]">
                        <div className="bg-[#0b0a15] flex flex-1 flex-col gap-[6px] p-[12px] rounded-[8px]">
                          <p className="font-['Inter',sans-serif] font-semibold text-[#9ca3af] text-[10px] uppercase">Status</p>
                          <div className="bg-[rgba(245,158,11,0.08)] flex items-center px-[10px] py-[4px] relative rounded-[6px]">
                            <div className="absolute border border-[rgba(245,158,11,0.2)] inset-0 pointer-events-none rounded-[6px]" />
                            <p className="font-['Inter',sans-serif] font-bold text-[#f59e0b] text-[11px] uppercase whitespace-nowrap">Waiting on test</p>
                          </div>
                        </div>
                        <div className="bg-[#0b0a15] flex flex-1 flex-col gap-[6px] p-[12px] rounded-[8px]">
                          <p className="font-['Inter',sans-serif] font-semibold text-[#9ca3af] text-[10px] uppercase">Model</p>
                          <p className="font-['Inter',sans-serif] font-bold text-[#f3f4f6] text-[14px] truncate w-full">Claude Sonnet</p>
                        </div>
                      </div>
                      <div className="flex gap-[8px]">
                        <div className="bg-[#0b0a15] flex flex-1 flex-col gap-[6px] p-[12px] rounded-[8px]">
                          <p className="font-['Inter',sans-serif] font-semibold text-[#9ca3af] text-[10px] uppercase">Progress</p>
                          <p className="font-['Inter',sans-serif] font-bold text-[#f3f4f6] text-[14px]">6 / 9 tasks</p>
                        </div>
                        <div className="bg-[#0b0a15] flex flex-1 flex-col gap-[6px] p-[12px] rounded-[8px]">
                          <p className="font-['Inter',sans-serif] font-semibold text-[#9ca3af] text-[10px] uppercase">Agents</p>
                          <p className="font-['Inter',sans-serif] font-bold text-[#f3f4f6] text-[14px]">3</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
          ))}
        </div>

        {/* ── RIGHT COLUMN — panels appear when introduced; the bordered music widget
             always lives at its bottom so it never covers content ── */}
        <div className={`hidden lg:flex ${project.id === EXPERIMEMO_PROJECT_ID ? "w-[336px]" : "w-[272px]"} shrink-0 flex-col gap-[8px] overflow-y-auto min-h-0`}>
          {showWidgetsPanel && <>

          {project.id === "experimemo" ? (
            <>
              <ExperimemoHumanTesting session={tutorial.session} />
              <ExperimemoPreviewWidget onEnlarge={() => onOpenWidget?.("emuWeb", "Web Preview")} />
            </>
          ) : (
            <>
              {/* Human Testing 1/4 */}
              <div className="border border-[rgba(255,255,255,0.05)] flex flex-col h-[277px] overflow-clip rounded-[6px] shadow-[0px_4px_6px_-1px_rgba(0,0,0,0.1)] shrink-0 w-full">
                <OP4SectionHeader label="Human Testing 1/4" color="dark" icon={<OP4DotIcon />} />
                <div className="bg-[rgba(29,27,32,0.5)] border-b border-[rgba(255,255,255,0.05)] flex items-center gap-[8px] px-[12px] py-[7px] shrink-0 w-full">
                  <OP4CodesandboxIcon size={16} />
                  <p className="font-['Rounded_Mplus_1c',sans-serif] text-[11px] tracking-[0.275px] uppercase text-[#777]">add comments</p>
                </div>
                <div className="bg-[#252323] flex flex-col w-full shrink-0">
                  <OP4CheckRow done={true} text="Send button disabled with no photo selected" />
                  <OP4CheckRow done={false} text="Photo picker opens on iOS and Android" />
                </div>
                <div className="bg-[rgba(29,27,32,0.5)] border-b border-[rgba(255,255,255,0.05)] border-t flex items-center gap-[8px] px-[12px] py-[7px] shrink-0 w-full">
                  <OP4CodesandboxIcon size={16} />
                  <p className="font-['Rounded_Mplus_1c',sans-serif] text-[11px] tracking-[0.275px] uppercase text-[#777]">add comments</p>
                </div>
                <div className="bg-[#252323] flex flex-col w-full shrink-0">
                  <OP4CheckRow done={true} text="Send button disabled with no photo selected" />
                </div>
                <div className="bg-[rgba(29,27,32,0.5)] border-b border-[rgba(255,255,255,0.05)] border-t flex items-center gap-[8px] px-[12px] py-[7px] shrink-0 w-full">
                  <OP4CodesandboxIcon size={16} />
                  <p className="font-['Rounded_Mplus_1c',sans-serif] text-[11px] tracking-[0.275px] uppercase text-[#777]">add comments</p>
                </div>
                <div className="bg-[#252323] flex flex-col flex-1 w-full">
                  <OP4CheckRow done={false} text="Attempt to add comment and react to it" />
                  <OP4AddItemRow />
                </div>
              </div>

              {/* Explorer — 333px tall, but may shrink on short screens so the music widget below stays in view */}
              <div className="border border-[rgba(255,255,255,0.05)] flex flex-col basis-[333px] grow-0 shrink min-h-[140px] overflow-clip rounded-[6px] shadow-[0px_4px_6px_-1px_rgba(0,0,0,0.1)] w-full">
                <OP4SectionHeader label="Explorer" color="dark" icon={<OP4DotIcon />} />
                <div className="bg-[#252323] flex flex-1 flex-col overflow-clip p-[4px]">
                  <div className="flex gap-[6px] items-center px-[8px] py-[3px] rounded-[6px] w-full"><OP4ChevronDown /><OP4FolderIcon /><p className="font-['Rounded_Mplus_1c',sans-serif] text-[#c5c5c5] text-[11px] truncate">pet-show-and-tell-i2Workspace</p></div>
                  <div className="flex gap-[6px] items-center pl-[22px] pr-[8px] py-[3px] rounded-[6px] w-full"><OP4ChevronDown /><OP4FolderIcon /><p className="font-['Rounded_Mplus_1c',sans-serif] text-[#c5c5c5] text-[11px]">main</p></div>
                  <div className="flex gap-[6px] items-center pl-[32px] pr-[8px] py-[3px] rounded-[6px] w-full"><OP4ChevronDown /><OP4FolderIcon /><p className="font-['Rounded_Mplus_1c',sans-serif] text-[#c5c5c5] text-[11px]">src</p></div>
                  <div className="flex gap-[6px] items-center pl-[40px] pr-[8px] py-[3px] rounded-[6px] w-full"><OP4ChevronDown /><OP4FolderIcon /><p className="font-['Rounded_Mplus_1c',sans-serif] text-[#c5c5c5] text-[11px]">app</p></div>
                  <div className="flex gap-[6px] items-center pl-[48px] pr-[8px] py-[3px] rounded-[6px] w-full"><OP4ChevronRight /><OP4FolderOpenIcon /><p className="font-['Rounded_Mplus_1c',sans-serif] text-[#c5c5c5] text-[11px]">(tabs)</p></div>
                  <div className="flex gap-[6px] items-center pl-[50px] pr-[8px] py-[3px] rounded-[6px] w-full"><div className="size-[12px] shrink-0" /><OP4TsxFileIcon /><p className="font-['Rounded_Mplus_1c',sans-serif] text-[#c5c5c5] text-[11px]">_layout.tsx</p></div>
                  <div className="flex gap-[6px] items-center pl-[36px] pr-[8px] py-[3px] rounded-[6px] w-full"><OP4ChevronRight /><OP4FolderOpenIcon /><p className="font-['Rounded_Mplus_1c',sans-serif] text-[#c5c5c5] text-[11px]">components</p></div>
                  <div className="flex gap-[6px] items-center pl-[36px] pr-[8px] py-[3px] rounded-[6px] w-full"><OP4ChevronRight /><OP4FolderOpenIcon /><p className="font-['Rounded_Mplus_1c',sans-serif] text-[#c5c5c5] text-[11px]">hooks</p></div>
                  <div className="flex gap-[6px] items-center pl-[22px] pr-[8px] py-[3px] rounded-[6px] w-full"><OP4ChevronRight /><OP4FolderOpenIcon /><p className="font-['Rounded_Mplus_1c',sans-serif] text-[#c5c5c5] text-[11px] truncate">feature/add-comments</p></div>
                  <div className="flex gap-[6px] items-center pl-[22px] pr-[8px] py-[3px] rounded-[6px] w-full"><OP4ChevronRight /><OP4FolderOpenIcon /><p className="font-['Rounded_Mplus_1c',sans-serif] text-[#c5c5c5] text-[11px] truncate">chore/fix-reaction-bug</p></div>
                  <div className="flex gap-[6px] items-center pl-[22px] pr-[8px] py-[3px] rounded-[6px] w-full"><OP4ChevronRight /><OP4FolderOpenIcon /><p className="font-['Rounded_Mplus_1c',sans-serif] text-[#c5c5c5] text-[11px]">project</p></div>
                  <div className="flex gap-[6px] items-center pl-[22px] pr-[8px] py-[3px] rounded-[6px] w-full"><OP4ChevronRight /><OP4FolderOpenIcon /><p className="font-['Rounded_Mplus_1c',sans-serif] text-[#c5c5c5] text-[11px]">temp</p></div>
                  <div className="flex gap-[6px] items-center pl-[22px] pr-[8px] py-[3px] rounded-[6px] w-full"><OP4ChevronRight /><OP4FolderOpenIcon /><p className="font-['Rounded_Mplus_1c',sans-serif] text-[#c5c5c5] text-[11px]">generated</p></div>
                </div>
              </div>
            </>
          )}
          </>}
          <div ref={musicSlotRef} data-name="MusicWidgetSlot" className="mt-auto shrink-0 w-full" />
        </div>
      </div>
    </div>
  );
}

// ─── Session Detail (status-driven) ────────────────────────────────────────

const SESSION_FILES = ["app/(tabs)/feed.tsx", "components/CommentSheet.tsx", "components/PhotoPicker.tsx", "lib/reactions.ts"];

// ── OS1 SVG icon helpers ───────────────────────────────────────────────────
function OS1InfieAvatar({ maskId }: { maskId: string }) {
  return (
    <div className="relative shrink-0 size-[22px]">
      <svg className="absolute block inset-0 size-full" fill="none" height="22" preserveAspectRatio="none" viewBox="0 0 22 22" width="22">
        <g>
          <mask fill="white" id={maskId}>
            <path d={svgPathsOS1.p3d935080} />
          </mask>
          <path d={svgPathsOS1.p3d935080} fill="#2DD4BF" fillOpacity="0.094" />
          <path d={svgPathsOS1.pd00cf00} fill="#2DD4BF" fillOpacity="0.25" mask={`url(#${maskId})`} />
          <path d={svgPathsOS1.p141f87c0} stroke="#2DD4BF" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.875" />
        </g>
      </svg>
    </div>
  );
}

function OS1DarkDotIcon() {
  return (
    <div className="relative shrink-0 size-[12px]">
      <svg className="absolute block inset-0 size-full" fill="none" height="12" preserveAspectRatio="none" viewBox="0 0 12 12" width="12">
        <g>
          <path d={svgPathsOP4.p233bb300} stroke="#2A2A2A" strokeLinecap="round" strokeLinejoin="round" />
          <path d={svgPathsOP4.p358d1c00} stroke="#2A2A2A" strokeLinecap="round" strokeLinejoin="round" />
          <path d={svgPathsOP4.p31563d00} stroke="#2A2A2A" strokeLinecap="round" strokeLinejoin="round" />
          <path d={svgPathsOP4.p37817400} stroke="#2A2A2A" strokeLinecap="round" strokeLinejoin="round" />
          <path d={svgPathsOP4.p14c67980} stroke="#2A2A2A" strokeLinecap="round" strokeLinejoin="round" />
          <path d={svgPathsOP4.p1acad500} stroke="#2A2A2A" strokeLinecap="round" strokeLinejoin="round" />
        </g>
      </svg>
    </div>
  );
}

function OS1GreenFileIcon() {
  return (
    <div className="relative shrink-0 size-[12px]">
      <svg className="absolute block inset-0 size-full" fill="none" height="12" preserveAspectRatio="none" viewBox="0 0 12 12" width="12">
        <g>
          <path d={svgPathsOP4.p17c66200} stroke="#ABEFA3" strokeLinecap="round" strokeLinejoin="round" strokeOpacity="0.5" />
          <path d={svgPathsOP4.p31eedf00} stroke="#ABEFA3" strokeLinecap="round" strokeLinejoin="round" strokeOpacity="0.5" />
          <path d="M5 4.5H4" stroke="#ABEFA3" strokeLinecap="round" strokeLinejoin="round" strokeOpacity="0.5" />
          <path d="M8 6.5H4" stroke="#ABEFA3" strokeLinecap="round" strokeLinejoin="round" strokeOpacity="0.5" />
          <path d="M8 8.5H4" stroke="#ABEFA3" strokeLinecap="round" strokeLinejoin="round" strokeOpacity="0.5" />
        </g>
      </svg>
    </div>
  );
}

function OS1BranchIcon() {
  return (
    <div className="relative shrink-0 size-[12px]">
      <svg className="absolute block inset-0 size-full" fill="none" height="12" preserveAspectRatio="none" viewBox="0 0 12 12" width="12">
        <g>
          <path d="M3 1.5V7.5" stroke="#ABEFA3" strokeLinecap="round" strokeLinejoin="round" />
          <path d={svgPathsOS1.pa2af900} stroke="#ABEFA3" strokeLinecap="round" strokeLinejoin="round" />
          <path d={svgPathsOS1.p3fc39080} stroke="#ABEFA3" strokeLinecap="round" strokeLinejoin="round" />
          <path d={svgPathsOS1.p3ffef000} stroke="#ABEFA3" strokeLinecap="round" strokeLinejoin="round" />
        </g>
      </svg>
    </div>
  );
}

function OS1ChevronDown() {
  return (
    <div className="relative shrink-0 size-[11px]">
      <svg className="absolute block inset-0 size-full" fill="none" height="11" preserveAspectRatio="none" viewBox="0 0 11 11" width="11">
        <g>
          <path d={svgPathsOS1.p26a1c040} stroke="#555555" strokeLinecap="round" strokeLinejoin="round" strokeWidth="0.916667" />
        </g>
      </svg>
    </div>
  );
}

function OS1MergeIcon() {
  return (
    <div className="relative shrink-0 size-[11px]">
      <svg className="absolute block inset-0 size-full" fill="none" height="11" preserveAspectRatio="none" viewBox="0 0 11 11" width="11">
        <g>
          <path d={svgPathsOS1.p2c06ee00} stroke="#ABEFA3" strokeLinecap="round" strokeLinejoin="round" strokeWidth="0.916667" />
          <path d="M1.375 5.5H4.125" stroke="#ABEFA3" strokeLinecap="round" strokeLinejoin="round" strokeWidth="0.916667" />
          <path d="M6.875 5.5H9.625" stroke="#ABEFA3" strokeLinecap="round" strokeLinejoin="round" strokeWidth="0.916667" />
        </g>
      </svg>
    </div>
  );
}

function OS1PRIcon() {
  return (
    <div className="relative shrink-0 size-[11px]">
      <svg className="absolute block inset-0 size-full" fill="none" height="11" preserveAspectRatio="none" viewBox="0 0 11 11" width="11">
        <g clipPath="url(#os1-pr-clip)">
          <path d={svgPathsOS1.p219a7e00} stroke="#51A2FF" strokeLinecap="round" strokeLinejoin="round" strokeWidth="0.916667" />
          <path d={svgPathsOS1.pdb3b900} stroke="#51A2FF" strokeLinecap="round" strokeLinejoin="round" strokeWidth="0.916667" />
          <path d={svgPathsOS1.paa8d100} stroke="#51A2FF" strokeLinecap="round" strokeLinejoin="round" strokeWidth="0.916667" />
        </g>
        <defs>
          <clipPath id="os1-pr-clip">
            <rect fill="white" height="11" width="11" />
          </clipPath>
        </defs>
      </svg>
    </div>
  );
}

function OS1TsxDiffIcon() {
  return (
    <div className="relative shrink-0 size-[11px]">
      <svg className="absolute block inset-0 size-full" fill="none" height="11" preserveAspectRatio="none" viewBox="0 0 11 11" width="11">
        <g>
          <path d={svgPathsOP4.p37ffedc0} stroke="#7B9AB5" strokeLinecap="round" strokeLinejoin="round" strokeWidth="0.916667" />
          <path d={svgPathsOP4.p15fbe800} stroke="#7B9AB5" strokeLinecap="round" strokeLinejoin="round" strokeWidth="0.916667" />
          <path d="M4.58333 4.125H3.66667" stroke="#7B9AB5" strokeLinecap="round" strokeLinejoin="round" strokeWidth="0.916667" />
          <path d="M7.33333 5.95833H3.66667" stroke="#7B9AB5" strokeLinecap="round" strokeLinejoin="round" strokeWidth="0.916667" />
          <path d="M7.33333 7.79167H3.66667" stroke="#7B9AB5" strokeLinecap="round" strokeLinejoin="round" strokeWidth="0.916667" />
        </g>
      </svg>
    </div>
  );
}

function OS1PencilIcon() {
  return (
    <div className="relative shrink-0 size-[11px]">
      <svg className="absolute block inset-0 size-full" fill="none" height="11" preserveAspectRatio="none" viewBox="0 0 11 11" width="11">
        <g clipPath="url(#os1-pencil-clip)">
          <path d={svgPathsOS1.p9133200} stroke="#444444" strokeLinecap="round" strokeLinejoin="round" strokeWidth="0.916667" />
          <path d="M6.875 2.29167L8.70833 4.125" stroke="#444444" strokeLinecap="round" strokeLinejoin="round" strokeWidth="0.916667" />
        </g>
        <defs>
          <clipPath id="os1-pencil-clip">
            <rect fill="white" height="11" width="11" />
          </clipPath>
        </defs>
      </svg>
    </div>
  );
}

function OS1CheckDoneIcon() {
  return (
    <div className="relative shrink-0 size-[13px]">
      <svg className="absolute block inset-0 size-full" fill="none" height="13" preserveAspectRatio="none" viewBox="0 0 13 13" width="13">
        <g clipPath="url(#os1-chk-clip)">
          <path d={svgPathsOS1.p1d11280} stroke="#ABEFA3" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.08333" />
          <path d={svgPathsOS1.p3c156f40} stroke="#ABEFA3" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.08333" />
        </g>
        <defs>
          <clipPath id="os1-chk-clip">
            <rect fill="white" height="13" width="13" />
          </clipPath>
        </defs>
      </svg>
    </div>
  );
}

function OS1CheckPendingIcon() {
  return (
    <div className="relative shrink-0 size-[13px]">
      <svg className="absolute block inset-0 size-full" fill="none" height="13" preserveAspectRatio="none" viewBox="0 0 13 13" width="13">
        <g clipPath="url(#os1-pnd-clip)">
          <path d={svgPathsOS1.p1d11280} stroke="#555555" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.08333" />
        </g>
        <defs>
          <clipPath id="os1-pnd-clip">
            <rect fill="white" height="13" width="13" />
          </clipPath>
        </defs>
      </svg>
    </div>
  );
}

function OS1FolderOpenIcon() {
  return (
    <div className="relative shrink-0 size-[13px]">
      <svg className="absolute block inset-0 size-full" fill="none" height="13" preserveAspectRatio="none" viewBox="0 0 13 13" width="13">
        <g>
          <path d={svgPathsOP4.p7c0da00} stroke="#ABEFA3" strokeLinecap="round" strokeLinejoin="round" strokeOpacity="0.7" strokeWidth="1.08333" />
        </g>
      </svg>
    </div>
  );
}

function OS1FolderClosedIcon() {
  return (
    <div className="relative shrink-0 size-[13px]">
      <svg className="absolute block inset-0 size-full" fill="none" height="13" preserveAspectRatio="none" viewBox="0 0 13 13" width="13">
        <g>
          <path d={svgPathsOP4.p18519200} stroke="#ABEFA3" strokeLinecap="round" strokeLinejoin="round" strokeOpacity="0.7" strokeWidth="1.08333" />
        </g>
      </svg>
    </div>
  );
}

function OS1TsxLargeIcon() {
  return (
    <div className="relative shrink-0 size-[13px]">
      <svg className="absolute block inset-0 size-full" fill="none" height="13" preserveAspectRatio="none" viewBox="0 0 13 13" width="13">
        <g>
          <path d={svgPathsOP4.p2a6a1c00} stroke="#7B9AB5" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.08333" />
          <path d={svgPathsOP4.p238db870} stroke="#7B9AB5" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.08333" />
          <path d="M5.41667 4.875H4.33333" stroke="#7B9AB5" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.08333" />
          <path d="M8.66667 7.04167H4.33333" stroke="#7B9AB5" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.08333" />
          <path d="M8.66667 9.20833H4.33333" stroke="#7B9AB5" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.08333" />
        </g>
      </svg>
    </div>
  );
}

// Panel wrapper faithful to the OS1 design
function OSPanel({
  greenHeader,
  title,
  children,
  glow = false,
  testId,
  dataGlowAttr,
}: {
  greenHeader?: boolean;
  title: string;
  children: React.ReactNode;
  glow?: boolean;
  testId?: string;
  dataGlowAttr?: boolean;
}) {
  const hdrBg = greenHeader ? "bg-[rgba(171,239,163,0.08)]" : "bg-[#1d1b20]";
  const titleColor = greenHeader ? "text-[#abefa3]" : "text-[#777]";
  return (
    <div
      data-testid={testId}
      data-task-widget-glow={dataGlowAttr !== undefined ? (dataGlowAttr ? "true" : "false") : undefined}
      className={`rounded-[6px] overflow-clip shrink-0 w-full transition-all ${
        glow
          ? "border border-[#2dd4bf] shadow-[0_0_20px_rgba(45,212,191,0.45)] animate-pulse motion-reduce:animate-none"
          : "border border-[rgba(255,255,255,0.05)] shadow-[0px_4px_6px_-1px_rgba(0,0,0,0.1)]"
      }`}
    >
      <div className={`${hdrBg} border-b border-[rgba(255,255,255,0.05)] flex items-center gap-2 px-3 py-[7px] shrink-0 w-full`}>
        <OS1DarkDotIcon />
        <span className={`font-['Rounded_Mplus_1c',sans-serif] text-[11px] tracking-[0.275px] uppercase ${titleColor}`}>{title}</span>
      </div>
      <div className="bg-[#252323]">
        {children}
      </div>
    </div>
  );
}

// Diff row for the diffs panel
function OS1DiffRow({ status: s, name, add, del: d }: { status: "M" | "A"; name: string; add?: string; del?: string }) {
  const statusColor = s === "M" ? "#ff8904" : "#abefa3";
  return (
    <div className="border-b border-[rgba(255,255,255,0.04)] flex gap-2 items-center px-3 py-[6px] w-full">
      <span className="w-3 shrink-0 font-['Consolas',monospace] text-[9px]" style={{ color: statusColor }}>{s}</span>
      <OS1TsxDiffIcon />
      <span className="flex-1 min-w-0 font-['Rounded_Mplus_1c',sans-serif] text-[11px] text-[#c5c5c5] truncate">{name}</span>
      {add && <span className="font-['Consolas',monospace] text-[9px] text-[#abefa3] shrink-0">{add}</span>}
      {d && <span className="font-['Consolas',monospace] text-[9px] text-[#ff6467] shrink-0">{d}</span>}
    </div>
  );
}

function SessionScreen({
  session,
  project,
  onHome,
  onOpenProject,
  onPlayground,
  levelText = "Lvl. 1",
  showTutorialsEntry = true,
  showTaskGroups = true,
  completionPending = false,
  onHumanTaskVerified,
  onWidgets,
  onNotifications,
  onOpenWidget,
  switchableProjects,
  onSwitchProject,
  allSessions,
  onSelectSession,
  highlightHomeNav = false,
  disabled,
  musicSlotRef,
}: {
  session: ProtoSession; project: ProtoProject;
  onHome: () => void; onOpenProject: () => void; onPlayground: () => void;
  levelText?: string;
  showTutorialsEntry?: boolean;
  showTaskGroups?: boolean;
  completionPending?: boolean;
  onHumanTaskVerified?: () => void;
  onWidgets?: () => void;
  onNotifications?: () => void;
  onOpenWidget?: (id: WidgetId, label: string) => void;
  switchableProjects?: ProtoProject[];
  onSwitchProject?: (p: ProtoProject) => void;
  allSessions?: ProtoSession[];
  onSelectSession?: (s: ProtoSession) => void;
  highlightHomeNav?: boolean;
  disabled?: boolean;
  /** Bottom-of-right-column slot where the bordered music widget renders. */
  musicSlotRef?: (el: HTMLDivElement | null) => void;
}) {
  const isExperimemo = project.id === EXPERIMEMO_PROJECT_ID;
  const tutorial = useTutorial();
  const xs: SessionFlowState | null = isExperimemo ? tutorial.session : null;
  const activeAgentTab = tutorial.activeSessionTab;
  const agentTabOrder = SESSION_TAB_ORDER;
  const agentTabRefs = useRef<Partial<Record<SessionTabId, HTMLButtonElement | null>>>({});

  const {
    isTutorialActive,
    currentBeat,
    turnIndex,
    dockedChat,
    isRevealed,
    setDemoSessionCompleted,
    demoSessionCompleted,
    setTurnIndex,
  } = useOnboarding();
  const showDockedContinue = Boolean(isTutorialActive && dockedChat.showContinue && dockedChat.onContinue);
  // B17: the form stays up through the seven explanation turns; Submit retires it.
  const showCompletionForm =
    !isExperimemo &&
    isTutorialActive &&
    currentBeat === "B17" &&
    turnIndex < B17_EXPLANATIONS.length &&
    isRevealed("session_completion_form");
  // Keep the newest tutorial line in view (scroll only the message list, never ancestors).
  const sessionChatListRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = sessionChatListRef.current;
    if ((isTutorialActive || isExperimemo) && el) {
      el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    }
  }, [isTutorialActive, isExperimemo, dockedChat.history, showCompletionForm, activeAgentTab, xs]);
  const [status, setStatus] = useState<SessionStatus>(session.initial);
  const [messages, setMessages] = useState<Message[]>([
    { id: "s0", role: "assistant", content: "Session initialised. Scanning `expo-photo-share/project/Todo.md`… found 3 open tasks, 2 completed." },
    { id: "s1", role: "assistant", content: "Worktree `feature/photo-share` is active. Claude is working on `PhotoPicker.tsx` and `usePhotoShare.ts`. No conflicts between worktrees detected." },
    { id: "s2", role: "assistant", content: "Emulator connected on port 8081. Doctor passed all checks. Handing control to session agent." },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [tests, setTests] = useState<CheckItem[]>(
    isExperimemo
      ? []
      : (SESSION_HUMAN_TESTS[session.id] ?? SESSION_HUMAN_TESTS["add-comments"]).map((t, i) => ({ id: `${session.id}-t${i}`, text: t, done: i === 0 }))
  );
  const [commitOpen, setCommitOpen] = useState(true);
  const [branchOpen, setBranchOpen] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!isExperimemo) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isExperimemo]);

  const pushInfie = (content: string) => setMessages(ms => [...ms, { id: uid(), role: "assistant", content }]);

  const advance = (next: SessionStatus) => {
    setStatus(next);
    pushInfie(infieMessageFor(session.id, next));
  };

  const flow = SESSION_FLOW[status];

  const handleSend = () => {
    if (isExperimemo) return;
    const text = input.trim();
    if (!text) return;
    setMessages(ms => [...ms, { id: uid(), role: "user", content: text }]);
    setInput("");
    setTimeout(() => pushInfie("Got it — I've folded that into the current session context."), 500);
  };

  const handleWhatsNext = () => {
    if (loading) return;
    const next = flow.next;
    if (!next) { pushInfie("Session complete — great work!"); return; }
    setLoading(true);
    pushInfie(`Working on it… (${flow.label})`);
    setTimeout(() => { setLoading(false); advance(next); }, 900);
  };

  const handleTestChanges = () => {
    pushInfie("Opening the test runner — run the suite and report results back here.");
  };

  const handleAction = () => {
    pushInfie("What action would you like me to take? You can describe a specific task or pick from the session plan.");
  };

  const getExperimemoMessagesForTab = (tabId: SessionTabId): FlowMessage[] => {
    if (!xs) return [];
    return tabId === "infie" ? xs.infie : xs.tabs[tabId];
  };

  const handleAgentTabKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>, currentIdx: number) => {
    let nextIdx: number | null = null;
    if (e.key === "ArrowRight") nextIdx = (currentIdx + 1) % agentTabOrder.length;
    else if (e.key === "ArrowLeft") nextIdx = (currentIdx - 1 + agentTabOrder.length) % agentTabOrder.length;
    else if (e.key === "Home") nextIdx = 0;
    else if (e.key === "End") nextIdx = agentTabOrder.length - 1;
    if (nextIdx !== null) {
      e.preventDefault();
      const targetTab = agentTabOrder[nextIdx];
      tutorial.setActiveSessionTab(targetTab);
      agentTabRefs.current[targetTab]?.focus();
    }
  };

  // Current Diffs data. Experimemo rows come only from reported work (no counts are invented).
  type DiffRowData = { status: "M" | "A"; name: string; add?: string; del?: string };
  const petDiffs: DiffRowData[] = [
    { status: "M", name: "camera.tsx", add: "+84", del: "-12" },
    { status: "A", name: "PhotoPicker.tsx", add: "+142" },
    { status: "M", name: "FriendList.tsx", add: "+67", del: "-5" },
    { status: "A", name: "usePhotoShare.ts", add: "+38" },
    { status: "M", name: "package.json", add: "+3", del: "-1" },
  ];
  const experimemoDiffs: DiffRowData[] = (xs?.diffs ?? []).map(d => ({ status: d.status, name: d.name }));
  const commitDiffs: DiffRowData[] = isExperimemo ? experimemoDiffs : petDiffs;
  const branchDiffs: DiffRowData[] = isExperimemo
    ? experimemoDiffs
    : [
        ...petDiffs,
        { status: "M", name: "app.json", add: "+2" },
        { status: "M", name: "Guidelines.md", add: "+18", del: "-4" },
      ];

  const fileCount = (n: number) => `${n} file${n === 1 ? "" : "s"}`;
  const commitDiffSummary: { files: string; add?: string; del?: string } = isExperimemo
    ? { files: fileCount(experimemoDiffs.length) }
    : { files: "5 files", add: "+334", del: "-18" };
  const branchDiffSummary: { files: string; add?: string; del?: string } = isExperimemo
    ? { files: fileCount(experimemoDiffs.length) }
    : { files: "7 files", add: "+354", del: "-22" };

  const agentTasks: Array<{ id: string; done: boolean; glowing: boolean; statusLabel: string; label: string; provider?: ProviderId }> = isExperimemo
    ? (xs?.tasks ?? []).map(t => ({
        id: t.id,
        done: t.status === "completed",
        glowing: t.glowing,
        statusLabel: TASK_STATUS_LABEL[t.status],
        label: t.label,
        provider: t.provider,
      }))
    : [
        { id: "photo-t1", done: true, glowing: false, statusLabel: "completed", label: "Implement PhotoPicker component" },
        { id: "photo-t2", done: true, glowing: false, statusLabel: "completed", label: "Wire up usePhotoShare hook" },
        { id: "photo-t3", done: isTutorialActive ? true : false, glowing: false, statusLabel: isTutorialActive ? "completed" : "pending", label: "Add friend list query to Supabase" },
        { id: "photo-t4", done: isTutorialActive ? true : false, glowing: false, statusLabel: isTutorialActive ? "completed" : "pending", label: "Handle photo library permissions" },
        { id: "photo-t5", done: isTutorialActive ? true : false, glowing: false, statusLabel: isTutorialActive ? "completed" : "pending", label: "Compress images before upload" },
      ];
  const anyTaskGlowing = Boolean(isExperimemo && agentTasks.some(t => t.glowing));
  const needsHumanVerificationGlow = Boolean(
    isExperimemo &&
      xs &&
      ((xs.status === "NEEDS YOU" && areAllAgentTasksDone(xs)) ||
        (xs.status === "PR OPEN" && xs.wrapUpPhase === "sanity-check"))
  );

  const humanRows: CheckItem[] = isExperimemo ? (xs?.humanTests ?? []) : tests;

  const explorerTree = isExperimemo
    ? [
        { depth: 0, open: true, isFolder: true, name: "experimemo-i2Workspace" },
        { depth: 1, open: false, isFolder: true, name: "main" },
        { depth: 1, open: false, isFolder: true, name: session.branch },
        { depth: 1, open: false, isFolder: true, name: "project" },
        { depth: 1, open: false, isFolder: true, name: "generated" },
        { depth: 1, open: false, isFolder: true, name: "test-apps" },
      ]
    : [
        { depth: 0, open: true, isFolder: true, name: "pet-show-and-tell-i2Workspace" },
        { depth: 1, open: true, isFolder: true, name: "main" },
        { depth: 2, open: true, isFolder: true, name: "src" },
        { depth: 3, open: true, isFolder: true, name: "app" },
        { depth: 4, open: false, isFolder: true, name: "(tabs)" },
        { depth: 4, open: false, isFolder: false, name: "_layout.tsx" },
        { depth: 3, open: false, isFolder: true, name: "components" },
        { depth: 3, open: false, isFolder: true, name: "hooks" },
        { depth: 1, open: false, isFolder: true, name: "feature/add-comments" },
        { depth: 1, open: false, isFolder: true, name: "chore/fix-reaction-bug" },
        { depth: 1, open: false, isFolder: true, name: "project" },
        { depth: 1, open: false, isFolder: true, name: "temp" },
        { depth: 1, open: false, isFolder: true, name: "generated" },
      ];

  const experimemoTabMeta: Record<SessionTabId, { label: string; accessibleLabel: string; accent: string }> = {
    infie: { label: SESSION_TAB_LABEL.infie, accessibleLabel: SESSION_TAB_ACCESSIBLE_LABEL.infie, accent: "#2dd4bf" },
    openai: { label: SESSION_TAB_LABEL.openai, accessibleLabel: SESSION_TAB_ACCESSIBLE_LABEL.openai, accent: PROVIDER_ACCENT.openai },
    claude: { label: SESSION_TAB_LABEL.claude, accessibleLabel: SESSION_TAB_ACCESSIBLE_LABEL.claude, accent: PROVIDER_ACCENT.claude },
    gemini: { label: SESSION_TAB_LABEL.gemini, accessibleLabel: SESSION_TAB_ACCESSIBLE_LABEL.gemini, accent: PROVIDER_ACCENT.gemini },
  };

  const activeExperimemoMessages: FlowMessage[] = isExperimemo ? getExperimemoMessagesForTab(activeAgentTab) : [];
  const sessionActions = isExperimemo && xs ? getSessionActions(xs) : [];
  const primaryAction = xs ? getPrimaryAction(xs) : null;

  // The Experimemo session only exists after Start Session; never render a ghost.
  if (isExperimemo && !xs) return null;

  const explorerPanel = (
          <div className="border border-[rgba(255,255,255,0.05)] rounded-[6px] overflow-clip shrink-0 w-full shadow-[0px_4px_6px_-1px_rgba(0,0,0,0.1)]">
            <div className="bg-[#1d1b20] border-b border-[rgba(255,255,255,0.05)] flex items-center gap-2 px-3 py-[7px]">
              <OS1DarkDotIcon />
              <span className="font-['Rounded_Mplus_1c',sans-serif] text-[11px] tracking-[0.275px] uppercase text-[#777]">Explorer</span>
            </div>
            <div className="bg-[#252323] p-1">
              {explorerTree.map((node, i) => {
                const paddingLeft = 8 + node.depth * 14;
                const isTsx = !node.isFolder && (node.name.endsWith(".tsx") || node.name.endsWith(".ts"));
                return (
                  <div key={i} className="flex gap-[6px] items-center py-[3px] rounded-[6px] w-full" style={{ paddingLeft, paddingRight: 8 }}>
                    {node.isFolder ? (
                      <>
                        <div className="shrink-0 size-[12px] flex items-center justify-center">
                          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                            <path d={node.open ? "M3 4.5L6 7.5L9 4.5" : "M4.5 9L7.5 6L4.5 3"} stroke="#666" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </div>
                        {node.open ? <OS1FolderOpenIcon /> : <OS1FolderClosedIcon />}
                      </>
                    ) : (
                      <>
                        <div className="w-3 shrink-0" />
                        {isTsx ? <OS1TsxLargeIcon /> : <OS1GreenFileIcon />}
                      </>
                    )}
                    <span className="font-['Rounded_Mplus_1c',sans-serif] text-[11px] text-[#c5c5c5] truncate">{node.name}</span>
                  </div>
                );
              })}
            </div>
          </div>
  );

  return (
    <div
      data-testid="session-screen"
      data-active-tab={isExperimemo ? activeAgentTab : undefined}
      data-session-status={xs?.status}
      className="size-full flex flex-col relative overflow-hidden"
      style={{ background: "#0a0814" }}
    >
      <AnimatedGlows />
      <Header
        activeLevel="session"
        level={levelText}
        showTutorialsEntry={showTutorialsEntry}
        projectLabel={project.name}
        currentProjectId={project.id}
        projectIcon={<ProjectGlyph size={14} color="rgba(255,255,255,0.7)" />}
        sessionLabel={session.name}
        sessionIcon={<SessionGlyph size={14} color="#061413" />}
        onHome={onHome}
        onWidgets={onWidgets}
        onNotifications={onNotifications}
        onOpenProject={onOpenProject}
        switchableProjects={switchableProjects}
        onSwitchProject={onSwitchProject}
        allSessions={allSessions}
        onSelectSession={onSelectSession}
        highlightHomeNav={highlightHomeNav}
        disabled={disabled}
        tab={isExperimemo ? "Workspace" : undefined}
        onTabChange={
          isExperimemo
            ? (t) => {
                if (t === "Emulators") onOpenWidget?.("emuWeb", "Web Preview");
              }
            : undefined
        }
        rightSlot={
          <div className="flex items-center gap-2.5">
            {isExperimemo ? (
              <>
                <div data-testid="session-status-badge">
                  <StatusChip status={xs?.status ?? "CODING"} />
                </div>
                <button
                  type="button"
                  data-testid="session-web-preview-button"
                  data-web-preview-glow={needsHumanVerificationGlow ? "true" : "false"}
                  onClick={() => onOpenWidget?.("emuWeb", "Web Preview")}
                  className={`bg-[#2dd4bf] text-[#061413] flex gap-[6px] h-[28px] items-center px-[10px] rounded-[5px] font-bold text-[11px] hover:brightness-110 cursor-pointer shadow-sm transition-all whitespace-nowrap ${
                    needsHumanVerificationGlow
                      ? "ring-2 ring-[#2dd4bf]/80 shadow-[0_0_16px_rgba(45,212,191,0.55)]"
                      : ""
                  }`}
                >
                  <Globe size={12} />
                  <span>Web Preview</span>
                </button>
              </>
            ) : isTutorialActive && demoSessionCompleted ? (
              <StatusChip status="COMPLETE" />
            ) : completionPending ? (
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  padding: "4px 10px",
                  borderRadius: 6,
                  background: "rgba(167,139,250,0.14)",
                  border: "1px solid rgba(167,139,250,0.45)",
                  color: "#a78bfa",
                  fontFamily: "'Rounded Mplus 1c',sans-serif",
                  fontSize: 10,
                  fontWeight: 600,
                  letterSpacing: "0.05em",
                  textTransform: "uppercase",
                  whiteSpace: "nowrap",
                }}
              >
                COMPLETION PENDING
              </span>
            ) : (
              <StatusChip status={status} />
            )}
            <button onClick={onPlayground} className="hidden sm:inline-flex text-white/30 hover:text-white/70 transition-colors text-[12px] font-['Space_Grotesk',sans-serif] px-3 py-1.5 rounded-lg border border-white/8">Playground</button>
          </div>
        }
      />

      <div className="flex-1 flex gap-[10px] p-2 sm:p-[10px] overflow-hidden min-h-0 relative z-10">

        {/* ── LEFT — 236px (collapsed during PR review split) ── */}
        {showTaskGroups && !(isExperimemo && xs?.reviewOpen) && <div className="hidden md:flex w-[236px] shrink-0 flex-col gap-[8px] overflow-y-auto">

          {/* Project Folder */}
          <OSPanel greenHeader title="Project Folder">
            {(isExperimemo ? ["Info.md", "Todo.md", "Style.md", "Guidelines.md"] : ["Info.md", "Todo.md", "Guidelines.md"]).map(f => (
              <div key={f} className="flex gap-2 items-center px-3 py-[6px] w-full">
                <OS1GreenFileIcon />
                <span className="font-['Rounded_Mplus_1c',sans-serif] text-[11px] text-[#c5c5c5]">{f}</span>
              </div>
            ))}
          </OSPanel>

          {/* Current Diffs */}
          <div className="border border-[rgba(255,255,255,0.05)] rounded-[6px] overflow-clip shrink-0 w-full shadow-[0px_4px_6px_-1px_rgba(0,0,0,0.1)]">
            <div className="bg-[#1d1b20] border-b border-[rgba(255,255,255,0.05)] flex items-center gap-2 px-3 py-[7px]">
              <OS1DarkDotIcon />
              <span className="font-['Rounded_Mplus_1c',sans-serif] text-[11px] tracking-[0.275px] uppercase text-[#777]">Current Diffs</span>
            </div>
            <div className="bg-[#1a1a1a] flex flex-col">
              {/* Branch row */}
              <div className="border-b border-[rgba(255,255,255,0.05)] flex gap-2 items-center px-3 py-2 w-full">
                <OS1BranchIcon />
                <span className="font-['Consolas',monospace] text-[11px] text-[#777] flex-1 truncate">
                  {isExperimemo ? session.branch : "feature/add-comments"}
                </span>
                <span className="font-['Rounded_Mplus_1c',sans-serif] text-[10px] text-[#444]">↑ main</span>
              </div>
              {/* Commit Diffs collapsible */}
              <button onClick={() => setCommitOpen(v => !v)} className="bg-[rgba(37,35,35,0.6)] border-b border-[rgba(255,255,255,0.05)] flex gap-2 items-center px-3 py-2 w-full text-left">
                <OS1ChevronDown />
                <OS1MergeIcon />
                <span className="font-['Rounded_Mplus_1c',sans-serif] text-[11px] uppercase tracking-[0.275px] text-[#888] flex-1">Commit Diffs</span>
                <span className="font-['Consolas',monospace] text-[9px] text-[#555]">
                  {commitDiffSummary.files}{commitDiffSummary.add && <> · <span className="text-[#abefa3]">{commitDiffSummary.add}</span> <span className="text-[#ff6467]">{commitDiffSummary.del}</span></>}
                </span>
              </button>
              {commitOpen && isExperimemo && commitDiffs.length === 0 && (
                <p data-testid="diffs-empty" className="px-3 py-2 font-['Rounded_Mplus_1c',sans-serif] text-[10.5px] text-[#555]">No changes yet</p>
              )}
              {commitOpen && commitDiffs.map((d, i) => (
                <OS1DiffRow key={i} status={d.status} name={d.name} add={d.add} del={d.del} />
              ))}
              {/* Branch/PR collapsible */}
              <button onClick={() => setBranchOpen(v => !v)} className="bg-[rgba(37,35,35,0.6)] border-b border-[rgba(255,255,255,0.05)] flex gap-2 items-center px-3 py-2 w-full text-left">
                <OS1ChevronDown />
                <OS1PRIcon />
                <span className="font-['Rounded_Mplus_1c',sans-serif] text-[11px] uppercase tracking-[0.275px] text-[#888] flex-1">Branch / PR</span>
                <span className="font-['Consolas',monospace] text-[9px] text-[#555]">
                  {branchDiffSummary.files}{branchDiffSummary.add && <> · <span className="text-[#abefa3]">{branchDiffSummary.add}</span> <span className="text-[#ff6467]">{branchDiffSummary.del}</span></>}
                </span>
              </button>
              {branchOpen && branchDiffs.map((d, i) => (
                <OS1DiffRow key={i} status={d.status} name={d.name} add={d.add} del={d.del} />
              ))}
            </div>
          </div>

          {/* Current Goal & Plan */}
          <OSPanel title="Current Goal & Plan">
            <div className="bg-[#252323] px-3 py-[10px] flex flex-col gap-1.5">
              <div className="flex gap-2 items-start">
                <span className="font-['Rounded_Mplus_1c',sans-serif] text-[11px] text-[#c5c5c5] flex-1 leading-[17.875px]">
                  {isExperimemo ? (session.desc ?? session.name) : "Add feature: ability to send photos to friends"}
                </span>
                <div className="pt-[2px] shrink-0"><OS1PencilIcon /></div>
              </div>
              <div className="flex gap-2 items-center px-0 py-[6px]">
                <OS1GreenFileIcon />
                <span className="font-['Rounded_Mplus_1c',sans-serif] text-[11px] text-[#c5c5c5]">Plan.md</span>
              </div>
              {isExperimemo && xs?.planMdNote && (
                <div
                  data-testid="session-plan-md-note"
                  className="mt-1 rounded-[5px] border border-[rgba(45,212,191,0.22)] bg-[rgba(45,212,191,0.06)] px-2.5 py-2 font-mono text-[10px] leading-relaxed text-[#cbd5e1]"
                >
                  <p className="text-[#2dd4bf] uppercase tracking-wider text-[9px] mb-1">
                    plan.md · Camera fix block added
                  </p>
                  <p>{xs.planMdNote}</p>
                </div>
              )}
            </div>
          </OSPanel>

          {/* Agent Tasks */}
          <OSPanel
            title="Agent Tasks"
            testId={isExperimemo ? "agent-tasks-panel" : undefined}
            glow={anyTaskGlowing}
            dataGlowAttr={isExperimemo ? anyTaskGlowing : undefined}
          >
            {agentTasks.map((t) => (
              <div
                key={t.id}
                data-testid={isExperimemo ? `session-task-${t.provider}` : undefined}
                data-task-status={t.statusLabel}
                data-task-glow={isExperimemo ? (t.glowing ? "true" : "false") : undefined}
                className={`border-b border-[rgba(255,255,255,0.05)] flex gap-2 items-start px-3 py-2 w-full transition-all ${
                  t.glowing
                    ? "bg-[rgba(45,212,191,0.14)] border-l-2 border-l-[#2dd4bf] shadow-[inset_0_0_16px_rgba(45,212,191,0.28)]"
                    : ""
                }`}
              >
                {t.done ? <OS1CheckDoneIcon /> : <OS1CheckPendingIcon />}
                <div className="min-w-0 flex-1">
                  <span className={`block font-['Rounded_Mplus_1c',sans-serif] text-[11px] leading-[17.875px] ${t.done ? "line-through text-[#555]" : t.glowing ? "text-white font-semibold" : "text-[#c5c5c5]"}`}>{t.label}</span>
                  {isExperimemo && (
                    <span className={`font-mono text-[9.5px] ${t.done ? "text-emerald-400" : t.statusLabel === "needs fix" ? "text-amber-400" : "text-[#2dd4bf]"}`}>
                      {t.provider ? `${PROVIDER_TOPIC[t.provider]} (${PROVIDER_LABEL[t.provider]}) · ` : ""}{t.statusLabel}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </OSPanel>

          {/* Explorer — bottom-left for Experimemo */}
          {isExperimemo && explorerPanel}
        </div>}

        {/* ── CENTER (splits into Chat + PR Review when reviewOpen is active) ── */}
        <div
          data-testid="session-center-workspace"
          data-review-open={isExperimemo && xs?.reviewOpen ? "true" : "false"}
          className={`flex-1 min-w-0 min-h-0 flex ${isExperimemo && xs?.reviewOpen ? "flex-col md:flex-row gap-[10px]" : "flex-col"}`}
        >
        <div className={`${isExperimemo && xs?.reviewOpen ? "flex-1 md:w-1/2 min-h-[240px]" : "flex-1"} min-w-0 min-h-0 flex flex-col rounded-tl-[6px] rounded-tr-[6px] overflow-hidden border border-[rgba(255,255,255,0.05)]`}>
          {/* Tab bar */}
          {isExperimemo ? (
            <div
              role="tablist"
              aria-label="Session agents"
              className="bg-[#1d1b20] border-b border-[rgba(255,255,255,0.05)] flex h-[40px] items-stretch overflow-x-auto no-scrollbar px-1 shrink-0"
            >
              {agentTabOrder.map((tabId, idx) => {
                const isActive = activeAgentTab === tabId;
                const count = getExperimemoMessagesForTab(tabId).length;
                const meta = experimemoTabMeta[tabId];
                return (
                  <button
                    key={tabId}
                    ref={(el) => {
                      agentTabRefs.current[tabId] = el;
                    }}
                    id={`tab-agent-${tabId}`}
                    type="button"
                    role="tab"
                    data-testid={`tab-agent-${tabId}`}
                    aria-selected={isActive}
                    aria-controls={`panel-agent-${tabId}`}
                    aria-label={meta.accessibleLabel}
                    title={meta.accessibleLabel}
                    tabIndex={isActive ? 0 : -1}
                    onClick={() => tutorial.setActiveSessionTab(tabId)}
                    onKeyDown={(e) => handleAgentTabKeyDown(e, idx)}
                    data-nudge={xs?.nudge === tabId ? "true" : undefined}
                    style={xs?.nudge === tabId ? { boxShadow: `inset 0 -2px 0 ${meta.accent}, 0 0 14px ${meta.accent}66` } : undefined}
                    className={`flex gap-[5px] sm:gap-[7px] h-full items-center justify-center px-1.5 sm:px-3 border-b-2 min-w-0 flex-1 sm:flex-none sm:max-w-[205px] transition-colors cursor-pointer ${xs?.nudge === tabId ? "animate-pulse motion-reduce:animate-none" : ""} ${
                      isActive
                        ? "bg-[rgba(45,212,191,0.04)] border-[#2dd4bf] text-white"
                        : "border-transparent text-[#888] hover:text-[#d4d4d8] hover:bg-white/[0.02]"
                    }`}
                  >
                    {tabId === "infie" ? (
                      <OS1InfieAvatar maskId="os1-av-exp-tab" />
                    ) : (
                      <ProviderIcon provider={tabId} size={14} className="shrink-0" />
                    )}
                    <span
                      className={`font-['Rounded_Mplus_1c',sans-serif] truncate min-w-0 ${
                        tabId === "infie" ? "font-extrabold text-[12px] sm:text-[14px] text-[#2dd4bf]" : "font-semibold text-[11px] sm:text-[12px]"
                      }`}
                    >
                      {meta.label}
                    </span>
                    <span className="hidden sm:inline-flex px-1.5 py-0.5 rounded bg-black/30 text-[10px] font-mono text-[#94a3b8] shrink-0">
                      {count}
                    </span>
                  </button>
                );
              })}
              <div className="flex-1 min-w-0" />
            </div>
          ) : (
            <div className="bg-[#1d1b20] border-b border-[rgba(255,255,255,0.05)] flex h-[37px] items-stretch overflow-hidden px-1 shrink-0">
              {/* Infie Chat Tab */}
              <div className="bg-[rgba(45,212,191,0.02)] border-b border-[rgba(45,212,191,0.09)] flex gap-[10px] items-center px-4 shrink-0">
                <OS1InfieAvatar maskId="os1-av-tab" />
                <span className="font-['Rounded_Mplus_1c',sans-serif] font-extrabold text-[16px] text-[#2dd4bf] leading-none">Infie</span>
                <div className="bg-[rgba(245,158,11,0.08)] border border-[rgba(245,158,11,0.2)] flex items-center justify-center px-[10px] py-1 rounded-[6px] shrink-0">
                  <span className="font-['Inter',sans-serif] font-bold text-[11px] text-[#f59e0b] uppercase leading-none">Waiting on test</span>
                </div>
              </div>
              {/* separator */}
              <div className="h-full py-2 shrink-0"><div className="bg-[rgba(255,255,255,0.06)] h-full w-px" /></div>
              {/* Sending photos feature tab */}
              <div className="flex gap-[6px] h-full items-center border-b-2 border-transparent px-3 shrink-0">
                <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
                  <g clipPath="url(#ct1)">
                    <path d={svgPathsOS1.pf97de80} stroke="#444" strokeLinecap="round" strokeLinejoin="round" strokeWidth="0.916667" />
                    <path d={svgPathsOS1.p61eb400} stroke="#444" strokeLinecap="round" strokeLinejoin="round" strokeWidth="0.916667" />
                    <path d={svgPathsOS1.p1b59f180} stroke="#444" strokeLinecap="round" strokeLinejoin="round" strokeWidth="0.916667" />
                    <path d={svgPathsOS1.p25c6d890} stroke="#444" strokeLinecap="round" strokeLinejoin="round" strokeWidth="0.916667" />
                  </g>
                  <defs><clipPath id="ct1"><rect width="11" height="11" fill="white" /></clipPath></defs>
                </svg>
                <span className="font-['Rounded_Mplus_1c',sans-serif] text-[11px] text-[#444] whitespace-nowrap">Sending photos feature</span>
              </div>
              {/* Fix dark mode on iOS tab */}
              <div className="flex gap-[6px] h-full items-center border-b-2 border-transparent px-3 shrink-0">
                <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
                  <g clipPath="url(#ct2)">
                    <path d={svgPathsOS1.pf97de80} stroke="#333" strokeLinecap="round" strokeLinejoin="round" strokeWidth="0.916667" />
                    <path d={svgPathsOS1.p61eb400} stroke="#333" strokeLinecap="round" strokeLinejoin="round" strokeWidth="0.916667" />
                    <path d={svgPathsOS1.p1b59f180} stroke="#333" strokeLinecap="round" strokeLinejoin="round" strokeWidth="0.916667" />
                    <path d={svgPathsOS1.p25c6d890} stroke="#333" strokeLinecap="round" strokeLinejoin="round" strokeWidth="0.916667" />
                  </g>
                  <defs><clipPath id="ct2"><rect width="11" height="11" fill="white" /></clipPath></defs>
                </svg>
                <span className="font-['Rounded_Mplus_1c',sans-serif] text-[11px] text-[#333] whitespace-nowrap">Fix dark mode on iOS</span>
              </div>
              {/* expand icon right */}
              <div className="flex-1 flex items-center justify-end px-2">
                <div className="flex flex-col items-start justify-center p-[6px] rounded-[4px]">
                  <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                    <path d="M8.125 1.625H11.375V4.875" stroke="#555" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.08333" />
                    <path d="M4.875 11.375H1.625V8.125" stroke="#555" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.08333" />
                    <path d={svgPathsOS1.p117dabc0} stroke="#555" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.08333" />
                    <path d={svgPathsOS1.p11087f00} stroke="#555" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.08333" />
                  </svg>
                </div>
              </div>
            </div>
          )}

          {/* Compact branch & task strip on narrow mobile screens */}
          {isExperimemo && (
            <div className="flex md:hidden items-center justify-between gap-2 px-3 py-1.5 bg-[#15141a] border-b border-[rgba(255,255,255,0.05)] text-[10px] font-['Rounded_Mplus_1c',sans-serif] text-[#94a3b8] shrink-0">
              <span className="font-mono truncate">{"⊣"} {session.branch}</span>
              <span className="shrink-0">
                Tasks {agentTasks.filter((t) => t.done).length}/{agentTasks.length} · Human testing {humanRows.filter((r) => r.done).length}/{humanRows.length}
              </span>
            </div>
          )}

          {/* Messages */}
          <div
            ref={sessionChatListRef}
            id={isExperimemo ? `panel-agent-${activeAgentTab}` : undefined}
            role={isExperimemo ? "tabpanel" : undefined}
            aria-labelledby={isExperimemo ? `tab-agent-${activeAgentTab}` : undefined}
            className="flex-1 min-h-0 overflow-y-auto px-3 sm:px-4 py-4 flex flex-col gap-4 bg-[#0a0814]"
          >
            {isExperimemo ? (
              activeExperimemoMessages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full min-h-[220px] text-center space-y-2.5 text-[#71717a] px-4">
                  {activeAgentTab !== "infie" ? (
                    <ProviderIcon provider={activeAgentTab} size={28} />
                  ) : (
                    <OS1InfieAvatar maskId="os1-av-exp-empty" />
                  )}
                  <p className="text-[13px] font-['Rounded_Mplus_1c',sans-serif] text-[#a1a1aa]">
                    Waiting for Infie's handoff.
                  </p>
                  <button
                    type="button"
                    onClick={() => tutorial.setActiveSessionTab("infie")}
                    className="text-[11px] font-semibold text-[#2dd4bf] hover:underline cursor-pointer"
                  >
                    Return to Infie
                  </button>
                </div>
              ) : (
                activeExperimemoMessages.map((msg) => (
                  <FlowMessageBubble
                    key={msg.id}
                    msg={msg}
                    infieAvatar={<OS1InfieAvatar maskId={`os1-av-${msg.id}`} />}
                    onJump={activeAgentTab === "infie" ? tutorial.setActiveSessionTab : undefined}
                  />
                ))
              )
            ) : isTutorialActive ? (
              <>
                {dockedChat.history.map((m, idx) => {
                  const isLatest = idx === dockedChat.history.length - 1;
                  return (
                    <div key={m.id} className="flex gap-[10px] items-start justify-start">
                      <OS1InfieAvatar maskId={`os1-av-tut-${idx}`} />
                      <div
                        data-slot={isLatest ? "infie-message" : undefined}
                        data-message-id={m.id}
                        role={isLatest ? "status" : undefined}
                        aria-live={isLatest ? "polite" : undefined}
                        style={{
                          borderRadius: "3px 10px 10px 10px",
                          padding: "10px 14px",
                          fontFamily: "'Rounded Mplus 1c',sans-serif",
                          fontSize: 12.5,
                          lineHeight: "19.5px",
                          background: "transparent",
                          color: "#e5e7eb",
                          border: isLatest
                            ? "1px solid rgba(45,212,191,0.45)"
                            : "0.667px solid rgba(45,212,191,0.16)",
                          maxWidth: "85%",
                        }}
                      >
                        {m.text}
                      </div>
                    </div>
                  );
                })}
              </>
            ) : (
              messages.map((m, idx) => (
                <div key={m.id} className={`flex gap-[10px] items-start ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                  {m.role === "assistant" && <OS1InfieAvatar maskId={`os1-av-msg-${idx}`} />}
                  <div style={{
                    borderRadius: m.role === "assistant" ? "3px 10px 10px 10px" : 12,
                    padding: "10px 14px",
                    fontFamily: "'Rounded Mplus 1c',sans-serif",
                    fontSize: 12,
                    lineHeight: "19.5px",
                    background: m.role === "user" ? "#2dd4bf" : "rgba(45,212,191,0.05)",
                    color: m.role === "user" ? "#06201d" : "#c5c5c5",
                    border: m.role === "user" ? "none" : "0.667px solid rgba(45,212,191,0.13)",
                    maxWidth: "85%",
                  }}>{m.content}</div>
                </div>
              ))
            )}
            <div ref={bottomRef} />
          </div>

          {/* B17: Session Completion Form lives in the chat column, above the action row,
              so it never overlaps the conversation (unboxed, no outer card). */}
          <AnimatePresence initial={false}>
            {showCompletionForm && (
              <motion.div
                key="b17-completion-form"
                className="shrink-0 bg-[#0a0814] overflow-hidden"
                exit={{ opacity: 0, height: 0, transition: { duration: 0.35, ease: "easeInOut" } }}
              >
                <SessionCompletionForm
                  submitEnabled={turnIndex >= B17_EXPLANATIONS.length - 1}
                  onSubmit={() => {
                    // Local demo submission: marks the demo Session complete, then Infie
                    // explains what that did (branches merged and cleaned up).
                    setDemoSessionCompleted(true);
                    setTurnIndex(B17_EXPLANATIONS.length);
                  }}
                />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Experimemo: completion form is strictly gated until Auto-merge moves session to MERGED with lesson === "form". */}
          {isExperimemo && xs?.status === "MERGED" && xs?.lesson === "form" && (
            <div data-testid="lesson-form" className="shrink-0 bg-[#0a0814]">
              <SessionCompletionForm
                key={`${xs.status}-${xs.lesson}`}
                submitEnabled
                summaryDefault={xs.lessonSummary}
                correctedActionDefault={xs.lessonAction}
                onSubmit={(values) =>
                  tutorial.dispatchFlow({
                    type: "SUBMIT_LESSON",
                    summary: values.summary,
                    correctedAction: values.correctedAction,
                  })
                }
              />
            </div>
          )}

          {/* Action pills — directly above the input, no backdrop. The docked tutorial Continue
              sits first; the other pills are greyed out and inert during the tutorial. */}
          <div className="mx-2 sm:mx-3 mb-2 shrink-0">
            <div
              data-name="DockedChatActionRow"
              className={`flex gap-2 items-center justify-center p-2 flex-wrap ${
                isTutorialActive ? "min-h-[54px]" : ""
              }`}
            >
              {isExperimemo ? (
                <>
                  {sessionActions.map((act) => {
                    const iconByKey: Record<PrimaryActionKey, IconCmp> = {
                      delegate: ArrowRight,
                      fix: AlertTriangle,
                      "open-pr": GitPullRequest,
                      "review-changes": Search,
                      "wrap-up": Stethoscope,
                      "present-changes": Globe,
                      "auto-merge": GitMerge,
                      cleanup: Sparkles,
                      "confirm-cleanup": CheckCircle2,
                    };
                    const handleActionClick = () => {
                      switch (act.key) {
                        case "delegate":
                          tutorial.dispatchFlow({ type: "DELEGATE" });
                          break;
                        case "fix":
                          tutorial.dispatchFlow({ type: "FIX_PROBLEMS" });
                          break;
                        case "open-pr":
                          tutorial.dispatchFlow({ type: "OPEN_PR" });
                          break;
                        case "review-changes":
                          tutorial.dispatchFlow({ type: "REVIEW_CHANGES" });
                          break;
                        case "wrap-up":
                          tutorial.dispatchFlow({ type: "START_WRAP_UP" });
                          break;
                        case "present-changes":
                          tutorial.dispatchFlow({ type: "PRESENT_CHANGES" });
                          onOpenWidget?.("emuWeb", "Web Preview");
                          break;
                        case "auto-merge":
                          tutorial.dispatchFlow({ type: "AUTO_MERGE" });
                          break;
                        case "cleanup":
                          tutorial.dispatchFlow({ type: "REQUEST_CLEANUP" });
                          break;
                        case "confirm-cleanup":
                          tutorial.dispatchFlow({ type: "CONFIRM_CLEANUP" });
                          onOpenProject();
                          break;
                      }
                    };
                    return (
                      <InfieFlowPill
                        key={act.key}
                        testId={`flow-action-${act.key}`}
                        label={act.label}
                        preset={act.preset}
                        icon={iconByKey[act.key]}
                        onClick={handleActionClick}
                      />
                    );
                  })}
                </>
              ) : (
                <>
                  {showDockedContinue && <FloatingContinueButton onClick={dockedChat.onContinue!} />}
                  {/* What's Next — teal */}
                  <button
                    onClick={isTutorialActive ? undefined : handleWhatsNext}
                    disabled={isTutorialActive}
                    data-tutorial-disabled={isTutorialActive ? "true" : undefined}
                    className={`drop-shadow-[0px_0px_6px_rgba(45,212,191,0.35)] relative rounded-[999px] shrink-0 hover:opacity-90 transition-opacity ${isTutorialActive ? TUTORIAL_DISABLED_ACTION_CLS : ""}`}
                  >
                    <div aria-hidden className="absolute bg-[rgba(17,40,37,0.75)] inset-0 pointer-events-none rounded-[999px]" />
                    <div aria-hidden className="absolute border border-[rgba(45,212,191,0.5)] inset-0 pointer-events-none rounded-[999px]" />
                    <div className="flex flex-row items-center size-full">
                      <div className="flex gap-2 items-center pl-3 pr-4 py-[7px] whitespace-nowrap relative">
                        <span className="font-medium text-[#2dd4bf] text-[14px]">✦</span>
                        <span className="font-['Inter',sans-serif] font-semibold text-[13px] text-white">{`What's Next`}</span>
                      </div>
                    </div>
                    <div className="absolute inset-0 pointer-events-none rounded-[inherit] shadow-[inset_0px_0px_25px_0px_rgba(45,212,191,0.25)]" />
                  </button>
                  {/* Test changes — amber */}
                  <button
                    onClick={isTutorialActive ? undefined : handleTestChanges}
                    disabled={isTutorialActive}
                    data-tutorial-disabled={isTutorialActive ? "true" : undefined}
                    className={`drop-shadow-[0px_0px_6px_rgba(251,191,36,0.35)] relative rounded-[999px] shrink-0 hover:opacity-90 transition-opacity ${isTutorialActive ? TUTORIAL_DISABLED_ACTION_CLS : ""}`}
                  >
                    <div aria-hidden className="absolute bg-[rgba(45,37,15,0.75)] inset-0 pointer-events-none rounded-[999px]" />
                    <div aria-hidden className="absolute border border-[rgba(251,191,36,0.5)] inset-0 pointer-events-none rounded-[999px]" />
                    <div className="flex flex-row items-center size-full">
                      <div className="flex gap-2 items-center pl-3 pr-4 py-[7px] whitespace-nowrap relative">
                        <span className="font-['Inter',sans-serif] font-medium text-[#fbbf24] text-[14px]">⚠</span>
                        <span className="font-['Inter',sans-serif] font-semibold text-[13px] text-white">Test changes</span>
                      </div>
                    </div>
                    <div className="absolute inset-0 pointer-events-none rounded-[inherit] shadow-[inset_0px_0px_25px_0px_rgba(251,191,36,0.25)]" />
                  </button>
                  {/* Action — teal compact */}
                  <button
                    onClick={isTutorialActive ? undefined : handleAction}
                    disabled={isTutorialActive}
                    data-tutorial-disabled={isTutorialActive ? "true" : undefined}
                    className={`drop-shadow-[0px_0px_6px_rgba(45,212,191,0.35)] relative rounded-[999px] shrink-0 hover:opacity-90 transition-opacity ${isTutorialActive ? TUTORIAL_DISABLED_ACTION_CLS : ""}`}
                  >
                    <div aria-hidden className="absolute bg-[rgba(17,40,37,0.75)] inset-0 pointer-events-none rounded-[999px]" />
                    <div aria-hidden className="absolute border border-[rgba(45,212,191,0.5)] inset-0 pointer-events-none rounded-[999px]" />
                    <div className="flex flex-row items-center size-full">
                      <div className="flex gap-2 items-center pl-3 pr-4 py-[7px] whitespace-nowrap relative">
                        <span className="font-medium text-[#2dd4bf] text-[14px]">✦</span>
                        <span className="font-['Inter',sans-serif] font-semibold text-[13px] text-white">Action</span>
                      </div>
                    </div>
                    <div className="absolute inset-0 pointer-events-none rounded-[inherit] shadow-[inset_0px_0px_25px_0px_rgba(45,212,191,0.25)]" />
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Input */}
          <div className="border-t border-[rgba(255,255,255,0.05)] py-3 px-3 shrink-0 bg-[#0a0814]">
            {isExperimemo && xs ? (
              <InfieComposer
                value={xs.tabDrafts[activeAgentTab]}
                onChange={v => tutorial.dispatchFlow({ type: "SET_SESSION_DRAFT", value: v })}
                onSend={() => tutorial.dispatchFlow({ type: "SEND_SESSION", text: xs.tabDrafts[activeAgentTab] })}
                placeholder={getSessionComposerPlaceholder(activeAgentTab)}
                ariaLabel={
                  activeAgentTab === "infie"
                    ? "Message Infie"
                    : `Message ${SESSION_TAB_ACCESSIBLE_LABEL[activeAgentTab]}`
                }
                glow={false}
              />
            ) : (
              <div className="bg-[#252323] border border-[rgba(45,212,191,0.14)] rounded-[8px] flex gap-2 items-end px-3 py-2">
                <input
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter") handleSend(); }}
                  placeholder="Ask Infie to coordinate, scan, or switch agents… (⌘↵)"
                  className="flex-1 min-w-0 bg-transparent text-[12px] text-white placeholder-[#555] focus:outline-none"
                  style={{ fontFamily: "'Rounded Mplus 1c',sans-serif" }}
                />
                <button
                  type="button"
                  onClick={handleSend}
                  className="bg-[rgba(255,255,255,0.05)] rounded-[6px] flex items-center justify-center shrink-0 size-7 hover:bg-white/10 transition-colors disabled:opacity-40"
                >
                  <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                    <g clipPath="url(#send-clip)">
                      <path d={svgPathsOS1.p2ca29780} stroke="#444" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.08333" />
                      <path d={svgPathsOS1.p3f86e380} stroke="#444" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.08333" />
                    </g>
                    <defs><clipPath id="send-clip"><rect width="13" height="13" fill="white" /></clipPath></defs>
                  </svg>
                </button>
              </div>
            )}
          </div>
        </div>
        {isExperimemo && xs?.reviewOpen && (
          <ExperimemoPRReviewWidget session={xs} />
        )}
        </div>

        {/* ── RIGHT — hidden during PR review split so PR widget holds ~50% width cleanly ── */}
        {!(isExperimemo && xs?.reviewOpen) && <div className={`hidden lg:flex ${isExperimemo ? "w-[336px]" : "w-[230px]"} shrink-0 flex-col gap-[8px] overflow-y-auto min-h-0`}>
          {showTaskGroups && <>

          {/* Human Testing */}
          <div
            data-name="HumanTestingPanel"
            data-human-testing-glow={needsHumanVerificationGlow ? "true" : "false"}
            className={`rounded-[6px] overflow-clip shrink-0 w-full transition-all ${
              needsHumanVerificationGlow || (!isExperimemo && isTutorialActive && currentBeat === "B15" && turnIndex === 1)
                ? "border border-[#2dd4bf] shadow-[0_0_20px_rgba(45,212,191,0.45)] animate-pulse motion-reduce:animate-none"
                : "border border-[rgba(255,255,255,0.05)] shadow-[0px_4px_6px_-1px_rgba(0,0,0,0.1)]"
            }`}
          >
            <div className="bg-[#1d1b20] border-b border-[rgba(255,255,255,0.05)] flex items-center gap-2 px-3 py-[7px]">
              <OS1DarkDotIcon />
              <span className="font-['Rounded_Mplus_1c',sans-serif] text-[11px] tracking-[0.275px] uppercase text-[#777]">
                {isExperimemo ? `Human Testing ${humanRows.filter(r => r.done).length}/${humanRows.length}` : "Human Testing 1/4"}
              </span>
            </div>
            <div className="bg-[#252323]">
              {humanRows.map(t => (
                <button
                  key={t.id}
                  data-human-task-id={t.id}
                  data-done={t.done ? "true" : "false"}
                  onClick={() => {
                    if (isExperimemo) {
                      tutorial.dispatchFlow({ type: "TOGGLE_HUMAN_TEST", id: t.id });
                      return;
                    }
                    const becomingDone = !t.done;
                    setTests(ts => ts.map(x => x.id === t.id ? { ...x, done: !x.done } : x));
                    if (becomingDone) {
                      onHumanTaskVerified?.();
                    }
                  }}
                  className="border-b border-[rgba(255,255,255,0.05)] flex gap-2 items-start px-3 py-2 w-full text-left hover:bg-white/[0.02] transition-colors"
                >
                  {t.done ? <OS1CheckDoneIcon /> : <OS1CheckPendingIcon />}
                  <span className={`font-['Rounded_Mplus_1c',sans-serif] text-[11px] leading-[17.875px] ${t.done ? "line-through text-[#555]" : "text-[#c5c5c5]"}`}>{t.text}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Inline web preview (Experimemo) */}
          {isExperimemo && (
            <ExperimemoPreviewWidget
              glow={needsHumanVerificationGlow}
              onEnlarge={() => onOpenWidget?.("emuWeb", "Web Preview")}
            />
          )}

          {!isExperimemo && explorerPanel}
          </>}
          <div ref={musicSlotRef} data-name="MusicWidgetSlot" className="mt-auto shrink-0 w-full" />
        </div>}

      </div>

      {isExperimemo && xs?.workerLimitTab && (
        <PrototypeLimit
          variant="modal"
          title="Prototype Limit"
          subtitle={`${SESSION_TAB_ACCESSIBLE_LABEL[xs.workerLimitTab]} · Direct Agent Chat`}
          featureName={`${PROVIDER_TOPIC[xs.workerLimitTab]} (${PROVIDER_LABEL[xs.workerLimitTab]})`}
          description={`Direct interactive agent chat on the ${PROVIDER_TOPIC[xs.workerLimitTab]} tab will be available in the full application. Your note was recorded in this worker's thread without invoking a live model.`}
          environmentNote="Simulated prototype · direct worker replies disabled; no live model calls"
          primaryAction={{
            label: "Return to tab",
            onClick: () => tutorial.dispatchFlow({ type: "DISMISS_WORKER_LIMIT" }),
          }}
          onClose={() => tutorial.dispatchFlow({ type: "DISMISS_WORKER_LIMIT" })}
        />
      )}
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: "#0b131d", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12 }} className="p-3.5">
      <p className="mb-2.5" style={{ fontFamily: "'Rounded Mplus 1c',sans-serif", fontSize: 9.5, fontWeight: 600, color: "rgba(255,255,255,0.3)", letterSpacing: "0.1em", textTransform: "uppercase" }}>{title}</p>
      {children}
    </div>
  );
}

// ─── i2 Home header (faithful to imported I2Home-1 frame) ──────────────────

function I2HomeHeader({ tab, setTab, onScopeNotice }: { tab: "Workspace" | "Emulators"; setTab: (t: "Workspace" | "Emulators") => void; onScopeNotice?: (msg: string) => void }) {
  return (
    <Header
      activeLevel="home"
      tab={tab}
      onTabChange={setTab}
      onScopeNotice={onScopeNotice}
    />
  );
}

// Tutorial-owned demo project record (isolated from real user projects, removed at B18 release)
const TUTORIAL_DEMO_PROJECT: ProtoProject = {
  id: "tutorial-demo",
  name: "Tutorial demo",
  desc: "Seeded project folder & session walkthrough",
  framework: "Expo",
  sessions: 1,
  ago: "Now",
  active: true,
  wired: true,
};

// Home chat message-area height (≈20% taller than the original 360px).
const HOME_CHAT_HEIGHT_PX = 432;
const HOME_TUTORIAL_CHAT_EXTRA_PX = HOME_CHAT_HEIGHT_PX - 360;
// Action buttons that exist during the tutorial but aren't part of it: greyed out, inert.
const TUTORIAL_DISABLED_ACTION_CLS =
  "inline-flex shrink-0 opacity-40 grayscale cursor-not-allowed pointer-events-none select-none";

// ─── Homescreen Floating Infie Mascot ────────────────────────────────────────

function FloatingInfieMascot({
  danceNonce = 0,
  formAsset = INFIE_HERO_SRC,
}: {
  danceNonce?: number;
  formAsset?: string;
}) {
  const reduced = useReducedMotion();
  const { danceControls } = useInfieDance(danceNonce, reduced);
  return (
    <div className="relative flex items-center justify-center mb-1 select-none" style={{ width: 72, height: 72 }}>
      <motion.div animate={danceControls} className="relative z-10 size-full flex items-center justify-center">
        <motion.div
          animate={reduced ? undefined : { y: [0, -6, 0] }}
          transition={reduced ? undefined : { duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
          className="size-full flex items-center justify-center"
        >
          <AnimatePresence mode="wait" initial={false}>
            <motion.img
              key={formAsset}
              src={formAsset}
              alt="Infie"
              width={72}
              height={72}
              initial={{ opacity: 0, scale: reduced ? 1 : 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: reduced ? 1 : 0.95 }}
              transition={{ duration: reduced ? 0.15 : 0.26, ease: "easeInOut" }}
              className="size-full object-contain pointer-events-none select-none"
              style={{ background: "transparent" }}
            />
          </AnimatePresence>
        </motion.div>
      </motion.div>
    </div>
  );
}

function I2HomeScreen({
  onOpenProject,
  onSuperStack,
  projectType,
  onProjectTypeChange,
  onSelectProject,
  onScopeNotice,
  onTutorials,
  onOpenSessionShortcut,
  onPlayground,
  levelText = "Lvl. 1",
  showHeaderControls = true,
  showBreadcrumbs = true,
  showTutorialsWidgetsGames,
  showNotificationsSettings,
  showLevelIndicator = true,
  showTutorialsEntry = true,
  animateHeaderIntro = false,
  showConversationEntry = true,
  showProjectsAndActions = true,
  showResumeProjects = true,
  showNewImportButtons = true,
  showHomeActionButtons = true,
  showTutorialDemoProject = false,
  showAmbientBackdrop = true,
  levelUpFlourish = false,
  levelUpStage = "idle",
  activeProjectLabel,
  onReturnToActiveProject,
  onWidgets,
  onSupportNewFramework,
  onNotifications,
  switchableProjects,
  projects,
  allSessions,
  onSelectSession,
  currentProjectId,
  levelPillDocked,
  breadcrumbsDocked,
  tutorialsWidgetsGamesDocked,
  notificationsSettingsDocked,
  highlightTutorialsNav = false,
  disabled,
  danceNonce = 0,
}: {
  onOpenProject: () => void; onSuperStack: () => void;
  projectType: ProjectType; onProjectTypeChange: (v: ProjectType) => void;
  onSelectProject: (p: ProtoProject) => void;
  onScopeNotice: (msg: string) => void;
  onTutorials?: () => void;
  onOpenSessionShortcut: (sessionId: string) => void;
  onPlayground: () => void;
  levelText?: string;
  showHeaderControls?: boolean;
  showBreadcrumbs?: boolean;
  showTutorialsWidgetsGames?: boolean;
  showNotificationsSettings?: boolean;
  showLevelIndicator?: boolean;
  showTutorialsEntry?: boolean;
  animateHeaderIntro?: boolean;
  showConversationEntry?: boolean;
  showProjectsAndActions?: boolean;
  showResumeProjects?: boolean;
  showNewImportButtons?: boolean;
  showHomeActionButtons?: boolean;
  showTutorialDemoProject?: boolean;
  showAmbientBackdrop?: boolean;
  levelUpFlourish?: boolean;
  levelUpStage?: LevelUpAnimationStage;
  activeProjectLabel?: string;
  onReturnToActiveProject?: () => void;
  onWidgets?: () => void;
  onSupportNewFramework?: () => void;
  onNotifications?: () => void;
  switchableProjects?: ProtoProject[];
  projects?: ProtoProject[];
  allSessions?: ProtoSession[];
  onSelectSession?: (s: ProtoSession) => void;
  currentProjectId?: string | null;
  levelPillDocked?: boolean;
  breadcrumbsDocked?: boolean;
  tutorialsWidgetsGamesDocked?: boolean;
  notificationsSettingsDocked?: boolean;
  highlightTutorialsNav?: boolean;
  disabled?: boolean;
  danceNonce?: number;
}) {
  const { isTutorialActive, currentFormAsset, dockedChat, currentBeat, turnIndex } = useOnboarding();
  const homeReducedMotion = useReducedMotion();
  // B12 Turn 0 is the only time the conversation entry mounts sliding in from center
  // (HomeConversationSlide latches this at mount); later mounts render in place.
  const slideConversationIn = isTutorialActive && currentBeat === "B12" && turnIndex === 0;
  const showDockedContinue = Boolean(isTutorialActive && dockedChat.showContinue && dockedChat.onContinue);
  const [tab, setTab] = useState<"Workspace" | "Emulators">("Workspace");
  const [emuConnected, setEmuConnected] = useState(false);
  const [messages, setMessages] = useState<Message[]>([{ id: "greet", role: "assistant", content: INFIE_HOME_GREETING }]);
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, dockedChat.history]);

  const send = () => {
    const text = input.trim();
    if (!text) return;
    setMessages(ms => [...ms, { id: uid(), role: "user", content: text }]);
    setInput("");
    setTimeout(() => setMessages(ms => [...ms, { id: uid(), role: "assistant", content: infieHomeReply(text) }]), 550);
  };
  const send2 = (text: string) => {
    setMessages(ms => [...ms, { id: uid(), role: "user", content: text }]);
    setTimeout(() => setMessages(ms => [...ms, { id: uid(), role: "assistant", content: infieHomeReply(text) }]), 550);
  };

  // Canonical B12 rule: show only the two existing seeded projects ("Pet Show and Tell" and "Not Hotdog");
  // no extra enclosing tutorial demo project card.
  const displayedProjects = projects ?? PROTOTYPE_PROJECTS;

  return (
    <div
      className="size-full flex flex-col relative overflow-hidden"
      style={{ background: showAmbientBackdrop ? "#0a0814" : "transparent" }}
    >
      {showAmbientBackdrop && <AnimatedGlows />}

      {/* Top chrome */}
      <Header
        activeLevel="home"
        level={levelText}
        projectLabel={activeProjectLabel}
        currentProjectId={currentProjectId}
        onOpenProject={onReturnToActiveProject}
        switchableProjects={switchableProjects}
        onSwitchProject={onSelectProject}
        allSessions={allSessions}
        onSelectSession={onSelectSession}
        tab={tab}
        onTabChange={setTab}
        onScopeNotice={onScopeNotice}
        onTutorials={onTutorials}
        onWidgets={onWidgets}
        onNotifications={onNotifications}
        showHeaderControls={showHeaderControls}
        showBreadcrumbs={showBreadcrumbs}
        showTutorialsWidgetsGames={showTutorialsWidgetsGames}
        showNotificationsSettings={showNotificationsSettings}
        showLevelIndicator={showLevelIndicator}
        showTutorialsEntry={showTutorialsEntry}
        animateIntro={animateHeaderIntro}
        levelUpFlourish={levelUpFlourish}
        levelUpStage={levelUpStage}
        levelPillDocked={levelPillDocked}
        breadcrumbsDocked={breadcrumbsDocked}
        tutorialsWidgetsGamesDocked={tutorialsWidgetsGamesDocked}
        notificationsSettingsDocked={notificationsSettingsDocked}
        highlightTutorialsNav={highlightTutorialsNav}
        disabled={disabled}
      />

      {/* Emulator canvas — Screen 2 */}
      {showHeaderControls && tab === "Emulators" && (
        <div className="flex-1 flex flex-col overflow-hidden min-h-0 relative z-10">
          <div className="h-9 bg-[#252323] border-b border-white/5 flex items-center px-4 gap-3 shrink-0">
            <span className="font-['Rounded_Mplus_1c',sans-serif] text-[11px] text-[#444] uppercase tracking-wider">Emulator Canvas</span>
            <div className="flex items-center gap-1.5 ml-2">
              <div className={`w-1.5 h-1.5 rounded-full ${emuConnected ? "bg-[#abefa3]" : "bg-[#444]"}`} />
              <span className="font-['Rounded_Mplus_1c',sans-serif] text-[11px] text-[#555]">
                {emuConnected ? "App running · port 8081" : "Waiting for app…"}
              </span>
            </div>
            <button onClick={() => setEmuConnected(c => !c)}
              className="ml-auto text-[11px] font-['Rounded_Mplus_1c',sans-serif] px-3 py-1 rounded bg-[#1d1b20] text-[#777] hover:text-white border border-white/8 transition-colors">
              {emuConnected ? "Disconnect" : "Simulate Connect"}
            </button>
          </div>
          <EmulatorCanvas connected={emuConnected} openEmuModal={() => {}} />
        </div>
      )}

      {/* Main Content — Figma MainContent layout */}
      {tab === "Workspace" && (showConversationEntry || showProjectsAndActions) && <div className="flex-1 overflow-y-auto relative z-10">
        <div className="content-stretch flex flex-col lg:flex-row gap-[24px] lg:gap-[32px] items-center justify-center max-w-[1261px] min-h-full mx-auto pb-[48px] pt-[24px] lg:pt-[40px] px-4 sm:px-[32px]">

          {/* LEFT — Infie Convo (flex-1) */}
          {showConversationEntry && (
            <HomeConversationSlide
              slide={slideConversationIn}
              reducedMotion={homeReducedMotion}
              className="content-stretch flex flex-[1_0_0] flex-col items-start min-w-px relative"
              innerClassName="content-stretch flex flex-col items-start w-full relative"
              // The tutorial chat is 72px taller (see the messages area); this bottom margin
              // keeps the centered column's bottom edge exactly where it was, so the chat
              // grows upward only.
              style={{ marginBottom: isTutorialActive ? HOME_TUTORIAL_CHAT_EXTRA_PX : 0 }}
            >
            {/* Floating Mascot Figure (replaces Infiniti symbol and 'Infie') */}
            <FloatingInfieMascot danceNonce={danceNonce} formAsset={currentFormAsset} />

            {/* Card — rounded-16, teal glass border */}
            <div className="content-stretch flex flex-col items-start pt-[16px] relative shrink-0 w-full">
              <div className="content-stretch flex flex-col items-start overflow-clip relative rounded-[16px] shrink-0 w-full"
                style={{ border: "none", background: "transparent" }}>

                {/* Messages area + InfieActionRow */}
                <div
                  className="content-stretch flex flex-col justify-between overflow-clip p-[16px] relative shrink-0 w-full"
                  // During the tutorial the chat keeps a constant height so the vertically centered
                  // column never shifts and the input stays put; it is ~20% taller than the old
                  // 360px so three messages fit without a scrollbar (scrolling stays as a backup).
                  style={
                    isTutorialActive
                      ? { height: HOME_CHAT_HEIGHT_PX }
                      : { minHeight: 173, maxHeight: HOME_CHAT_HEIGHT_PX }
                  }
                >
                  {/* Scrollable messages */}
                  <div className="flex flex-col gap-2 overflow-y-auto mb-3 flex-1">
                    {isTutorialActive ? (
                      <>
                        <AnimatePresence initial={false}>
                        {dockedChat.history.map((m, idx) => {
                          const isLatest = idx === dockedChat.history.length - 1;
                          return (
                            <motion.div
                              layout="position"
                              key={m.id}
                              initial={{ opacity: 0, y: 8 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{
                                layout: { duration: 0.28, ease: [0.22, 1, 0.36, 1] },
                                opacity: { duration: 0.22, ease: "easeOut" },
                                y: { duration: 0.24, ease: "easeOut" },
                              }}
                              className="flex justify-start"
                            >
                              <div
                                data-slot={isLatest ? "infie-message" : "infie-message-history"}
                                data-message-id={m.id}
                                role={isLatest ? "status" : undefined}
                                aria-live={isLatest ? "polite" : undefined}
                                className="rounded-[12px] px-[13px] py-[9px] text-[13px]"
                                style={{
                                  maxWidth: "92%",
                                  fontFamily: "'Rounded Mplus 1c',sans-serif",
                                  lineHeight: "20.8px",
                                  background: "transparent",
                                  color: isLatest ? "rgba(255,255,255,0.95)" : "rgba(255,255,255,0.68)",
                                  border: isLatest
                                    ? "1px solid rgba(45, 212, 191, 0.45)"
                                    : "1px solid rgba(45, 212, 191, 0.18)",
                                }}
                              >
                                {m.text}
                              </div>
                            </motion.div>
                          );
                        })}
                        </AnimatePresence>
                      </>
                    ) : (
                      messages.map(m => (
                        <div key={m.id} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                          <div className={`rounded-[12px] px-[13px] py-[9px] text-[13px]`}
                            style={{
                              maxWidth: "85%",
                              fontFamily: "'Rounded Mplus 1c',sans-serif", lineHeight: "20.8px",
                              background: m.role === "user" ? "#2dd4bf" : "rgba(255,255,255,0.05)",
                              color: m.role === "user" ? "#06201d" : "rgba(255,255,255,0.8)",
                              border: "none",
                            }}>{m.content}</div>
                        </div>
                      ))
                    )}
                    <div ref={bottomRef} />
                  </div>

                  {/* InfieActionRow — action buttons always sit directly above the input (no
                      backdrop). During the tutorial the row is always present (height reserved)
                      so the input never moves; it holds Continue, and from B12 Turn 6 the Home
                      action buttons beside it, greyed out (none are used in the tutorial). */}
                  {(isTutorialActive || showHomeActionButtons) && (
                    <motion.div
                      data-name="HomeInfieActionRow"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.3 }}
                      className={`relative shrink-0 w-full ${isTutorialActive ? "min-h-[54px]" : ""}`}
                    >
                      <div className="flex flex-row items-center justify-center size-full">
                        <div
                          data-name="DockedChatActionRow"
                          className={`content-stretch flex gap-[8px] items-center justify-center p-[8px] relative size-full ${
                            showDockedContinue ? "flex-wrap" : ""
                          } ${isTutorialActive ? "min-h-[54px]" : ""}`}
                        >
                          {showDockedContinue && (
                            <FloatingContinueButton onClick={dockedChat.onContinue!} />
                          )}
                          {showHomeActionButtons && (
                          <>
                          <button
                            type="button"
                            disabled={isTutorialActive}
                            aria-disabled={isTutorialActive || undefined}
                            data-tutorial-disabled={isTutorialActive ? "true" : undefined}
                            onClick={isTutorialActive ? undefined : () => send2("What should I work on next?")}
                            className={isTutorialActive ? TUTORIAL_DISABLED_ACTION_CLS : "contents"}
                          >
                            <FigmaInfieActionButton
                              preset="Recommendation"
                              density="Compact"
                              actionLabel="What's Next"
                              showProject={false}
                            />
                          </button>
                          <button
                            type="button"
                            disabled={isTutorialActive}
                            aria-disabled={isTutorialActive || undefined}
                            data-tutorial-disabled={isTutorialActive ? "true" : undefined}
                            onClick={isTutorialActive ? undefined : () => onOpenSessionShortcut("add-comments")}
                            className={isTutorialActive ? TUTORIAL_DISABLED_ACTION_CLS : "contents"}
                          >
                            <FigmaInfieActionButton
                              preset="Attention"
                              density="Expanded"
                              actionLabel="Test changes in"
                              session="Add comments"
                              project="Pet Show and Tell"
                              message="Attempt to add comment and react to it."
                              showProject={true}
                            />
                          </button>
                          </>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </div>

                {/* Input row */}
                <div className="content-stretch flex gap-[8px] items-start p-[12px] relative shrink-0 w-full"
                  style={{ borderTop: "0.667px solid rgba(255,255,255,0.06)" }}>
                  <input value={input} onChange={e => setInput(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter") send(); }}
                    placeholder="Talk to Infie…"
                    className="bg-[rgba(255,255,255,0.04)] border-[0.667px] border-[rgba(255,255,255,0.1)] flex-[630.667_0_0] min-w-px overflow-clip px-[14px] py-[10px] rounded-[10px] self-stretch text-[13px] text-white placeholder-[rgba(255,255,255,0.25)] outline-none focus:border-[rgba(45,212,191,0.4)] transition-colors"
                    style={{ fontFamily: "'Rounded Mplus 1c',sans-serif" }}
                  />
                  <button onClick={send}
                    className="bg-[#2dd4bf] flex items-center justify-center rounded-[10px] shrink-0 size-[40px] transition-opacity hover:opacity-90">
                    <Send size={15} color="#06201D" strokeWidth={1.5} />
                  </button>
                </div>
              </div>
            </div>
            </HomeConversationSlide>
          )}

          {/* 18px spacer — kept when conversation entry is revealed so left column stays at its exact final width */}
          {(showConversationEntry || showProjectsAndActions) && (
            <div aria-hidden="true" className="hidden lg:block h-[100px] relative shrink-0 w-[18px]" />
          )}

          {/* RIGHT SIDE — centered, fixed 558px project grid */}
          {showProjectsAndActions ? (
            <motion.div
              data-name="HomeProjectsAndActions"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.35 }}
              className="content-stretch flex flex-[1_0_0] flex-col gap-[40px] lg:gap-[72px] lg:h-[604px] items-center justify-center min-w-px w-full relative"
            >
            {/* Recent Projects */}
            {showResumeProjects && (
              <motion.div
                data-name="HomeResumeProjects"
                initial={{ opacity: 0, y: isTutorialActive ? 14 : 0 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: B12_PROJECTS_FADE_MS / 1000, ease: "easeOut" }}
                className="content-stretch flex flex-col items-start relative shrink-0 w-full max-w-[558px]"
              >
              <div className="content-stretch flex flex-col items-start relative shrink-0 w-full">
                <p style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 11, fontWeight: 500, color: "rgba(255,255,255,0.3)", letterSpacing: "1.1px", textTransform: "uppercase", whiteSpace: "nowrap" }}>Active Projects</p>
              </div>
              <div className="content-stretch flex flex-col items-start pt-[16px] relative shrink-0 w-full">
                <div className="gap-x-[20px] gap-y-[20px] sm:gap-y-[28px] grid grid-cols-1 sm:grid-cols-2 relative shrink-0 w-full">
                  {displayedProjects.map(p => {
                    const canClickProject = !isTutorialActive || showTutorialDemoProject;
                    return (
                      <ProjectCard
                        key={p.id}
                        project={p}
                        disabled={!canClickProject}
                        calloutGlow={Boolean(isTutorialActive && showTutorialDemoProject)}
                        onClick={() => {
                          if (!canClickProject) return;
                          onSelectProject(p);
                        }}
                      />
                    );
                  })}
                </div>
              </div>
              </motion.div>
            )}

            {/* CTA row — Figma: generate button + open new */}
            {showNewImportButtons && <motion.div
              data-name="HomeNewImportButtons"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
              className={`content-stretch flex flex-wrap sm:flex-nowrap gap-[12px] min-h-[58px] items-center justify-center relative shrink-0 w-full max-w-[420px] ${
                isTutorialActive ? "pointer-events-none opacity-80" : ""
              }`}
            >
              <GenerateProjectButton
                value={projectType}
                onChange={onProjectTypeChange}
                onGenerate={onSuperStack}
                onSupportNewFramework={onSupportNewFramework}
              />
              <button onClick={onOpenProject}
                className="bg-[rgba(255,255,255,0.04)] border-[0.667px] border-[rgba(255,255,255,0.08)] content-stretch flex gap-[8px] h-full items-center justify-center px-[20px] py-[14px] relative rounded-[12px] shrink-0 whitespace-nowrap hover:bg-white/[0.07] transition-colors"
                style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 14, fontWeight: 500, color: "rgba(255,255,255,0.7)" }}>
                <FolderOpen size={16} strokeOpacity={0.7} /> Import Project
              </button>
            </motion.div>}
            </motion.div>
          ) : (
            showConversationEntry && (
              <div
                aria-hidden="true"
                className="flex-[1_0_0] h-[604px] min-w-px pointer-events-none"
              />
            )
          )}

        </div>
      </div>}
    </div>
  );
}

// ─── Active project card (home grid) ───────────────────────────────────────

function ProjectCard({
  project,
  onClick,
  disabled = false,
  calloutGlow = false,
}: {
  project: ProtoProject;
  onClick: () => void;
  disabled?: boolean;
  calloutGlow?: boolean;
}) {
  return (
    <button
      type="button"
      data-project-id={project.id}
      disabled={disabled}
      onClick={disabled ? undefined : onClick}
      className={`text-left transition-all group ${
        disabled ? "cursor-default opacity-75" : "hover:border-[#2dd4bf]/50 hover:bg-white/[0.02] cursor-pointer"
      }`}
      style={{
        background: "#0b131d",
        border: calloutGlow ? "1px solid #2dd4bf" : "1px solid rgba(255,255,255,0.07)",
        boxShadow: calloutGlow ? "0 0 22px rgba(45, 212, 191, 0.45)" : "none",
        borderRadius: 14,
        padding: 16,
      }}
    >
      <div className="flex items-start justify-between mb-3">
        <div style={{ width: 38, height: 38, borderRadius: 10, background: "rgba(171,239,163,0.1)", border: "1px solid rgba(171,239,163,0.22)" }} className="flex items-center justify-center">
          <ProjectGlyph size={18} />
        </div>
        {project.active && (
          <span className="flex items-center gap-1.5" style={{ padding: "3px 8px", borderRadius: 100, background: "rgba(45,212,191,0.1)", border: "1px solid rgba(45,212,191,0.28)" }}>
            <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#2dd4bf" }} />
            <span style={{ fontFamily: "'Rounded Mplus 1c',sans-serif", fontSize: 9.5, color: "#2dd4bf" }}>Active</span>
          </span>
        )}
      </div>
      <p style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 15, fontWeight: 600, color: "#fff" }} className="group-hover:text-[#abefa3] transition-colors">{project.name}</p>
      <p style={{ fontFamily: "'Rounded Mplus 1c',sans-serif", fontSize: 12, color: "rgba(255,255,255,0.4)", lineHeight: 1.45 }} className="mt-1 mb-3">{project.desc}</p>
      <div className="flex items-center gap-3">
        <span style={{ fontFamily: "'Rounded Mplus 1c',sans-serif", fontSize: 10.5, color: "rgba(255,255,255,0.35)" }} className="flex items-center gap-1"><Package size={11} className="text-white/25" />{project.framework}</span>
        <span style={{ fontFamily: "'Rounded Mplus 1c',sans-serif", fontSize: 10.5, color: "rgba(255,255,255,0.35)" }} className="flex items-center gap-1"><GitBranch size={11} className="text-white/25" />{project.sessions} session{project.sessions !== 1 ? "s" : ""}</span>
        <span style={{ fontFamily: "'Rounded Mplus 1c',sans-serif", fontSize: 10.5, color: "rgba(255,255,255,0.3)" }} className="ml-auto">{project.ago}</span>
      </div>
    </button>
  );
}

// ─── Generate button with embedded framework dropdown ──────────────────────

function GenerateProjectButton({ value, onChange, onGenerate, onSupportNewFramework }: {
  value: ProjectType;
  onChange: (v: ProjectType) => void;
  onGenerate: () => void;
  onSupportNewFramework?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={ref} className="relative flex-[1.5]">
      <div className="flex items-stretch w-full overflow-hidden" style={{ borderRadius: 12, background: "linear-gradient(160deg, #8cffff 5%, #1a9999 87%)" }}>
        {/* Main action */}
        <button onClick={onGenerate}
          className="flex-1 flex items-center justify-center gap-2 transition-opacity hover:opacity-90"
          style={{ padding: "14px 18px", fontFamily: "'Space Grotesk',sans-serif", fontSize: 14, fontWeight: 600, color: "#061413" }}>
          <Zap size={16} /> Generate new <span className="underline decoration-1.5 underline-offset-4 decoration-[#061413]/70 font-bold">{PROJECT_TYPE_LABELS[value]}</span> Project
        </button>
        {/* Framework selector segment */}
        <button onClick={() => setOpen(o => !o)}
          className="flex items-center justify-center px-3 transition-colors hover:bg-black/10"
          style={{ borderLeft: "1px solid rgba(6,20,19,0.25)", color: "#061413" }}>
          <ChevronDown size={16} className={`transition-transform ${open ? "rotate-180" : ""}`} />
        </button>
      </div>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 4 }} transition={{ duration: 0.15 }}
            className="absolute right-0 bottom-full mb-2 z-50 min-w-[240px] rounded-[10px] border border-white/10 bg-[#1a1818] shadow-2xl overflow-hidden py-1"
          >
            {PROJECT_TYPES.map((item, i) => {
              if (item.kind === "separator") return (
                <div key={i} className="my-1">
                  {item.label
                    ? <p className="px-3 py-0.5 text-[9px] uppercase tracking-widest text-[#444] font-['Rounded_Mplus_1c',sans-serif]">{item.label}</p>
                    : <div className="mx-2 border-t border-white/6" />}
                </div>
              );
              if (item.kind === "action") return (
                <button key={i} onClick={() => { onSupportNewFramework?.(); setOpen(false); }}
                  className="w-full flex items-center gap-2 px-3 py-1.5 text-[11px] font-['Rounded_Mplus_1c',sans-serif] text-[#abefa3]/80 hover:text-[#abefa3] hover:bg-white/5 transition-colors text-left">
                  <Sparkles size={11} className="text-[#abefa3] shrink-0" />
                  <span>{item.label}</span>
                </button>
              );
              const isSelected = value === item.id;
              return (
                <button key={item.id} onClick={() => { onChange(item.id); setOpen(false); }}
                  className={`w-full flex items-center gap-2 px-3 py-1.5 text-[11px] font-['Rounded_Mplus_1c',sans-serif] transition-colors text-left ${isSelected ? "text-[#abefa3] bg-[#abefa3]/6" : "text-[#c5c5c5] hover:bg-white/4 hover:text-white"}`}>
                  <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${isSelected ? "bg-[#abefa3]" : "bg-transparent"}`} />
                  <span className="flex-1">{item.label}</span>
                  {item.note && <span className="text-[9px] text-[#444]">{item.note}</span>}
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Widgets Gallery Modal ─────────────────────────────────────────────────

function GalleryTile({
  w,
  onOpenWidget,
  highlighted = false,
  inert = false,
  accent = "#abefa3",
}: {
  w: WidgetDef;
  onOpenWidget: (id: WidgetId, label: string) => void;
  highlighted?: boolean;
  inert?: boolean;
  accent?: string;
}) {
  const hoverCls =
    accent === "#2dd4bf"
      ? "hover:border-[#2dd4bf]/30 hover:bg-[#252323]"
      : "hover:border-[#abefa3]/30 hover:bg-[#252323]";
  return (
    <button
      type="button"
      data-widget-entry={w.id}
      data-callout={highlighted ? "true" : undefined}
      disabled={inert}
      onClick={inert ? undefined : () => onOpenWidget(w.id, w.label)}
      className={`flex items-start gap-2.5 p-2.5 rounded-[8px] bg-[#1d1b20] border transition-all text-left group ${
        highlighted
          ? "border-[#2dd4bf] shadow-[0_0_18px_rgba(45,212,191,0.45)]"
          : "border-white/5"
      } ${inert ? "cursor-default" : `cursor-pointer ${hoverCls}`}`}
    >
      <span
        className={`transition-colors mt-0.5 shrink-0 ${
          highlighted
            ? "text-[#2dd4bf]"
            : inert
            ? "text-[#666]"
            : accent === "#2dd4bf"
            ? "text-[#666] group-hover:text-[#2dd4bf]"
            : "text-[#666] group-hover:text-[#abefa3]"
        }`}
      >
        {w.icon}
      </span>
      <div className="min-w-0">
        <p
          className={`font-['Rounded_Mplus_1c',sans-serif] text-[12px] font-medium truncate ${
            highlighted ? "text-[#2dd4bf] font-bold" : inert ? "text-[#ddd]" : "text-[#ddd] group-hover:text-white"
          }`}
        >
          {w.label}
        </p>
        <p className="font-['Rounded_Mplus_1c',sans-serif] text-[10px] text-[#666] truncate mt-0.5">{w.description}</p>
      </div>
    </button>
  );
}

function WidgetsGalleryModal({
  onClose,
  onOpenWidget,
  globalTodosCount,
  highlightWidgetId,
  tutorialMode = false,
}: {
  onClose: () => void;
  onOpenWidget: (id: WidgetId, label: string) => void;
  globalTodosCount: { open: number; total: number };
  /** Tutorial callout glow on one entry (B18: Library). */
  highlightWidgetId?: WidgetId;
  /**
   * B18 tutorial presentation: card anchored near the top (leaving room for Infie's
   * floating callout below) and entries shown but inert. Close/backdrop/Esc still work.
   */
  tutorialMode?: boolean;
}) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const devTools = ALL_WIDGETS.filter(w =>
    ["terminal", "eas", "git", "search", "stylist", "extensions", "actions", "sessions", "library"].includes(w.id)
  );
  const diagnostics = ALL_WIDGETS.filter(w =>
    ["doctor", "problems", "timeline", "humanTesting", "outline"].includes(w.id)
  );
  const emulators = ALL_WIDGETS.filter(w =>
    ["emuWeb", "emuAndroid", "emuIos"].includes(w.id)
  );

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
      data-name="WidgetsGalleryModal"
      data-tutorial={tutorialMode ? "true" : "false"}
      className={`fixed inset-0 z-50 flex justify-center p-4 bg-black/70 backdrop-blur-sm ${
        tutorialMode ? "items-start pt-[6vh]" : "items-center"
      }`}
      onClick={onClose}
    >
      <motion.div
        data-name="WidgetsGalleryCard"
        initial={{ opacity: 0, scale: 0.96, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 8 }}
        transition={{ duration: 0.18 }}
        className={`w-full max-w-[680px] ${tutorialMode ? "max-h-[62vh]" : "max-h-[85vh]"} bg-[#161517] border border-white/10 rounded-[16px] shadow-2xl flex flex-col overflow-hidden text-white`}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/8 bg-[#1c1b1f]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-[8px] bg-[#abefa3]/12 border border-[#abefa3]/25 flex items-center justify-center text-[#abefa3]">
              <Layers size={16} />
            </div>
            <div>
              <h2 className="font-['Space_Grotesk',sans-serif] text-[16px] font-bold text-white">Widgets & Tools Gallery</h2>
              <p className="font-['Rounded_Mplus_1c',sans-serif] text-[11px] text-[#777]">Open developer utilities, device previews, and cross-project trackers</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-[#888] hover:text-white transition-colors cursor-pointer"
          >
            <X size={14} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Featured Hero Card: Global To-Do */}
          <div
            onClick={tutorialMode ? undefined : () => onOpenWidget("globalTodo", "Global To-Do")}
            aria-disabled={tutorialMode || undefined}
            className={`p-4 rounded-[12px] bg-gradient-to-br from-[#0c2420] via-[#101c22] to-[#14121b] border border-[#2dd4bf]/40 transition-all group shadow-[0_0_24px_rgba(45,212,191,0.1)] ${
              tutorialMode
                ? "pointer-events-none"
                : "hover:border-[#abefa3] cursor-pointer hover:shadow-[0_0_32px_rgba(171,239,163,0.18)]"
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-[10px] bg-[#2dd4bf]/20 border border-[#2dd4bf]/40 flex items-center justify-center text-[#2dd4bf] group-hover:scale-105 transition-transform">
                  <CheckSquare size={20} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-['Space_Grotesk',sans-serif] text-[15px] font-bold text-white group-hover:text-[#abefa3] transition-colors">Global To-Do List</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-['Rounded_Mplus_1c',sans-serif] font-bold bg-[#abefa3]/20 text-[#abefa3] border border-[#abefa3]/30">
                      {globalTodosCount.open} Open Tasks
                    </span>
                  </div>
                  <p className="font-['Rounded_Mplus_1c',sans-serif] text-[12px] text-[#999] mt-0.5">
                    Track tasks across your active projects and global reminders (e.g. SSL certificates, API renewals)
                  </p>
                </div>
              </div>
              <button className="px-3 py-1.5 rounded-[8px] bg-[#abefa3] text-[#061413] text-[11px] font-['Space_Grotesk',sans-serif] font-bold flex items-center gap-1 group-hover:bg-[#8cffff] transition-colors shrink-0 cursor-pointer">
                <span>Open Widget</span>
                <ArrowRight size={12} />
              </button>
            </div>
          </div>

          {/* Developer Tools */}
          <div>
            <h4 className="font-['Space_Grotesk',sans-serif] text-[12px] font-bold text-[#777] uppercase tracking-wider mb-2.5">Developer Tools</h4>
            <div className="grid grid-cols-3 gap-2">
              {devTools.map(w => (
                <GalleryTile key={w.id} w={w} onOpenWidget={onOpenWidget} highlighted={w.id === highlightWidgetId} inert={tutorialMode} />
              ))}
            </div>
          </div>

          {/* Diagnostics & Quality */}
          <div>
            <h4 className="font-['Space_Grotesk',sans-serif] text-[12px] font-bold text-[#777] uppercase tracking-wider mb-2.5">Diagnostics & Quality</h4>
            <div className="grid grid-cols-3 gap-2">
              {diagnostics.map(w => (
                <GalleryTile key={w.id} w={w} onOpenWidget={onOpenWidget} highlighted={w.id === highlightWidgetId} inert={tutorialMode} />
              ))}
            </div>
          </div>

          {/* Emulators */}
          <div>
            <h4 className="font-['Space_Grotesk',sans-serif] text-[12px] font-bold text-[#777] uppercase tracking-wider mb-2.5">Device Emulators</h4>
            <div className="grid grid-cols-3 gap-2">
              {emulators.map(w => (
                <GalleryTile key={w.id} w={w} onOpenWidget={onOpenWidget} highlighted={w.id === highlightWidgetId} inert={tutorialMode} accent="#2dd4bf" />
              ))}
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── Folder / Workspace picker modal ───────────────────────────────────────

type ScenarioId = "app-found" | "app-onboard" | "ws-found" | "ws-onboard";
interface Scenario { id: ScenarioId; icon: React.ReactNode; label: string; sublabel: string; tag: string; tagColor: string; }

const FOLDER_SCENARIOS: Scenario[] = [
  { id: "app-found",   icon: <Folder size={20} />,      label: "expo-photo-share/",           sublabel: "Expo app · project/ folder found",              tag: "Ready",    tagColor: "bg-[#abefa3] text-[#1d1b20]" },
  { id: "app-onboard", icon: <Folder size={20} />,      label: "my-new-app/",                 sublabel: "Expo app · no project/ folder",                 tag: "Onboard",  tagColor: "bg-orange-400 text-[#1d1b20]" },
];
const WORKSPACE_SCENARIOS: Scenario[] = [
  { id: "ws-found",    icon: <LayoutGrid size={20} />,  label: "portfolio.code-workspace",    sublabel: "Workspace · project/ found at root",            tag: "Ready",    tagColor: "bg-[#abefa3] text-[#1d1b20]" },
  { id: "ws-onboard",  icon: <LayoutGrid size={20} />,  label: "monorepo.code-workspace",     sublabel: "Workspace · 3 repos, no workspace project/",    tag: "Onboard",  tagColor: "bg-orange-400 text-[#1d1b20]" },
];

function OpenPickerModal({ onClose, onSelect }: {
  onClose: () => void;
  onSelect: (id: ScenarioId) => void;
}) {
  const scenarios = [...FOLDER_SCENARIOS, ...WORKSPACE_SCENARIOS];
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={onClose}>
      <motion.div
        initial={{ scale: 0.96, y: 8 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.96, y: 8 }}
        transition={{ type: "spring", stiffness: 400, damping: 30 }}
        onClick={e => e.stopPropagation()}
        className="bg-[#1a1a1a] border border-white/8 rounded-[12px] shadow-2xl w-[520px] overflow-hidden"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
          <div className="flex items-center gap-2">
            <FolderOpen size={16} className="text-[#abefa3]" />
            <span className="font-['Rounded_Mplus_1c',sans-serif] text-[14px] text-white">
              Open Project Workspace
            </span>
          </div>
          <button onClick={onClose} className="text-[#555] hover:text-[#aaa] transition-colors"><X size={15} /></button>
        </div>
        <div className="px-4 py-3">
          <p className="font-['Rounded_Mplus_1c',sans-serif] text-[11px] text-[#555] mb-3 uppercase tracking-wider">Select a scenario to simulate</p>
          <div className="flex flex-col gap-2">
            {scenarios.map(s => (
              <button key={s.id} onClick={() => onSelect(s.id)}
                className="flex items-center gap-3 p-3.5 rounded-[8px] bg-[#252323] border border-white/5 hover:border-[#abefa3]/25 hover:bg-[#2a2828] transition-all text-left group">
                <div className="w-10 h-10 rounded-[6px] bg-[#1d1b20] border border-white/8 flex items-center justify-center shrink-0 text-[#abefa3]/60 group-hover:text-[#abefa3] transition-colors">
                  {s.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-mono text-[13px] text-white">{s.label}</p>
                  <p className="font-['Rounded_Mplus_1c',sans-serif] text-[11px] text-[#555] mt-0.5">{s.sublabel}</p>
                </div>
                <span className={`text-[10px] font-['Rounded_Mplus_1c',sans-serif] px-2 py-0.5 rounded-full shrink-0 ${s.tagColor}`}>{s.tag}</span>
              </button>
            ))}
          </div>
        </div>
        <div className="px-4 pb-4">
          <p className="font-['Rounded_Mplus_1c',sans-serif] text-[10px] text-[#444] text-center">In the real IDE, this opens a native file picker. Scenarios simulate different project states.</p>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── Loading / scanning view ────────────────────────────────────────────────

function LoadingView({ label }: { label: string }) {
  const steps = ["Reading folder structure…", "Searching for project/ folder…", "Checking package.json…", "Running mds doctor…"];
  const [step, setStep] = useState(0);
  useEffect(() => {
    if (step >= steps.length - 1) return;
    const t = setTimeout(() => setStep(s => s + 1), 600);
    return () => clearTimeout(t);
  }, [step]);

  return (
    <div className="size-full flex flex-col items-center justify-center bg-[#3d3b3b] gap-6">
      <div className="w-8 h-8 rounded-[6px] bg-[#abefa3]/12 border border-[#abefa3]/25 flex items-center justify-center">
        <InfinityIcon size={18} className="text-[#abefa3]" />
      </div>
      <div className="flex flex-col items-center gap-2">
        <p className="font-['Rounded_Mplus_1c',sans-serif] text-[14px] text-white">{label}</p>
        <div className="flex flex-col gap-1.5 mt-2 min-w-[260px]">
          {steps.map((s, i) => (
            <div key={i} className={`flex items-center gap-2 transition-all duration-300 ${i <= step ? "opacity-100" : "opacity-20"}`}>
              {i < step ? <CheckCircle2 size={12} className="text-[#abefa3] shrink-0" /> : i === step ? <div className="w-3 h-3 rounded-full border-2 border-[#abefa3] border-t-transparent animate-spin shrink-0" /> : <Circle size={12} className="text-[#444] shrink-0" />}
              <span className="font-mono text-[11px] text-[#888]">{s}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── App onboard view (no project folder in folder) ─────────────────────────

function AppOnboardView({ folderName, onComplete }: { folderName: string; onComplete: () => void; }) {
  const [messages, setMessages] = useState<Message[]>([
    { id: "1", role: "assistant", content: `No \`project/\` folder found in \`${folderName}\`. Running \`mds onboard\` will set up project memory files (Info.md, Todo.md, Style.md, Guidelines.md) and configure your agent context.` },
  ]);
  const [started, setStarted] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const startOnboard = () => {
    setStarted(true);
    const steps = [
      { delay: 600,  text: "Reading app.json and package.json…" },
      { delay: 1400, text: "Detected: Expo SDK 51, React Navigation, Supabase." },
      { delay: 2400, text: "What is the main purpose of this app? (I'll use this to set up your Info.md)" },
    ];
    steps.forEach(({ delay, text }) => {
      setTimeout(() => setMessages(ms => [...ms, { id: uid(), role: "assistant", content: text }]), delay);
    });
  };

  const handleSend = (text: string) => {
    setMessages(ms => [...ms, { id: uid(), role: "user", content: text }]);
    setTimeout(() => {
      setMessages(ms => [...ms, { id: uid(), role: "assistant", content: "Got it. Creating `project/` folder and writing memory files…" }]);
      setTimeout(() => {
        setMessages(ms => [...ms, { id: uid(), role: "assistant", content: "✓ Info.md  ✓ Todo.md  ✓ Style.md  ✓ Guidelines.md — project context ready. Opening workspace…" }]);
        setTimeout(onComplete, 1200);
      }, 1400);
    }, 700);
  };

  return (
    <div className="size-full flex flex-col bg-[#3d3b3b]">
      {/* Header bar */}
      <Header
        activeLevel="home"
        projectLabel={folderName}
        rightSlot={
          <div className="flex items-center gap-2 px-2.5 py-1 rounded-[5px] bg-orange-400/15 border border-orange-400/25">
            <div className="w-1.5 h-1.5 rounded-full bg-orange-400" />
            <span className="font-['Rounded_Mplus_1c',sans-serif] text-[11px] text-orange-400">No project folder</span>
          </div>
        }
      />

      <div className="flex-1 flex items-center justify-center p-8 min-h-0">
        <div className="w-full max-w-xl flex flex-col gap-4">
          {!started ? (
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-4">
              <div className="bg-[#252323] border border-white/8 rounded-[10px] p-6 flex flex-col gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-[8px] bg-orange-400/12 border border-orange-400/25 flex items-center justify-center">
                    <Folder size={18} className="text-orange-400" />
                  </div>
                  <div>
                    <p className="font-['Rounded_Mplus_1c',sans-serif] text-[14px] text-white">No project folder found</p>
                    <p className="font-['Rounded_Mplus_1c',sans-serif] text-[11px] text-[#555] mt-0.5">{folderName}</p>
                  </div>
                </div>
                <p className="font-['Rounded_Mplus_1c',sans-serif] text-[12px] text-[#888] leading-relaxed">
                  `mds onboard` will learn your app, then create <span className="text-[#abefa3] font-mono">project/Info.md</span>, <span className="text-[#abefa3] font-mono">Todo.md</span>, <span className="text-[#abefa3] font-mono">Style.md</span>, and <span className="text-[#abefa3] font-mono">Guidelines.md</span> — giving the agent full project context.
                </p>
                <button onClick={startOnboard}
                  className="mt-2 py-2.5 rounded-[8px] text-[13px] font-['Rounded_Mplus_1c',sans-serif] transition-all hover:opacity-90 flex items-center justify-center gap-2"
                  style={{ background: "#abefa3", color: "#1d1b20" }}>
                  <Stethoscope size={14} /> Run mds onboard
                </button>
              </div>
            </motion.div>
          ) : (
            <div className="flex flex-col h-[400px] bg-[#252323] border border-white/8 rounded-[10px] overflow-hidden">
              <div className="flex-1 overflow-auto p-4">
                {messages.map(m => (
                  <div key={m.id} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"} mb-2`}>
                    <div className={`max-w-[90%] rounded-[8px] px-3 py-2 text-[12px] font-['Rounded_Mplus_1c',sans-serif] leading-relaxed ${m.role === "user" ? "bg-[#abefa3] text-[#1d1b20]" : "bg-[#1d1b20] text-[#d9d9d9] border border-white/6"}`}>
                      {m.content}
                    </div>
                  </div>
                ))}
                <div ref={bottomRef} />
              </div>
              <OnboardInput onSend={handleSend} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Workspace onboard view (multi-repo, no workspace project folder) ────────

function WsOnboardView({ onComplete }: { onComplete: () => void }) {
  const repos = ["expo-photo-share", "mercury-bank-sdk", "shared-ui"];
  const [scanDone, setScanDone] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const t = setTimeout(() => {
      setScanDone(true);
      setMessages([
        { id: "1", role: "assistant", content: `Scanned workspace one level deep. Found ${repos.length} repos: \`${repos.join("\`, \`")}\`.` },
        { id: "2", role: "assistant", content: "This workspace spans multiple repos. Let me understand how they connect. Is `expo-photo-share` the primary user-facing app, or is this a monorepo where all three ship together?" },
      ]);
    }, 2800);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const handleSend = (text: string) => {
    setMessages(ms => [...ms, { id: uid(), role: "user", content: text }]);
    setTimeout(() => {
      if (messages.length < 4) {
        setMessages(ms => [...ms, { id: uid(), role: "assistant", content: "Got it. `expo-photo-share` is the app, `mercury-bank-sdk` is the payment API, and `shared-ui` is the component library. Creating workspace `project/` folder now…" }]);
        setTimeout(() => {
          setMessages(ms => [...ms, { id: uid(), role: "assistant", content: "✓ project/Info.md  ✓ project/Todo.md  ✓ project/Style.md  ✓ project/Guidelines.md — workspace context is ready. Opening IDE…" }]);
          setTimeout(onComplete, 1200);
        }, 1600);
      } else {
        setMessages(ms => [...ms, { id: uid(), role: "assistant", content: "Noted. Updating workspace context…" }]);
      }
    }, 700);
  };

  return (
    <div className="size-full flex flex-col bg-[#3d3b3b]">
      <Header
        activeLevel="home"
        projectLabel="monorepo"
        rightSlot={
          <div className="flex items-center gap-2 px-2.5 py-1 rounded-[5px] bg-blue-400/15 border border-blue-400/25">
            <div className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
            <span className="font-['Rounded_Mplus_1c',sans-serif] text-[11px] text-blue-400">Workspace onboard</span>
          </div>
        }
      />

      <div className="flex-1 flex items-center justify-center p-8 min-h-0">
        <div className="w-full max-w-xl flex flex-col gap-4">
          {!scanDone ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col gap-3 items-center">
              <p className="font-['Rounded_Mplus_1c',sans-serif] text-[14px] text-white">Scanning workspace…</p>
              <div className="flex flex-col gap-2 mt-2">
                {repos.map((r, i) => (
                  <motion.div key={r} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.5 + 0.4 }}
                    className="flex items-center gap-2 px-4 py-2 bg-[#252323] rounded-[6px] border border-white/5">
                    <Folder size={13} className="text-[#abefa3]/60" />
                    <span className="font-mono text-[12px] text-[#c5c5c5]">{r}</span>
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.5 + 0.9 }}>
                      <CheckCircle2 size={12} className="text-[#abefa3] ml-auto" />
                    </motion.div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          ) : (
            <div className="flex flex-col h-[420px] bg-[#252323] border border-white/8 rounded-[10px] overflow-hidden">
              <div className="flex-1 overflow-auto p-4">
                {messages.map(m => (
                  <div key={m.id} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"} mb-2`}>
                    <div className={`max-w-[90%] rounded-[8px] px-3 py-2 text-[12px] font-['Rounded_Mplus_1c',sans-serif] leading-relaxed ${m.role === "user" ? "bg-[#abefa3] text-[#1d1b20]" : "bg-[#1d1b20] text-[#d9d9d9] border border-white/6"}`}>
                      {m.content}
                    </div>
                  </div>
                ))}
                <div ref={bottomRef} />
              </div>
              <OnboardInput onSend={handleSend} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Super Stack generator ──────────────────────────────────────────────────

function SuperStackView({ onComplete }: { onComplete: () => void }) {
  const [messages, setMessages] = useState<Message[]>([
    { id: "1", role: "assistant", content: "Welcome to `create-expo-super-stack`! I'll scaffold a production-ready Expo app with your preferred stack. First — what's the app idea?" },
  ]);
  const [step, setStep] = useState(0);
  const bottomRef = useRef<HTMLDivElement>(null);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const responses = [
    "Great concept. Recommended stack: Expo Router, Supabase (auth + database), Zustand, Tailwind (Uniwind), React Query. Does that sound right?",
    "Perfect. Where should I create the project? (e.g. `~/SoftwareDev/`)  — defaults to current directory.",
    "Running `npx create-expo-super-stack photo-share-app`… scaffolding with MDS defaults, applying project memory, configuring Supabase…",
  ];

  const handleSend = (text: string) => {
    setMessages(ms => [...ms, { id: uid(), role: "user", content: text }]);
    const reply = responses[step] || "Done! Opening your new project…";
    setTimeout(() => {
      setMessages(ms => [...ms, { id: uid(), role: "assistant", content: reply }]);
      if (step >= responses.length - 1) setTimeout(onComplete, 1800);
      setStep(s => s + 1);
    }, 700);
  };

  return (
    <div className="size-full flex flex-col bg-[#3d3b3b]">
      <Header
        activeLevel="home"
        projectLabel="Super Stack"
        rightSlot={
          <div className="px-2.5 py-1 rounded-[5px] bg-[#abefa3]/15 border border-[#abefa3]/25 flex items-center gap-1.5">
            <Zap size={11} className="text-[#abefa3]" />
            <span className="font-['Rounded_Mplus_1c',sans-serif] text-[11px] text-[#abefa3]">Super Stack</span>
          </div>
        }
      />
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-xl flex flex-col gap-3">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-[8px] bg-[#abefa3]/12 border border-[#abefa3]/25 flex items-center justify-center">
              <Zap size={18} className="text-[#abefa3]" />
            </div>
            <div>
              <p className="font-['Rounded_Mplus_1c',sans-serif] text-[14px] text-white">Generate with Super Stack</p>
              <p className="font-['Rounded_Mplus_1c',sans-serif] text-[11px] text-[#555]">create-expo-super-stack · powered by mrdj-dev-suite</p>
            </div>
          </div>
          <div className="flex flex-col h-[380px] bg-[#252323] border border-white/8 rounded-[10px] overflow-hidden">
            <div className="flex-1 overflow-auto p-4">
              {messages.map(m => (
                <div key={m.id} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"} mb-2`}>
                  <div className={`max-w-[90%] rounded-[8px] px-3 py-2 text-[12px] font-['Rounded_Mplus_1c',sans-serif] leading-relaxed ${m.role === "user" ? "bg-[#abefa3] text-[#1d1b20]" : "bg-[#1d1b20] text-[#d9d9d9] border border-white/6"}`}>
                    {m.content}
                  </div>
                </div>
              ))}
              <div ref={bottomRef} />
            </div>
            <OnboardInput onSend={handleSend} />
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Shared onboard input ───────────────────────────────────────────────────

function OnboardInput({ onSend }: { onSend: (t: string) => void }) {
  const [v, setV] = useState("");
  const send = () => { if (!v.trim()) return; onSend(v.trim()); setV(""); };
  return (
    <div className="px-3 py-3 border-t border-white/5 flex gap-2 shrink-0">
      <input value={v} onChange={e => setV(e.target.value)}
        onKeyDown={e => { if (e.key === "Enter") send(); }}
        placeholder="Reply…"
        className="flex-1 bg-[#1d1b20] border border-white/10 rounded-[6px] px-3 py-2 text-[12px] font-['Rounded_Mplus_1c',sans-serif] text-white placeholder-[#444] focus:outline-none focus:border-[#abefa3]/35 transition-colors" />
      <button onClick={send} className="w-8 h-8 rounded-[6px] bg-[#abefa3] text-[#1d1b20] flex items-center justify-center hover:bg-[#8de085] transition-colors">
        <Send size={13} />
      </button>
    </div>
  );
}

// ─── Shared canvas backdrop (auth / pricing) ───────────────────────────────

function I2Canvas({ children }: { children: React.ReactNode }) {
  return (
    <div className="size-full flex flex-col relative overflow-hidden" style={{ background: "#0a0814" }}>
      <AnimatedGlows />
      <div className="relative z-10 flex-1 min-h-0 flex flex-col">{children}</div>
    </div>
  );
}

// ─── Auth screen ────────────────────────────────────────────────────────────

function AuthScreen({ onSignIn, onSignUp }: { onSignIn: () => void; onSignUp: () => void }) {
  return (
    <I2Canvas>
      <div className="flex-1 flex flex-col items-center justify-center px-6">
        <div className="flex flex-col items-center gap-2 mb-8">
          <I2Logo size={44} />
          <p style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 14, color: "rgba(255,255,255,0.35)", marginTop: 6 }}>Infinite Intelligence</p>
        </div>

        <div className="w-full max-w-[380px] flex flex-col gap-4" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 20, padding: 28 }}>
          <p style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 20, fontWeight: 600, color: "#fff" }}>Welcome back</p>

          <div className="flex flex-col gap-3 mt-1">
            <input placeholder="you@studio.dev" defaultValue="dev@i2.app"
              className="w-full bg-white/[0.04] border border-white/10 rounded-[10px] px-3.5 py-2.5 text-[13px] text-white placeholder-white/25 focus:outline-none focus:border-[#2dd4bf]/40 transition-colors"
              style={{ fontFamily: "'Rounded Mplus 1c',sans-serif" }} />
            <input type="password" placeholder="Password" defaultValue="password"
              className="w-full bg-white/[0.04] border border-white/10 rounded-[10px] px-3.5 py-2.5 text-[13px] text-white placeholder-white/25 focus:outline-none focus:border-[#2dd4bf]/40 transition-colors"
              style={{ fontFamily: "'Rounded Mplus 1c',sans-serif" }} />
          </div>

          <button onClick={onSignIn}
            className="w-full flex items-center justify-center gap-2 transition-opacity hover:opacity-90 mt-1"
            style={{ padding: "12px", borderRadius: 10, background: "#2dd4bf", fontFamily: "'Space Grotesk',sans-serif", fontSize: 14, fontWeight: 600, color: "#06201d" }}>
            Sign In <ArrowRight size={15} />
          </button>

          <div className="flex items-center gap-3 my-1">
            <div className="flex-1 border-t border-white/8" />
            <span style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 11, color: "rgba(255,255,255,0.25)" }}>new to i2?</span>
            <div className="flex-1 border-t border-white/8" />
          </div>

          <button onClick={onSignUp}
            className="w-full flex items-center justify-center gap-2 transition-all hover:bg-white/[0.06] hover:border-white/20"
            style={{ padding: "12px", borderRadius: 10, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", fontFamily: "'Space Grotesk',sans-serif", fontSize: 14, color: "rgba(255,255,255,0.8)" }}>
            Create an account
          </button>
        </div>
      </div>
    </I2Canvas>
  );
}

// ─── Pricing screen ─────────────────────────────────────────────────────────

interface PricingTier {
  name: string; price: string; cadence?: string; blurb: string;
  bullets: string[]; cta: string; featured?: boolean;
}

const PERSONAL_TIERS: PricingTier[] = [
  { name: "Free", price: "$0", cadence: "/mo", blurb: "Explore the agentic IDE", cta: "Start free",
    bullets: ["1 active session", "Infie orchestration (basic)", "Community Library access", "Local emulators"] },
  { name: "Premium", price: "$100", cadence: "/mo", blurb: "For serious solo builders", featured: true, cta: "Choose Premium",
    bullets: ["Up to 8 parallel sessions", "Full Infie orchestration", "Private Library + conflict resolution", "Priority model routing", "PR lifecycle automation"] },
  { name: "Pro", price: "$200", cadence: "/mo", blurb: "Maximum throughput", cta: "Choose Pro",
    bullets: ["Unlimited sessions", "Advanced multi-agent workflows", "Custom project memory", "Cloud emulators + logs", "Priority support"] },
];

const BUSINESS_TIERS: PricingTier[] = [
  { name: "Team", price: "$500", cadence: "/mo", blurb: "Shared orchestration for squads", featured: true, cta: "Choose Team",
    bullets: ["Everything in Pro", "Up to 10 seats", "Shared Library + design system", "Org-wide project memory", "Role-based access"] },
  { name: "Enterprise", price: "Contact us", blurb: "Scale across your org", cta: "Contact sales",
    bullets: ["Unlimited seats", "SSO / SAML", "Dedicated infrastructure", "Security review + audit logs", "SLA + solutions engineering"] },
];

function PricingCard({ tier, onSelect }: { tier: PricingTier; onSelect: () => void }) {
  const border = tier.featured ? "1px solid rgba(45,212,191,0.4)" : "1px solid rgba(81,79,110,0.5)";
  const bg = tier.featured ? "rgba(45,212,191,0.06)" : "rgba(4,0,28,0.6)";
  const accent = "#2dd4bf";
  return (
    <div style={{
      backdropFilter: "blur(10px)", background: bg, borderRadius: 22, border,
      padding: "28px 26px", display: "flex", flexDirection: "column", gap: 20,
      flex: 1, minWidth: 240, maxWidth: 340, position: "relative",
    }}>
      {tier.featured && (
        <span style={{ position: "absolute", top: -11, left: 26, background: accent, color: "#06201d", fontFamily: "'Space Grotesk',sans-serif", fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 100 }}>
          ✦ Most popular
        </span>
      )}
      <div className="flex flex-col gap-2">
        <p style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 16, fontWeight: 600, color: "#fff" }}>{tier.name}</p>
        <div className="flex items-baseline gap-1">
          <span style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 34, fontWeight: 700, color: "#fff", letterSpacing: "-0.03em" }}>{tier.price}</span>
          {tier.cadence && <span style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 13, color: "rgba(255,255,255,0.35)" }}>{tier.cadence}</span>}
        </div>
        <p style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 13, color: "rgba(160,163,189,1)" }}>{tier.blurb}</p>
      </div>

      <button onClick={onSelect}
        className="w-full flex items-center justify-center gap-2 transition-opacity hover:opacity-90"
        style={{
          padding: "11px", borderRadius: 10, fontFamily: "'Space Grotesk',sans-serif", fontSize: 13, fontWeight: 600,
          background: tier.featured ? accent : "rgba(255,255,255,0.05)",
          color: tier.featured ? "#06201d" : "rgba(255,255,255,0.85)",
          border: tier.featured ? "none" : "1px solid rgba(255,255,255,0.12)",
        }}>
        {tier.cta}
      </button>

      <div style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }} />

      <div className="flex flex-col gap-2.5">
        {tier.bullets.map(b => (
          <div key={b} className="flex items-center gap-2.5">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <circle cx="7" cy="7" r="7" fill="rgba(45,212,191,0.12)" />
              <path d="M4.5 7L6.2 8.7L9.5 5.3" stroke={accent} strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 13, color: "rgba(255,255,255,0.65)" }}>{b}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function PricingScreen({
  onSelectTier,
  onBack,
}: {
  onSelectTier: (tier: PricingTier) => void;
  onBack: () => void;
}) {
  const [audience, setAudience] = useState<"personal" | "business">("personal");
  const tiers = audience === "personal" ? PERSONAL_TIERS : BUSINESS_TIERS;

  return (
    <I2Canvas>
      {/* Top chrome */}
      <div className="flex items-center px-6 shrink-0" style={{ height: 54, borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <I2Logo size={30} />
        <button onClick={onBack} className="ml-auto flex items-center gap-1.5 text-white/40 hover:text-white/70 transition-colors" style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 13 }}>
          <ChevronLeft size={15} /> Back
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-5xl mx-auto w-full px-8 py-12 flex flex-col items-center">
          <p style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 32, fontWeight: 700, color: "#fff", letterSpacing: "-0.02em", textAlign: "center" }}>
            Choose your plan
          </p>
          <p style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 15, color: "rgba(255,255,255,0.4)", marginTop: 8, textAlign: "center" }}>
            Start free and scale your orchestration as you grow.
          </p>

          {/* Audience toggle */}
          <div className="flex items-center gap-0.5 mt-7 p-0.5" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 100 }}>
            {(["personal", "business"] as const).map(a => (
              <button key={a} onClick={() => setAudience(a)}
                style={{
                  padding: "7px 22px", borderRadius: 100, fontFamily: "'Space Grotesk',sans-serif", fontSize: 13, fontWeight: 500,
                  textTransform: "capitalize", transition: "all 0.15s",
                  background: audience === a ? "#2dd4bf" : "transparent",
                  color: audience === a ? "#06201d" : "rgba(255,255,255,0.5)",
                }}>{a}</button>
            ))}
          </div>

          {/* Tier cards */}
          <div className="flex gap-5 items-stretch justify-center flex-wrap mt-10 w-full">
            {tiers.map(t => (
              <PricingCard key={t.name} tier={t} onSelect={() => onSelectTier(t)} />
            ))}
          </div>
        </div>
      </div>
    </I2Canvas>
  );
}

// ─── Root ───────────────────────────────────────────────────────────────────

export default function App() {
  const initialQueryBeat = (() => {
    if (typeof window === "undefined") return undefined;
    const params = new URLSearchParams(window.location.search);
    const b = params.get("beat") as OnboardingBeat | null;
    if (b && BEAT_ORDER.includes(b)) return b;
    if (params.get("onboarding") === "1") return "B00" as OnboardingBeat;
    return undefined;
  })();
  return (
    <OnboardingProvider initialBeat={initialQueryBeat ?? "COMPLETE"}>
      <TutorialProvider>
        <PersistentAppShell />
      </TutorialProvider>
    </OnboardingProvider>
  );
}

function PersistentAppShell() {
  const {
    onboardingRunId,
    currentBeat,
    turnIndex,
    setTurnIndex,
    b00GateCompleted,
    isTutorialActive,
    isTutorialComplete,
    level,
    levelUpFlourish,
    levelUpStage,
    isRevealed,
    advanceBeat,
    startOnboarding,
    completeOnboarding,
  } = useOnboarding();

  const tutorial = useTutorial();
  const { setOnJennyCompletedCallback, createProject } = tutorial;
  useEffect(() => {
    setOnJennyCompletedCallback(() => {
      createProject();
      setActiveProjectId(EXPERIMEMO_PROJECT_ID);
      setActiveSessionId(null);
      setRoute("project");
    });
  }, [setOnJennyCompletedCallback, createProject]);

  const [musicOutcome, setMusicOutcome] = useState<"none" | "played" | "quiet">("none");
  // Infie's button-press beat, bumped synchronously by the music Play button.
  const [playPressNonce, setPlayPressNonce] = useState(0);
  // The first of {real playback outcome, Continue} resolves B05 exactly once.
  const b05ResolvedRef = useRef(false);
  useEffect(() => { b05ResolvedRef.current = false; }, [onboardingRunId]);

  // ── App phase gate (auth → pricing → app) ────────────────────────────────
  const [appPhase, setAppPhase] = useState<"auth" | "pricing" | "app">(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("beat") || params.get("onboarding") === "1") {
        return "app";
      }
    }
    return "auth";
  });

  // ── Workspace state machine ──────────────────────────────────────────────
  const [wsState, setWsState] = useState<WorkspaceState>("none");
  const [pickerOpen, setPickerOpen] = useState(false);

  // ── Prototype router (home → project → session) ──────────────────────────
  const [route, setRoute] = useState<"home" | "project" | "session">("home");
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [scopeNotice, setScopeNotice] = useState<string | null>(null);
  const [playgroundOpen, setPlaygroundOpen] = useState(false);
  const [supportFrameworkModalOpen, setSupportFrameworkModalOpen] = useState(false);

  // Experimemo records exist only after Jenny completes (project) and Start Session (session).
  const experimemoProject = tutorial.projectCreated
    ? buildExperimemoProject(tutorial.sessionStarted ? 1 : 0)
    : null;
  const allProjects = experimemoProject ? [experimemoProject, ...PROTOTYPE_PROJECTS] : PROTOTYPE_PROJECTS;
  const allSessions = tutorial.sessionStarted ? [EXPERIMEMO_SESSION, ...PROTOTYPE_SESSIONS] : PROTOTYPE_SESSIONS;
  const activeProject =
    (activeProjectId === TUTORIAL_DEMO_PROJECT.id
      ? TUTORIAL_DEMO_PROJECT
      : allProjects.find(p => p.id === activeProjectId)) ?? null;
  const activeSession = allSessions.find(s => s.id === activeSessionId) ?? null;

  // Guard every retained id: if the tutorial-owned records vanish (reset, regenerate), leave their routes.
  useEffect(() => {
    if (activeProjectId === EXPERIMEMO_PROJECT_ID && !tutorial.projectCreated) {
      setActiveProjectId(null);
      setActiveSessionId(null);
      setRoute("home");
    } else if (activeSessionId === EXPERIMEMO_SESSION_ID && !tutorial.sessionStarted) {
      setActiveSessionId(null);
      setRoute(r => (r === "session" ? "project" : r));
    }
  }, [activeProjectId, activeSessionId, tutorial.projectCreated, tutorial.sessionStarted]);

  const goHome = () => {
    setRoute("home");
    if (currentBeat === "B19") {
      // Leaving the tutorial's demo project: Home's breadcrumbs go back to the plain
      // "Project" / "Session" labels (demo records are released at the end anyway).
      setActiveProjectId(null);
      setActiveSessionId(null);
      advanceBeat("B20");
    }
  };
  const openProjectHome = (p: ProtoProject) => {
    setActiveProjectId(p.id);
    setRoute("project");
    if (currentBeat === "B12") {
      advanceBeat("B13");
    }
  };
  const openSession = (s: ProtoSession, opts?: { justStarted?: boolean }) => {
    if (currentBeat === "B12" || currentBeat === "B13") {
      return;
    }
    // The Experimemo session cannot be opened by any path until Start Session created it.
    if (s.id === EXPERIMEMO_SESSION_ID && !tutorial.sessionStarted && !opts?.justStarted) {
      return;
    }
    setActiveProjectId(activeProjectId === TUTORIAL_DEMO_PROJECT.id ? TUTORIAL_DEMO_PROJECT.id : s.projectId);
    setActiveSessionId(s.id);
    setRoute("session");
    if (currentBeat === "B14") {
      advanceBeat("B15");
    }
  };
  const openSessionById = (id: string) => { const s = allSessions.find(x => x.id === id); if (s) openSession(s); };
  const [openedLabel, setOpenedLabel] = useState("expo-photo-share");
  const [projectType, setProjectType] = useState<ProjectType>(() => {
    return (localStorage.getItem("agentide-project-type") as ProjectType) ?? "expo";
  });
  const handleProjectTypeChange = (v: ProjectType) => {
    setProjectType(v);
    localStorage.setItem("agentide-project-type", v);
  };

  const handleOpenProject = () => setPickerOpen(true);

  const handleScenario = (id: ScenarioId) => {
    setPickerOpen(false);
    setWsState("loading");
    const labels: Record<ScenarioId, string> = {
      "app-found":   "expo-photo-share/",
      "app-onboard": "my-new-app/",
      "ws-found":    "portfolio.code-workspace",
      "ws-onboard":  "monorepo.code-workspace",
    };
    setOpenedLabel(labels[id]);
    setTimeout(() => setWsState(id), 2600);
  };

  // ── IDE state ────────────────────────────────────────────────────────────
  const [activeScreen, setActiveScreen] = useState<ActiveScreen>("screen1");
  const [phase, setPhase] = useState<SessionPhase>("start");
  const [goal, setGoal] = useState("Add feature: ability to send photos to friends");
  const [messages, setMessages] = useState<Message[]>(INIT_MESSAGES);
  const [agentTasks, setAgentTasks] = useState<CheckItem[]>(INIT_AGENT_TASKS);
  const [humanTests, setHumanTests] = useState<CheckItem[]>(INIT_HUMAN_TESTS);
  const [diffs] = useState<DiffFile[]>(INIT_DIFFS);
  const [emuConnected, setEmuConnected] = useState(false);
  const [actionStage, setActionStage] = useState<ActionStage>("default");
  const [tree] = useState<FileNode[]>(WORKSPACE_TREE);

  // ── Global To-Do state ───────────────────────────────────────────────────
  const [globalTodos, setGlobalTodos] = useState<GlobalTodoItem[]>(INIT_GLOBAL_TODOS);
  const toggleGlobalTodo = useCallback((id: string) => {
    setGlobalTodos(items => items.map(i => i.id === id ? { ...i, done: !i.done } : i));
  }, []);
  const addGlobalTodo = useCallback((text: string, category: "project" | "general", projectId?: string, projectName?: string, sessionId?: string) => {
    setGlobalTodos(items => [...items, { id: `gt-${uid()}`, text, done: false, category, projectId, projectName, sessionId }]);
  }, []);
  const deleteGlobalTodo = useCallback((id: string) => {
    setGlobalTodos(items => items.filter(i => i.id !== id));
  }, []);

  type ModalState =
    | { kind: "standard"; id: WidgetId; label: string; fullscreen: boolean }
    | { kind: "emulator"; id: WidgetId };
  const [modal, setModal] = useState<ModalState | null>(null);
  const [widgetsGalleryOpen, setWidgetsGalleryOpen] = useState(false);
  const [rootModal, setRootModal] = useState<ModalState | null>(null);
  // Project/Session right-column slot where the bordered music widget renders.
  const [musicSlotEl, setMusicSlotEl] = useState<HTMLDivElement | null>(null);

  // B18 Turn 1: the tutorial opens the header Widgets gallery (Library highlighted)
  // and closes it again when the beat moves on (only if the tutorial opened it).
  const isTutorialGalleryTurn = isTutorialActive && currentBeat === "B18" && turnIndex === 1;
  const tutorialOpenedGalleryRef = useRef(false);
  useEffect(() => {
    if (isTutorialGalleryTurn) {
      const t = window.setTimeout(() => {
        tutorialOpenedGalleryRef.current = true;
        setWidgetsGalleryOpen(true);
      }, B18_GALLERY_OPEN_DELAY_MS);
      return () => window.clearTimeout(t);
    }
    if (tutorialOpenedGalleryRef.current) {
      tutorialOpenedGalleryRef.current = false;
      setWidgetsGalleryOpen(false);
    }
  }, [isTutorialGalleryTurn]);

  const openRootWidget = useCallback((id: WidgetId, label: string) => {
    const emuIds: WidgetId[] = ["emuWeb", "emuAndroid", "emuIos"];
    if (emuIds.includes(id)) {
      setRootModal({ kind: "emulator", id });
    } else {
      setRootModal({ kind: "standard", id, label, fullscreen: false });
    }
  }, []);

  const [danceNonce, setDanceNonce] = useState(0);
  const triggerInfieDance = useCallback(() => {
    setDanceNonce((n) => n + 1);
  }, []);

  const handleOpenNotifications = useCallback(() => {
    openRootWidget("globalTodo", "Global To-Do");
  }, [openRootWidget]);

  const sendMessage = useCallback((text: string) => {
    setMessages(ms => [...ms, { id: uid(), role: "user", content: text }]);
    setTimeout(() => {
      let reply = "On it.";
      if (text === "/run-doctor") reply = "Running `mds doctor`… ✓ Project memory ✓ package.json ✓ Expo config ✗ Missing `expo.scheme` in app.json.";
      else if (text === "/ship-test") reply = "Running `mds ship test`… doctor → git status → commit → push → PR → polling CI…";
      else if (text === "/wrap-up") { reply = "Wrapping up session. Summarising changes, updating Todo.md…"; setPhase("wrapup"); }
      else if (text === "/commit") reply = "Staged: camera.tsx, PhotoPicker.tsx, FriendList.tsx. Suggested: `feat: add photo sharing to friends`";
      else if (text === "/open-pr") reply = "Opening PR to `test` branch… PR #47 created: ‘feat: add photo sharing to friends’";
      else if (text === "/continue") { reply = "Continuing the current goal. I’ll work through the task list, then wait for testing to complete."; setActionStage("working"); }
      else if (text === "/review") reply = "Reviewing current diffs against project guidelines and the active goal.";
      else if (text === "/create-expo-super-stack") reply = "Starting `create-expo-super-stack`… What’s the app idea? I’ll recommend a stack.";
      else if (text === "/mds-onboard") reply = "Running `mds onboard`… reading app.json and package.json…";
      else if (text === "/clear-expo-start") reply = "Killing Expo ports, clearing Metro cache… running `npx expo start --clear`.";
      else if (text === "/eas-build-ios") reply = "Running `eas build --platform ios`… queued on EAS servers.";
      else if (text === "/eas-build-android") reply = "Running `eas build --platform android`… queued on EAS servers.";
      else if (text === "/eas-build-preview") reply = "Running `eas build --profile preview`… building internal distribution.";
      else if (text === "/eas-submit") reply = "Running `eas submit`… connecting to App Store Connect.";
      else if (text === "/eas-update") reply = "Running `eas update`… pushing OTA update to production channel.";
      else if (text === "/start-tunnel") reply = "Starting Expo with tunnel… `npx expo start --tunnel`. Share the QR code with your device.";
      else if (text === "/export-web") reply = "Running `expo export --platform web`… output will be in `dist/`.";
      else if (text === "/type-check") reply = "Running `npx tsc --noEmit`… checking types across the project.";
      else if (text === "/install-deps") reply = "Running `npm install`… syncing dependencies from package.json.";
      else if (text.startsWith("Opening session")) reply = "Loading session into the conversation window…";
      else if (text.startsWith("Switching project")) reply = "Switching workspace context and loading session…";
      else if (text.startsWith("Assigning session")) reply = "Session assigned to this project and loaded.";
      setMessages(ms => [...ms, { id: uid(), role: "assistant", content: reply }]);
    }, 500);
  }, []);

  const ctx: AppContext = {
    tree, goal, phase,
    currentProject: CURRENT_PROJECT,
    agentTasks,
    toggleAgentTask: id => setAgentTasks(ts => ts.map(t => t.id === id ? { ...t, done: !t.done } : t)),
    addAgentTask: text => setAgentTasks(ts => [...ts, { id: uid(), text, done: false }]),
    deleteAgentTask: id => setAgentTasks(ts => ts.filter(t => t.id !== id)),
    humanTests,
    toggleHumanTest: id => setHumanTests(ts => ts.map(t => t.id === id ? { ...t, done: !t.done } : t)),
    addHumanTest: text => setHumanTests(ts => [...ts, { id: uid(), text, done: false }]),
    deleteHumanTest: id => setHumanTests(ts => ts.filter(t => t.id !== id)),
    diffs, emuConnected,
    sendMessage,
    globalTodos,
    toggleGlobalTodo,
    addGlobalTodo,
    deleteGlobalTodo,
    onNavigateProject: (pId: string) => {
      setModal(null);
      setRootModal(null);
      setWidgetsGalleryOpen(false);
      const prj = allProjects.find(p => p.id === pId);
      if (prj) openProjectHome(prj);
    },
  };

  const rootCtx: AppContext = {
    tree: WORKSPACE_TREE,
    goal: "Dual-Screen IDE Active Workspace",
    phase: "active",
    currentProject: activeProject?.name || "expo-photo-share",
    agentTasks: INIT_AGENT_TASKS,
    toggleAgentTask: () => {},
    addAgentTask: () => {},
    deleteAgentTask: () => {},
    humanTests: INIT_HUMAN_TESTS,
    toggleHumanTest: () => {},
    addHumanTest: () => {},
    deleteHumanTest: () => {},
    diffs: INIT_DIFFS,
    emuConnected: false,
    sendMessage: () => {},
    globalTodos,
    toggleGlobalTodo,
    addGlobalTodo,
    deleteGlobalTodo,
    onNavigateProject: (pId: string) => {
      setRootModal(null);
      setWidgetsGalleryOpen(false);
      const prj = allProjects.find(p => p.id === pId);
      if (prj) openProjectHome(prj);
    },
  };

  const openModal = useCallback((id: WidgetId, label: string) => setModal({ kind: "standard", id, label, fullscreen: false }), []);
  const openFullscreen = useCallback((id: WidgetId, label: string) => setModal({ kind: "standard", id, label, fullscreen: true }), []);
  const openEmuModal = useCallback((id: WidgetId) => setModal({ kind: "emulator", id }), []);
  const openEmuFullscreen = useCallback((id: WidgetId) => setModal({ kind: "emulator", id }), []);
  const openWidgetFromPicker = useCallback((w: WidgetDef) => {
    const emuIds: WidgetId[] = ["emuWeb","emuAndroid","emuIos"];
    if (emuIds.includes(w.id)) setModal({ kind: "emulator", id: w.id });
    else setModal({ kind: "standard", id: w.id, label: w.label, fullscreen: false });
  }, []);

  const appRunning = emuConnected;
  const allChecksComplete = agentTasks.every(t => t.done) && humanTests.every(t => t.done);
  useEffect(() => { if (actionStage === "working" && allChecksComplete) setActionStage("wrapup"); }, [actionStage, allChecksComplete]);

  const startApp = useCallback(() => { setEmuConnected(true); setPhase("active"); }, []);
  const restartApp = useCallback(() => { setEmuConnected(false); window.setTimeout(() => { setEmuConnected(true); setPhase("active"); }, 220); }, []);
  const stopApp = useCallback(() => { setEmuConnected(false); setPhase("start"); }, []);

  const actionButtons: ActionButtonDef[] = actionStage === "default"
    ? [
        { label: "Continue", icon: <Zap size={11} />, accent: true, cmd: "/continue" },
        { label: "Review",   icon: <Zap size={11} />, cmd: "/review" },
      ]
    : actionStage === "wrapup"
      ? [{ label: "Wrap-Up", icon: <Zap size={11} />, accent: true, cmd: "/wrap-up" }]
      : [];

  // ── Full IDE render ──────────────────────────────────────────────────────
  const ide = (
    <div className="size-full flex flex-col bg-[#3d3b3b] overflow-hidden">
      <TopBar activeScreen={activeScreen} appRunning={appRunning} onScreenChange={setActiveScreen} onStartApp={startApp} onRestartApp={restartApp} onStopApp={stopApp} onHome={() => setWsState("none" as any)} />

      <div className="flex-1 flex overflow-hidden min-h-0">
        <AnimatePresence mode="wait">
          {activeScreen === "screen1" ? (
            <motion.div key="s1" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.12 }}
              className="flex-1 flex gap-2.5 p-2.5 overflow-hidden min-h-0">
              <LeftColumn ctx={ctx} setGoal={setGoal} openModal={openModal} openFullscreen={openFullscreen} />
              <ChatSection messages={messages} phase={phase} onSend={sendMessage} appRunning={appRunning} onStartApp={startApp} onRestartApp={restartApp} onStopApp={stopApp} actionButtons={actionButtons} />
              <RightColumn ctx={ctx} openModal={openModal} openFullscreen={openFullscreen} openWidgetFromPicker={openWidgetFromPicker} />
            </motion.div>
          ) : (
            <motion.div key="s2" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.12 }}
              className="flex-1 flex flex-col overflow-hidden min-h-0">
              {/* Toolbar */}
              <div className="h-9 bg-[#252323] border-b border-white/5 flex items-center px-4 gap-3 shrink-0">
                <span className="font-['Rounded_Mplus_1c',sans-serif] text-[11px] text-[#444] uppercase tracking-wider">Emulator Canvas</span>
                <div className="flex items-center gap-1.5 ml-2">
                  <div className={`w-1.5 h-1.5 rounded-full ${emuConnected ? "bg-[#abefa3]" : "bg-[#444]"}`} />
                  <span className="font-['Rounded_Mplus_1c',sans-serif] text-[11px] text-[#555]">
                    {emuConnected ? "App running · port 8081" : "Waiting for app…"}
                  </span>
                </div>
                <button onClick={() => setEmuConnected(c => !c)}
                  className="ml-auto text-[11px] font-['Rounded_Mplus_1c',sans-serif] px-3 py-1 rounded bg-[#1d1b20] text-[#777] hover:text-white border border-white/8 transition-colors">
                  {emuConnected ? "Disconnect" : "Simulate Connect"}
                </button>
              </div>
              {/* Canvas — fills remaining height, no scrollbars */}
              <EmulatorCanvas connected={emuConnected} openEmuModal={openEmuModal} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <StatusBar phase={phase} branch="feature/photo-share" />

      <AnimatePresence>
        {modal?.kind === "emulator" && (
          <EmulatorModal
            key="emu"
            id={modal.id}
            onClose={() => setModal(null)}
            activeProjectId={activeProjectId}
            previewVersion={tutorial.previewVersion}
          />
        )}
        {modal?.kind === "standard" && <WidgetModal key="std" id={modal.id} label={modal.label} fullscreen={modal.fullscreen} onClose={() => setModal(null)} ctx={ctx} />}
      </AnimatePresence>
    </div>
  );

  // ── App phase gate: auth / pricing shown before the workspace router ──────
  if (appPhase === "auth") {
    return (
      <div className="size-full overflow-hidden">
        <AuthScreen
          onSignIn={() => {
            completeOnboarding();
            setAppPhase("app");
          }}
          onSignUp={() => setAppPhase("pricing")}
        />
      </div>
    );
  }
  if (appPhase === "pricing") {
    return (
      <div className="size-full overflow-hidden">
        <PricingScreen
          onSelectTier={() => {
            setMusicOutcome("none");
            setRoute("home");
            setWsState("none");
            startOnboarding();
            setAppPhase("app");
          }}
          onBack={() => setAppPhase("auth")}
        />
      </div>
    );
  }

  const isB00Blackout = currentBeat === "B00";
  // Ambient i² background: pure black at B00, a little more of the normal background
  // with every beat, fully normal from B12 (Home) on and outside the tutorial.
  const ambientProgress = isTutorialActive ? ambientProgressForBeat(currentBeat) : 1;
  const levelLabel = `Lvl. ${level}`;
  const showLevelIndicator = isRevealed("level_indicator");
  const showHeaderBreadcrumbs = isRevealed("header_breadcrumbs");
  const showHeaderTutorialsWidgetsGames = isRevealed("header_tutorials_widgets_games");
  const showHeaderNotificationsSettings = isRevealed("header_notifications_settings");
  const showHeaderControls = isRevealed("home_header_controls");
  const showTutorialsEntry = isRevealed("tutorials_entry");
  const showConversationEntry = isRevealed("home_conversation_entry");
  const showResumeProjects = isRevealed("home_resume_projects") || isTutorialComplete;
  const showNewImportButtons = isRevealed("home_new_import_buttons") || isTutorialComplete;
  const showHomeActionButtons = isRevealed("home_action_buttons") || isTutorialComplete;
  const showProjectsAndActions = isRevealed("home_projects_and_actions");
  const showTutorialDemoProject = isRevealed("tutorial_demo_project");
  const showMusicPlayOnly = isRevealed("music_play_only");
  const showMusicFullPlayer = isRevealed("music_full_player");
  const showWidgetMoveResize = isRevealed("widget_move_resize");
  const showProjectNavigation = isRevealed("project_navigation") || showHeaderControls;
  const showProjectRoadmapSessions = isRevealed("project_roadmap_sessions");
  const showSessionTaskGroups = isRevealed("session_task_groups");
  const showSessionPrStatus = isRevealed("session_pr_status");
  // Project Home's right-column widgets (Human Testing, Explorer) come back with the rest of
  // the project layout (B13 roadmap/sessions), not only after the B18 widgets beat.
  const showProjectWidgetsPanel =
    showProjectRoadmapSessions || showWidgetMoveResize || isRevealed("library_entry_and_example");
  const switchableProjects = allProjects.filter((p) => p.wired);
  const experimemoSessions = tutorial.sessionStarted ? [EXPERIMEMO_SESSION] : [];
  const hasAnyHomeShellRevealed =
    showLevelIndicator ||
    showHeaderBreadcrumbs ||
    showHeaderTutorialsWidgetsGames ||
    showHeaderNotificationsSettings ||
    showHeaderControls ||
    showProjectNavigation ||
    showConversationEntry ||
    showProjectsAndActions;

  // Experience guidelines:
  // - Level (B03) spotlights, holds, and glides to its anchor automatically during its introduction.
  // - Music player (B05) assembles and glides to its lower-left anchor automatically after its hold.
  // - i2 / Project / Session nav group (B08 Turn 2) docks when the user clicks Continue.
  // - B11 header groups glide when the user clicks Continue.
  const levelPillDocked =
    isTutorialComplete || currentBeat !== "B03" || turnIndex >= 1 ? true : undefined;
  const breadcrumbsDocked =
    isTutorialComplete || currentBeat !== "B08" || turnIndex >= 2;
  const tutorialsWidgetsGamesDocked =
    isTutorialComplete || currentBeat !== "B11" || turnIndex >= 1;
  const notificationsSettingsDocked =
    isTutorialComplete ||
    BEAT_ORDER.indexOf(currentBeat) > BEAT_ORDER.indexOf("B11") ||
    (currentBeat === "B11" && turnIndex >= 2);
  const musicWidgetDocked =
    isTutorialComplete || BEAT_ORDER.indexOf(currentBeat) > BEAT_ORDER.indexOf("B05")
      ? true
      : undefined;
  const isHeaderDisabled = !isTutorialComplete;
  const highlightHomeNav = isTutorialActive && currentBeat === "B19" && turnIndex === 1;
  const highlightTutorialsNav = isTutorialActive && currentBeat === "B20" && turnIndex === 0;

  // ── Workspace state machine router ───────────────────────────────────────
  return (
    <div
      className="size-full overflow-hidden relative"
      style={{ backgroundColor: "#000000", isolation: "isolate" }}
      data-beat={currentBeat}
      data-b00-gate={b00GateCompleted ? "ready" : "waiting"}
    >
      {/* Ambient background layer (behind everything): fades in gradually beat by beat. */}
      <div
        aria-hidden="true"
        data-name="AmbientBackdrop"
        data-progress={ambientProgress.toFixed(3)}
        className="absolute inset-0 pointer-events-none overflow-hidden"
        style={{
          zIndex: -1,
          background: "#0a0814",
          opacity: ambientProgress,
          transition: "opacity 1.6s ease-in-out",
        }}
      >
        <AnimatedGlows />
      </div>
      {/* Floating Infie Onboarding Stage (B01 -> B18) */}
      <OnboardingStage
        key={onboardingRunId}
        musicOutcome={musicOutcome}
        onSelectContinueMusicQuiet={() => { b05ResolvedRef.current = true; setMusicOutcome("quiet"); }}
        pressNonce={playPressNonce}
        danceNonce={danceNonce}
        onOpenDemoSession={() => openSessionById("add-comments")}
      />

      {/* Persistent lower-left Home music player widget (absent from DOM until B05) */}
      <LeekBeatsWidget
        playButtonRevealed={showMusicPlayOnly}
        fullPlayerRevealed={showMusicFullPlayer}
        moveResizeRevealed={showWidgetMoveResize}
        calloutGlow={isTutorialActive && currentBeat === "B18" && turnIndex === 0}
        animateIntro={!isTutorialComplete}
        docked={musicWidgetDocked}
        placement={
          wsState === "none" && (route === "project" || route === "session") ? "panel" : "floating"
        }
        panelSlot={musicSlotEl}
        onPressStart={() => setPlayPressNonce((n) => n + 1)}
        onMusicPlay={triggerInfieDance}
        onPlayAttempt={(result) => {
          if (currentBeat === "B05" && turnIndex === 0 && !b05ResolvedRef.current && result !== "paused") {
            b05ResolvedRef.current = true;
            setMusicOutcome(result === "played" ? "played" : "quiet");
            setTurnIndex(1);
          }
        }}
      />

      {!isB00Blackout && hasAnyHomeShellRevealed && <AnimatePresence mode="wait">
        {wsState === "none" && route === "home" && (
          <motion.div key="welcome" className="size-full" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>
            <I2HomeScreen
              onOpenProject={handleOpenProject}
              onSuperStack={() => tutorial.openJenny()}
              projectType={projectType}
              onProjectTypeChange={handleProjectTypeChange}
              onSelectProject={openProjectHome}
              onScopeNotice={setScopeNotice}
              onOpenSessionShortcut={openSessionById}
              onPlayground={() => setPlaygroundOpen(true)}
              levelText={levelLabel}
              showHeaderControls={showHeaderControls}
              showBreadcrumbs={showHeaderBreadcrumbs}
              showTutorialsWidgetsGames={showHeaderTutorialsWidgetsGames}
              showNotificationsSettings={showHeaderNotificationsSettings}
              showLevelIndicator={showLevelIndicator}
              showTutorialsEntry={showTutorialsEntry}
              animateHeaderIntro={!isTutorialComplete}
              showConversationEntry={showConversationEntry}
              showProjectsAndActions={showProjectsAndActions}
              showResumeProjects={showResumeProjects}
              showNewImportButtons={showNewImportButtons}
              showHomeActionButtons={showHomeActionButtons}
              showTutorialDemoProject={showTutorialDemoProject}
              showAmbientBackdrop={false}
              levelUpFlourish={levelUpFlourish}
              levelUpStage={levelUpStage}
              activeProjectLabel={activeProject?.name}
              onReturnToActiveProject={
                activeProject ? () => setRoute("project") : undefined
              }
              onWidgets={() => setWidgetsGalleryOpen(true)}
              onSupportNewFramework={() => setSupportFrameworkModalOpen(true)}
              onNotifications={handleOpenNotifications}
              switchableProjects={switchableProjects}
              projects={allProjects}
              allSessions={allSessions}
              onSelectSession={openSession}
              currentProjectId={activeProjectId}
              levelPillDocked={levelPillDocked}
              breadcrumbsDocked={breadcrumbsDocked}
              tutorialsWidgetsGamesDocked={tutorialsWidgetsGamesDocked}
              notificationsSettingsDocked={notificationsSettingsDocked}
              highlightTutorialsNav={highlightTutorialsNav}
              disabled={isHeaderDisabled}
              danceNonce={danceNonce}
            />
          </motion.div>
        )}

        {wsState === "none" && route === "project" && activeProject && (
          <motion.div key="project" className="size-full" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}>
            <ProjectHomeScreen
              project={activeProject}
              onOpenSession={openSession}
              onScopeNotice={setScopeNotice}
              onHome={goHome}
              onPlayground={() => setPlaygroundOpen(true)}
              levelText={levelLabel}
              showHeaderControls={showProjectNavigation}
              showLevelIndicator={showLevelIndicator}
              showTutorialsEntry={showTutorialsEntry}
              showRoadmapSessions={showProjectRoadmapSessions}
              showWidgetsPanel={showProjectWidgetsPanel}
              showStartAppSlot={isTutorialComplete}
              switchableProjects={
                activeProjectId === EXPERIMEMO_PROJECT_ID && experimemoProject
                  ? [experimemoProject]
                  : switchableProjects
              }
              onSwitchProject={(p) => openProjectHome(p)}
              onWidgets={() => setWidgetsGalleryOpen(true)}
              onNotifications={handleOpenNotifications}
              allSessions={
                activeProjectId === EXPERIMEMO_PROJECT_ID
                  ? experimemoSessions
                  : allSessions
              }
              onSelectSession={openSession}
              levelPillDocked={levelPillDocked}
              breadcrumbsDocked={breadcrumbsDocked}
              disabled={isHeaderDisabled}
              onOpenWidget={(id, label) => openRootWidget(id, label)}
              musicSlotRef={setMusicSlotEl}
            />
          </motion.div>
        )}

        {wsState === "none" && route === "session" && activeSession && activeProject && (
          <motion.div key={`session-${activeSession.id}`} className="size-full" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}>
            <SessionScreen
              session={activeSession}
              project={activeProject}
              onHome={goHome}
              onOpenProject={() => openProjectHome(activeProject)}
              onPlayground={() => setPlaygroundOpen(true)}
              levelText={levelLabel}
              showTutorialsEntry={showTutorialsEntry}
              showTaskGroups={showSessionTaskGroups}
              completionPending={showSessionPrStatus}
              onHumanTaskVerified={() => {
                if (currentBeat === "B15") {
                  advanceBeat("B16");
                }
              }}
              onWidgets={() => setWidgetsGalleryOpen(true)}
              onNotifications={handleOpenNotifications}
              onOpenWidget={(id, label) => openRootWidget(id, label)}
              switchableProjects={
                activeProject.id === EXPERIMEMO_PROJECT_ID && experimemoProject
                  ? [experimemoProject]
                  : switchableProjects
              }
              onSwitchProject={(p) => openProjectHome(p)}
              allSessions={
                activeProject.id === EXPERIMEMO_PROJECT_ID
                  ? experimemoSessions
                  : allSessions
              }
              onSelectSession={openSession}
              highlightHomeNav={highlightHomeNav}
              disabled={isHeaderDisabled}
              musicSlotRef={setMusicSlotEl}
            />
          </motion.div>
        )}

        {wsState === "loading" && (
          <motion.div key="loading" className="size-full" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
            <LoadingView label={`Opening ${openedLabel}…`} />
          </motion.div>
        )}

        {wsState === "app-onboard" && (
          <motion.div key="app-onboard" className="size-full" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
            <AppOnboardView folderName={openedLabel} onComplete={() => setWsState("app-found")} />
          </motion.div>
        )}

        {wsState === "ws-onboard" && (
          <motion.div key="ws-onboard" className="size-full" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
            <WsOnboardView onComplete={() => setWsState("ws-found")} />
          </motion.div>
        )}

        {/* Super Stack flow — triggered from welcome CTA */}
        {(wsState as string) === "superstack" && (
          <motion.div key="superstack" className="size-full" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
            <SuperStackView onComplete={() => setWsState("app-found")} />
          </motion.div>
        )}

        {(wsState === "app-found" || wsState === "ws-found") && (
          <motion.div key="ide" className="size-full" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}>
            {ide}
          </motion.div>
        )}
      </AnimatePresence>}

      {/* Project workspace picker modal (layered over welcome screen) */}
      <AnimatePresence>
        {pickerOpen && (
          <OpenPickerModal
            key="picker"
            onClose={() => setPickerOpen(false)}
            onSelect={handleScenario}
          />
        )}
      </AnimatePresence>

      {/* Prototype scope notice */}
      <AnimatePresence>
        {scopeNotice && (
          <PrototypeScopeNotice
            key="scope"
            message={scopeNotice}
            onOpenPet={() => { setScopeNotice(null); openProjectHome(PROTOTYPE_PROJECTS.find(p => p.id === "pet")!); }}
            onOpenNotHotdog={() => { setScopeNotice(null); openProjectHome(PROTOTYPE_PROJECTS.find(p => p.id === "nothotdog")!); }}
            onClose={() => setScopeNotice(null)}
          />
        )}
      </AnimatePresence>

      {/* Status Playground */}
      <AnimatePresence>
        {playgroundOpen && <StatusPlayground key="playground" onClose={() => setPlaygroundOpen(false)} />}
      </AnimatePresence>

      {/* Widgets Gallery Modal (accessible from header on all screens) */}
      <AnimatePresence>
        {widgetsGalleryOpen && (
          <WidgetsGalleryModal
            key="widgets-gallery"
            highlightWidgetId={isTutorialGalleryTurn ? "library" : undefined}
            tutorialMode={isTutorialActive}
            onClose={() => setWidgetsGalleryOpen(false)}
            onOpenWidget={(id, label) => {
              setWidgetsGalleryOpen(false);
              openRootWidget(id, label);
            }}
            globalTodosCount={{
              open: globalTodos.filter(i => !i.done).length,
              total: globalTodos.length,
            }}
          />
        )}
      </AnimatePresence>

      {/* Support new framework modal (Infie chat prompt -> Prototype Limit) */}
      <SupportNewFrameworkModal
        isOpen={supportFrameworkModalOpen}
        onClose={() => setSupportFrameworkModalOpen(false)}
      />

      {/* Root Widget Modal (opened from Widgets Gallery or outside IDE) */}
      <AnimatePresence>
        {rootModal?.kind === "emulator" && (
          <EmulatorModal
            key="root-emu"
            id={rootModal.id}
            onClose={() => setRootModal(null)}
            activeProjectId={activeProjectId}
            previewVersion={tutorial.previewVersion}
          />
        )}
        {rootModal?.kind === "standard" && (
          <WidgetModal key="root-std" id={rootModal.id} label={rootModal.label} fullscreen={rootModal.fullscreen} onClose={() => setRootModal(null)} ctx={rootCtx} />
        )}
      </AnimatePresence>

      {/* Experimemo Interactive Tutorial Overlay */}
      <TutorialOverlay />

    </div>
  );
}
