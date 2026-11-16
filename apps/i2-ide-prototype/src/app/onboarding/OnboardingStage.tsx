import React, { useState, useEffect, useLayoutEffect, useRef, useCallback } from "react";
import { assetUrl } from "../assetUrl";
import { motion, AnimatePresence, useAnimationControls } from "motion/react";
import {
  Folder,
  FileText,
  Github,
  Send,
  X,
  Check,
  Mic,
  MicOff,
  Cpu,
  Palette,
  Sparkles,
} from "lucide-react";
import { useOnboarding, UserProfile, DockedTutorialChatEntry } from "./onboardingContextDef";
import {
  BEAT_ORDER,
  B17_EXPLANATIONS,
  B12_BRIDGE_LINE,
  B14_AGENT_QUESTION,
  B17_SESSION_CLOSED_LINE,
  B15_LINES,
  B15_TASKS_TURN,
  B17_TO_UI_SEGUE,
  B18_TO_SURFACES_SEGUE,
  B18_MOVE_TURN,
  B18_PANELS_TURN,
  B18_OPEN_WIDGETS_TURN,
  B18_LIBRARY_TURN,
  B18_SEGUE_TURN,
  B18_LINES,
  B19_HOME_TURN,
  B19_LINES,
  B19_TURN2_LINE,
  INFIE_FORM_ASSETS,
  InfieFormId,
} from "./revealLedger";
import {
  FloatingInfieMessage,
  FloatingContinueButton,
  FloatingField,
  FloatingButton,
} from "./FloatingPrimitives";
import { useInfieDance } from "./infieDanceAnimation";
import { StylistPreview } from "./StylistPreview";
import { RevealingInfieText, usePrefersReducedMotion, useTextRevealGate } from "../widgets/infiePreferencesContext";
import { PreferenceSlidersPreview } from "../widgets/InfiePreferencesWidget";
import { TUTORIAL_CHAT_LIMIT, usePrototypeLimit } from "../widgets/prototypeLimit";
import { chatScale } from "../widgets/chatScale";
import {
  B03_NOOB_TIMER_MS,
  B06_VIDEO_START_WATCHDOG_MS,
  B06_VIDEO_STALL_WATCHDOG_MS,
  B06_STILL_MIN_DWELL_MS,
  B06_RECENTER_MS,
  B06_BESIDE_GAP_PX,
  B12_BRIDGE_READ_MS,
  B12_SLIDE_MS,
  B12_LANDED_DWELL_MS,
  B12_PROJECTS_FADE_MS,
  PREDOCK_BOTTOM_OFFSET,
  segueDwellMs,
} from "./onboardingTiming";

// Infie and her message live at one fixed vertical anchor for B01–B11, so
// nothing re-centers when fields/Continue appear (they only grow downward).
const STAGE_TOP = "clamp(12px, 3.2vh, 32px)";

// B06 sizes for whatever floats beside Infie (absolutely positioned so the
// stage row never re-lays out; Infie's group glides with an explicit transform).
const B06_SINGLE_PNG_PX = 112;
const B06_ARRAY_PNG_PX = 88;
const B06_ARRAY_GAP_PX = 16;
const B06_ARRAY_WIDTH_PX = B06_ARRAY_PNG_PX * 3 + B06_ARRAY_GAP_PX * 2;

type B06VideoPhase = "idle" | "playing" | "failed";

// B06 device lines (turns 1–3), each spoken while its transformation video plays.
const B06_DEVICE_LINES: Record<number, string> = {
  1: "You can control this IDE in a number of ways. Of course you can use the keyboard and mouse.",
  2: "Or pick up a gamepad if that's more your groove.",
  3: "Prefer a joystick and programmable keypad? You can do that too.",
};

interface ControlsTurnMedia {
  id: string;
  label: string;
  pngSrc: string;
}

// One continuous transparent recording (VP9 + alpha, 1080x1080, 30 fps, 16 s, no audio):
// Mist 0-1s, Infie -> keyboard+mouse 1-4s (hold to 6s), -> gamepad 6-9s (hold to 11s),
// -> joystick + keypad 11-14s (hold to 16s). It is a plain <video> (no canvas keying)
// so the browser's own alpha compositing is used.
const B06_CONTROLS_CHAIN_VIDEO_SRC = assetUrl("/assets/infie-controls-chain-alpha.webm");

// Device turns follow the video's own media time, not wall-clock timers: each turn starts
// when the video reaches `t` seconds (keyboard at the start, gamepad at 6s, joystick at 11s).
const B06_CONTROLS_CHAIN_CUES: ReadonlyArray<{ t: number; turn: 1 | 2 | 3 }> = [
  { t: 0, turn: 1 },
  { t: 6, turn: 2 },
  { t: 11, turn: 3 },
];

function b06TurnForMediaTime(mediaTime: number): number {
  let turn = 1;
  for (const cue of B06_CONTROLS_CHAIN_CUES) if (mediaTime >= cue.t) turn = cue.turn;
  return turn;
}

function canPlayControlsChainVideo(): boolean {
  if (typeof document === "undefined") return false;
  return document.createElement("video").canPlayType('video/webm; codecs="vp9"') !== "";
}

const B06_CONTROLS_MEDIA: Record<number, ControlsTurnMedia> = {
  1: {
    id: "keyboard-mouse",
    label: "Keyboard and mouse",
    pngSrc: assetUrl("/assets/infie-controls-keyboard-mouse.png"),
  },
  2: {
    id: "gamepad",
    label: "Gamepad",
    pngSrc: assetUrl("/assets/infie-controls-gamepad.png"),
  },
  3: {
    id: "joystick-numpad",
    label: "Upright desktop joystick and programmable keypad",
    pngSrc: assetUrl("/assets/infie-controls-joystick-numpad.png"),
  },
};

const B08_WORKSPACE_CHILDREN: ReadonlyArray<{
  name: string;
  annotation?: string;
  isGreenProject?: boolean;
}> = [
  { name: "generated/" },
  { name: "project/", isGreenProject: true },
  { name: "temp/" },
  { name: "pet-show-and-tell/", annotation: "(main worktree)" },
  { name: "pet-show-and-tell-test/", annotation: "(staging worktree)" },
  { name: "pet-show-and-tell-add-comments/", annotation: "(session worktree)" },
  { name: "pet-show-and-tell-fix-reactions/", annotation: "(session worktree)" },
];

const B09_FILE_LABELS = ["info.md", "todo.md", "style.md", "guidelines.md"] as const;

const B10_MODEL_PROVIDERS: ReadonlyArray<{
  id: string;
  label: string;
  kind: "cloud" | "local";
  summary: string;
}> = [
  { id: "claude", label: "Claude", kind: "cloud", summary: "Anthropic Claude Sonnet / Opus session agents" },
  { id: "chatgpt", label: "ChatGPT", kind: "cloud", summary: "OpenAI GPT coding & reasoning session agents" },
  { id: "grok", label: "Grok", kind: "cloud", summary: "xAI Grok fast iteration session agents" },
  { id: "gemini", label: "Gemini", kind: "cloud", summary: "Google Gemini long-context session agents" },
  { id: "cline", label: "Cline", kind: "cloud", summary: "Autonomous tool-use agent runner" },
  { id: "local", label: "Use local models", kind: "local", summary: "Ollama / LM Studio local weights on your machine" },
];

/** Widths below 1280px shift the early chat left so the right-margin card stays clear. */
function useNarrowStage(): boolean {
  const [narrow, setNarrow] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 1279px)");
    setNarrow(mq.matches);
    const handler = (e: MediaQueryListEvent) => setNarrow(e.matches);
    mq.addEventListener?.("change", handler);
    return () => mq.removeEventListener?.("change", handler);
  }, []);
  return narrow;
}

function useViewportWidth(): number {
  const [width, setWidth] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth : 1280
  );
  useEffect(() => {
    const onResize = () => setWidth(window.innerWidth);
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  return width;
}

// Living Infie Hero Artwork: uses the supplied 2048x2048 transparent form stills
// (Mist, Glyph, Surge, Compile) directly with no blurred duplicate, backing oval,
// radial mask, or broad CSS glow behind the whole image so loop openings stay clear.
export function InfieHeroArtwork({
  reducedMotion,
  pointingToPlay = false,
  pressNonce = 0,
  danceNonce = 0,
  size = "lg",
  formId = "mist",
  hiddenForVideo = false,
}: {
  reducedMotion: boolean;
  pointingToPlay?: boolean;
  pressNonce?: number;
  danceNonce?: number;
  size?: "sm" | "lg";
  formId?: InfieFormId;
  hiddenForVideo?: boolean;
}) {
  const px = size === "lg" ? 132 : 52;
  const pressControls = useAnimationControls();
  const { danceControls } = useInfieDance(danceNonce, reducedMotion);
  const src = INFIE_FORM_ASSETS[formId] ?? INFIE_FORM_ASSETS.mist;

  // Playful "button press" synced to the user's click on the music Play button.
  useEffect(() => {
    if (pressNonce === 0 || reducedMotion) return;
    pressControls.start({
      x: [0, 0, 0, 0],
      y: [0, 20, 20, 0],
      scale: [1, 0.92, 1.06, 1],
      transition: { duration: 0.42, times: [0, 0.35, 0.6, 1], ease: "easeInOut" },
    });
  }, [pressNonce, reducedMotion, pressControls]);

  return (
    <motion.div
      data-name="InfieHeroArtwork"
      data-form={formId}
      animate={
        reducedMotion
          ? undefined
          : pointingToPlay
          ? { x: [-18, -32, -18], y: [6, 14, 6], rotate: [-8, -12, -8], scale: [1, 1.03, 1] }
          : { y: [0, -6, 0], scale: [1, 1.018, 1] }
      }
      transition={
        reducedMotion
          ? undefined
          : pointingToPlay
          ? {
              duration: 2.2,
              repeat: Infinity,
              ease: "easeInOut",
            }
          : {
              duration: 3.8,
              repeat: Infinity,
              ease: "easeInOut",
            }
      }
      className="relative flex items-center justify-center select-none shrink-0"
      style={{
        width: px,
        height: px,
        opacity: hiddenForVideo ? 0 : 1,
        transition: "opacity 0.28s ease-in-out",
      }}
    >
      <motion.div animate={danceControls} className="relative flex items-center justify-center">
        <motion.div
          animate={pressControls}
          className="relative flex items-center justify-center"
          style={{ width: px, height: px }}
        >
          <AnimatePresence mode="wait" initial={false}>
            <motion.img
              key={src}
              src={src}
              alt="Infie"
              width={px}
              height={px}
              initial={{ opacity: 0, scale: reducedMotion ? 1 : 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: reducedMotion ? 1 : 0.95 }}
              transition={{ duration: reducedMotion ? 0.15 : 0.26, ease: "easeInOut" }}
              className="relative z-10 object-contain pointer-events-none select-none"
              style={{
                width: px,
                height: px,
                background: "transparent",
              }}
            />
          </AnimatePresence>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}

export interface OnboardingStageProps {
  musicOutcome: "none" | "played" | "quiet";
  onSelectContinueMusicQuiet: () => void;
  onOpenDemoSession?: () => void;
  /** Increments synchronously when the music Play button is pressed. */
  pressNonce?: number;
  /** Increments whenever music starts playing or changes track, triggering Infie's playful 5s dance. */
  danceNonce?: number;
}

export function OnboardingStage({
  musicOutcome,
  onSelectContinueMusicQuiet,
  onOpenDemoSession,
  pressNonce = 0,
  danceNonce = 0,
}: OnboardingStageProps) {
  const {
    currentBeat,
    turnIndex,
    setTurnIndex,
    maxEnabledBeat,
    currentForm,
    userProfile,
    setUserProfile,
    setProjectInterestReply,
    connectedModels,
    connectModel,
    setMicPermissionChoice,
    setDockedChat,
    isRevealed,
    revealGroup,
    retireGroup,
    advanceBeat,
    completeOnboarding,
  } = useOnboarding();

  const reducedMotion = usePrefersReducedMotion();
  const narrowStage = useNarrowStage();
  const viewportWidth = useViewportWidth();

  // B01 arrival choreography state: "lettering" -> "mark" -> "outro" (fade to black before Infie fades into B02)
  const [b01Stage, setB01Stage] = useState<"lettering" | "mark" | "outro">("lettering");

  // B02 identity form state
  const [nameDraft, setNameDraft] = useState("");
  const [emailDraft, setEmailDraft] = useState("");
  const [nameError, setNameError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const b02CompletedRef = useRef(false);
  const nameInputRef = useRef<HTMLInputElement | null>(null);
  const emailInputRef = useRef<HTMLInputElement | null>(null);

  // B04 project interest state
  const [interestDraft, setInterestDraft] = useState("");
  const [chatDocked, setChatDocked] = useState(false);

  // 3-message rolling stack for B02–B11 center-stage messages
  const [messageStack, setMessageStack] = useState<Array<{ id: string; text: string }>>([]);
  const messageStackRef = useRef<Array<{ id: string; text: string }>>([]);
  messageStackRef.current = messageStack;

  // B06 Controls video: ONE continuous transparent recording plays across turns 1-3. The
  // device turns follow its media time (keyboard at 0s, gamepad at 6s, joystick at 11s) and
  // its `ended` event opens Turn 4 (all three devices), which keeps its Continue. A failure
  // latches for the rest of the beat and falls back to still PNGs with the reading dwell.
  const [b06VideoPhase, setB06VideoPhase] = useState<B06VideoPhase>("idle");
  const [b06Recentering, setB06Recentering] = useState(false);
  const [b06PendingAdvance, setB06PendingAdvance] = useState(false);
  const b06VideoRef = useRef<HTMLVideoElement | null>(null);
  // True once the chain video actually reported playback (start watchdog checks it)
  const b06VideoStartedRef = useRef(false);

  // B10 Simulated model provider sign-in modal state
  const [activeModelModal, setActiveModelModal] = useState<{
    id: string;
    label: string;
    kind: "cloud" | "local";
    summary: string;
  } | null>(null);

  const displayName = userProfile?.name || "Null";

  // Determine current spoken line & Continue handler
  let currentLine = "";
  let currentMessageId = `${currentBeat}-${turnIndex}`;
  let onContinue: (() => void) | undefined = undefined;

  switch (currentBeat) {
    case "B02":
      currentLine = "Hi there. I'm Infie. What should I call you?";
      break;
    case "B03":
      if (turnIndex === 0) {
        currentLine = `Nice to meet you, ${displayName}. I can see you're level zero.`;
        onContinue = () => setTurnIndex(1);
      } else if (turnIndex === 1) {
        currentLine = "What a noob.";
        onContinue = undefined;
      } else {
        currentLine =
          "This onboarding tutorial may take 15 to twenty minutes, so make sure you're ready before we go much farther. The way you'll work in iSquared is a little different than other IDEs so we want to make sure you're fully prepared.";
        onContinue = () => advanceBeat("B04");
      }
      break;
    case "B04":
      if (turnIndex === 0) {
        currentLine =
          "I'm going to help you build amazing projects. I hope you're ready. I'll learn a bit about you as we go, to better serve you. Tell me a little about what you like to build and why.";
        onContinue = undefined;
      } else {
        currentLine =
          "I actually don't do much coding myself. I bet you don't either, or we wouldn't be talking. But if you do, that's cool too. i² helps you focus on the big picture, and it's built for getting your hands dirty. I won't hide your files and make things hard to edit by hand, or even interact with, like some other agentic IDEs. Your ideas and abilities are what make you special and awesome. I'm here to amplify that.";
        onContinue = () => advanceBeat("B05");
      }
      break;
    case "B05":
      if (turnIndex === 0) {
        currentLine =
          "Btw… it's kinda quiet. Do you like music? Hit Play, or Continue and we'll keep it quiet.";
        onContinue = () => {
          onSelectContinueMusicQuiet();
          setTurnIndex(1);
        };
      } else {
        currentLine =
          musicOutcome === "played"
            ? "Oh yea, that's my jam. Your music player can live here for now. You can also connect a music streaming service later in settings."
            : "Your music player will be right here when you want it and comes preloaded with some smooth Lo-fi but you can connect a music streaming service later.";
        onContinue = () => advanceBeat("B06");
      }
      break;
    case "B06":
      if (turnIndex === 0) {
        currentLine =
          "I'm all ears if you want to speak conversationally. The built-in music will automatically turn down while either of us is talking, but you can configure push-to-talk later in settings.";
        onContinue = undefined;
      } else if (turnIndex >= 1 && turnIndex <= 3) {
        // Each device line plays with its transformation video, back to back: no gate.
        currentLine = B06_DEVICE_LINES[turnIndex];
        onContinue = undefined;
      } else {
        currentLine =
          "Since navigating the UI and executing common actions are mapped to a controller, you can set up any kind of custom scenario you want in settings later. Some games may require a specific input device.";
        onContinue = !b06Recentering
          ? () => {
              retireGroup("continue_button");
              if (reducedMotion) {
                advanceBeat("B07");
                return;
              }
              // The device array fades while Infie's group glides back to center;
              // B07 begins only after the glide has finished.
              setB06Recentering(true);
              window.setTimeout(() => advanceBeat("B07"), B06_RECENTER_MS + 50);
            }
          : undefined;
      }
      break;
    case "B07":
      if (turnIndex === 0) {
        currentLine =
          "I'm your orchestrator, coordinator, middle-man, question-answerer, and maybe friend. I take the repetitive, mundane, boring stuff out of building. Focus is key. I'll show you what you need when you need it.";
        onContinue = () => setTurnIndex(1);
      } else if (turnIndex === 1) {
        currentLine =
          "I'm an expert at version control like Git, Perforce, Diversion, and more. But you don't need any of those to use i²! I'm also packed with skills that make me a great agent team lead. Most importantly, I help you manage tasks and projects, even after weeks away or across multiple projects. Think of me as your double, your partner-in-crime, your right hand.";
        onContinue = () => setTurnIndex(2);
      } else {
        currentLine =
          "You can ask me for help with any part of the IDE just by holding the hotkeys and clicking it. Even individual words or phrases in Session Agent chats! I'll explain things in a way that makes sense to you.";
        onContinue = () => advanceBeat("B08");
      }
      break;
    case "B08":
      if (turnIndex === 0) {
        currentLine =
          "Here you'll work in an i² Workspace. It keeps your project, Sessions, and supporting files organized, transparent, and light on disk. Whether you use version control or not, I've got you covered.";
        onContinue = () => setTurnIndex(1);
      } else if (turnIndex === 1) {
        currentLine =
          "That's also how navigation works. Project changes to the name of your current project. A Session is a space dedicated to a feature, bug fix, or experiment. If you use Git, I'll manage separate worktrees. If not, no problem! You can start Sessions just by talking to me. First...";
        onContinue = () => {
          retireGroup("workspace_tree");
          revealGroup(["project_folder_only", "folder_illustration"]);
          setTurnIndex(2);
        };
      } else if (turnIndex === 2) {
        currentLine =
          "The key to working with i² is the project folder. It's a magical place! It holds the bigger picture: what we're building, our plans, design choices, and guidelines. These files help every Session Agent understand the whole application, not just their current task.";
        onContinue = () => setTurnIndex(3);
      } else if (turnIndex === 3) {
        currentLine =
          "It's my job to keep these canonical files updated, in sync, and free of contradictions. They keep the Session Agents on track and everyone working toward the same vision. The project folder is separate from your Sessions, so nothing gets lost in the shuffle.";
        onContinue = () => setTurnIndex(4);
      } else {
        currentLine =
          "Behind the scenes, i² Core helps me coordinate our tasks, Sessions, and Session Agents. And with optional i² Sync, your team can contribute through the website, even without Git or the IDE. Your project stays yours, and you're in control of what gets shared!";
        onContinue = () => advanceBeat("B09");
      }
      break;
    case "B09":
      if (turnIndex === 0) {
        currentLine =
          "info.md holds the project's name, purpose, and important details. An agent asks the questions when we start something new or you can start with a basic rundown of the idea or fill out the template. Teammates can even chat with me about it on the i² website. This is used by me to keep the Session Agents in check to make sure your vision is always in mind.";
        onContinue = () => setTurnIndex(1);
      } else if (turnIndex === 1) {
        currentLine =
          "todo.md is what we want to build, change, or fix. Got an idea? Tell me and we'll add it. We'll pull in GitHub issues too. You can add to it yourself. When anyone edits project Info, I add project Todo items so the app reflects the changes in the grand design. You can view this and keep me in check.";
        onContinue = () => setTurnIndex(2);
      } else if (turnIndex === 2) {
        currentLine =
          "style.md is the colors, typography, and look we're going for and The Stylist is an interactive theme setter that helps you preview it. Your designer can use it on the website too.";
        onContinue = () => {
          retireGroup("stylist_preview");
          setTurnIndex(3);
        };
      } else {
        currentLine =
          "guidelines.md tells me, you, your teammates, and the Session Agents how to work. It's the most technical one you're meant to edit. There are extra agent handoff files there too, but I'll take care of those, silly human.";
        onContinue = () => {
          retireGroup(["project_folder_only", "folder_illustration", "stylist_preview"]);
          advanceBeat("B10");
        };
      }
      break;
    case "B10":
      if (turnIndex === 0) {
        currentLine =
          "I am run by an open-weight LLM plus a decision model, like Jev, on iSquared's server which is included in your plan. If you want to give me an upgrade with a local or frontier model, you can do so later in settings, so long as the model meets the minimum requirements I need.";
        onContinue = () => setTurnIndex(1);
      } else if (turnIndex === 1) {
        currentLine =
          "You can use any combination of models for your Session Agents, those are the ones to whom I pass off your requests to get the coding work done. I manage them as a team but more on that later. For now just configure your choices and you can always adjust later in settings.";
        onContinue =
          connectedModels.length >= 1
            ? () => {
                setActiveModelModal(null);
                retireGroup("model_signin_buttons");
                setTurnIndex(2);
              }
            : undefined;
      } else {
        currentLine =
          "Preference Sliders apply to all models in all conversations. Find them in Widgets any time. How fast would you like the text? Try the Speed slider below—even while I'm talking.";
        onContinue = () => advanceBeat("B11");
      }
      break;
    case "B11":
      if (turnIndex === 0) {
        currentLine =
          "Whenever you want more tutorials and lessons, click Learn in the header. Your music player is a widget and there are tons more for you to customize your experience. Games take your iSquared level into account when playing and pause automatically when I have something for you to review. It's a great way to spend time while waiting for Session Agents. You are welcome to submit a tutorial, widget or game to the Infinite Intelligence and there will be tutorials on how to do just that!";
        onContinue = () => setTurnIndex(1);
      } else if (turnIndex === 1) {
        currentMessageId = "B11-1";
        currentLine =
          "A combined list of alerts (Global Todo Widget) for your review and other notifications live here as well as settings.";
        onContinue = () => {
          retireGroup("continue_button");
          setTurnIndex(2);
        };
      } else {
        currentMessageId = "B11-1";
        currentLine =
          "A combined list of alerts (Global Todo Widget) for your review and other notifications live here as well as settings.";
        onContinue = undefined;
      }
      break;
    case "B12":
      if (turnIndex === 0) {
        currentLine = B12_BRIDGE_LINE;
        onContinue = undefined;
      } else if (turnIndex === 1) {
        currentLine = "You can resume projects that are already onboarded to iSquared.";
        onContinue = () => setTurnIndex(2);
      } else if (turnIndex === 2) {
        currentLine =
          "You can also start new projects or onboard existing ones to iSquared.";
        onContinue = () => setTurnIndex(3);
      } else if (turnIndex === 3) {
        currentLine = "We're now in i² Home.";
        onContinue = () => setTurnIndex(4);
      } else if (turnIndex === 4) {
        currentLine =
          "Here you can talk with me about whatever you want, or use our conversation in a project. You can do a lot from here and then get deeper as needed. I can also help you manage our Global Todo list which includes your projects that have open todo items or random todo things you want to track like 'Update SSL certificates on MyWebsite.com'";
        onContinue = () => setTurnIndex(5);
      } else if (turnIndex === 5) {
        currentLine =
          "I'll present Action Buttons specific to the next steps of your projects to save you time typing.";
        onContinue = () => setTurnIndex(6);
      } else {
        currentLine =
          "I've filled in some dummy data for this tutorial. Let's open one.";
        onContinue = undefined;
      }
      break;
    case "B13":
      if (turnIndex === 0) {
        currentLine =
          "This is Project Home. Click the project name to switch projects, or head back to i² Home. Right-click a project in that dropdown to open it in a new window, so different projects can live on different screens. You can switch while work carries on. Don't overload your brain. That's what I'm here for.";
        onContinue = () => setTurnIndex(1);
      } else if (turnIndex === 1) {
        currentLine =
          "I can work with multiple projects at once. If a feature in Project A needs a new feature in Project B, and you want both in play, I'll create a worktree for each, a master plan, a plan for each project, and a special session that shows up in both. The agent team and I can use that session to find errors before you test.";
        onContinue = () => setTurnIndex(2);
      } else {
        currentLine =
          "I help handle long-term planning, version control, branches and worktrees, and what to do next. I also help with research to make sure you are getting the most up to date and in-depth plan when you need it. Your roadmap and Sessions live here.";
        onContinue = () => advanceBeat("B14");
      }
      break;
    case "B14":
      if (turnIndex === 0) {
        currentLine =
          "A Session is a focused piece of work, usually with its own branch and worktree. Big feature, little fix—you get the idea. Sessions come from your todo. You can make one yourself, but I assure you I'll do a better job… just kidding.";
        onContinue = () => setTurnIndex(1);
      } else if (turnIndex === 1) {
        currentLine =
          "When a Session Agent has a question, I'll bring it to you here. You can reply without opening the Session. Try it.";
        onContinue = undefined;
      } else {
        currentLine =
          "Or click the Session name and talk to the Session Agent directly. Let's do that now.";
        onContinue = undefined;
      }
      break;
    case "B15":
      // Continue through the agent turns; the final turn waits for the Human task check.
      currentLine = B15_LINES[Math.min(Math.max(turnIndex, 0), B15_TASKS_TURN)];
      onContinue =
        turnIndex < B15_TASKS_TURN
          ? () => setTurnIndex((t) => Math.min(t + 1, B15_TASKS_TURN))
          : undefined;
      break;
    case "B16":
      currentLine =
        "When the work and checks are ready, I open a pull request. After review and merge, the Session is completion pending. Let's say this one's reviewed and merged. Here's what's left.";
      onContinue = () => advanceBeat("B17");
      break;
    case "B17": {
      const lastExplanationIdx = B17_EXPLANATIONS.length - 1;
      if (turnIndex <= lastExplanationIdx) {
        currentLine = B17_EXPLANATIONS[Math.max(turnIndex, 0)];
        // Continue through every explanation but the last; Submit gates the final one.
        onContinue =
          turnIndex < lastExplanationIdx
            ? () => setTurnIndex((t) => Math.min(t + 1, lastExplanationIdx))
            : undefined;
      } else if (turnIndex === lastExplanationIdx + 1) {
        currentLine = B17_SESSION_CLOSED_LINE;
        onContinue = () => setTurnIndex(lastExplanationIdx + 2);
      } else {
        // Segue (no gate): the cue effect advances to B18 after dwell + text completion.
        currentLine = B17_TO_UI_SEGUE;
        onContinue = undefined;
      }
      break;
    }
    case "B18":
      if (turnIndex === B18_MOVE_TURN) {
        currentLine = B18_LINES[B18_MOVE_TURN];
        onContinue = undefined;
      } else if (turnIndex === B18_PANELS_TURN) {
        currentLine = B18_LINES[B18_PANELS_TURN];
        onContinue = () => setTurnIndex(B18_OPEN_WIDGETS_TURN);
      } else if (turnIndex === B18_OPEN_WIDGETS_TURN) {
        currentLine = B18_LINES[B18_OPEN_WIDGETS_TURN];
        onContinue = undefined;
      } else if (turnIndex === B18_LIBRARY_TURN) {
        currentLine = B18_LINES[B18_LIBRARY_TURN];
        // The shell closes the tutorial-opened Widgets gallery when the turn changes.
        onContinue = () => setTurnIndex(B18_SEGUE_TURN);
      } else {
        // Segue (no gate): the cue effect advances to B19 after dwell + text completion.
        currentLine = B18_TO_SURFACES_SEGUE;
        onContinue = undefined;
      }
      break;
    case "B19":
      if (turnIndex < B19_HOME_TURN) {
        currentLine = B19_LINES[Math.max(turnIndex, 0)];
        onContinue = () => setTurnIndex((t) => Math.min(t + 1, B19_HOME_TURN));
      } else {
        currentLine = B19_TURN2_LINE;
        onContinue = undefined;
      }
      break;
    case "B20":
      if (turnIndex === 0) {
        currentLine =
          "That's about it to get started. This prototype has one more tutorial, 'Generate a new project', which you can go through by clicking that button to the right. In the full experience, Learn in the header has tutorials for every aspect of iSquared, like 'Widgets, widgets, widgets', so you can continue to learn as you please or revisit old ones. You can also just ask me a question about how to do something at any time. I'm completely plugged into this IDE to make your life easy so you can concentrate on what you're here for: building cool shit.";
        onContinue = () => setTurnIndex(1);
      } else if (turnIndex === 1) {
        currentLine =
          "Games unlock at level five, so hop to it. Learn has computer science and game development lessons too. There's even a tutorial on how to increase your level, and completing it increases your level. How meta is that?";
        onContinue = () => setTurnIndex(2);
      } else {
        currentLine =
          "The number of open sessions without submitted Completion Reports will be limited based on your level and plan. I hope this gives you everything you could need but please submit feedback directly to me at any time and I'll make sure it goes to the proper channel and give you a ticket to follow-up.";
        onContinue = () => advanceBeat("B21");
      }
      break;
    case "B21":
      currentLine =
        "Speaking of… there's your first level. I hope you enjoyed this tutorial, and if you didn't, I don't really care. I got paid either way. Toodles for now.";
      onContinue = () => completeOnboarding();
      break;
  }

  // Determine whether Infie is in center-stage mode (B01–B11) or docked in Home/Project/Session chat (B12–B21)
  const isEarlyCenterStage =
    currentBeat === "B01" ||
    currentBeat === "B02" ||
    currentBeat === "B03" ||
    currentBeat === "B04" ||
    currentBeat === "B05" ||
    currentBeat === "B06" ||
    currentBeat === "B07" ||
    currentBeat === "B08" ||
    currentBeat === "B09" ||
    currentBeat === "B10" ||
    currentBeat === "B11";

  const { isComplete: textComplete, onComplete: handleTextComplete } = useTextRevealGate(
    currentLine,
    currentLine ? currentMessageId : undefined
  );
  const textCompleteRef = useRef(textComplete);
  textCompleteRef.current = textComplete;

  const currentMessageIdRef = useRef(currentMessageId);
  currentMessageIdRef.current = currentMessageId;

  const handleDockedTextComplete = useCallback(
    (completedId: string) => {
      if (completedId === currentMessageIdRef.current) {
        handleTextComplete();
      }
    },
    [handleTextComplete]
  );

  const [pendingTimedTransition, setPendingTimedTransition] = useState<{
    messageId: string;
    run: () => void;
  } | null>(null);

  useEffect(() => {
    if (
      pendingTimedTransition &&
      textComplete &&
      pendingTimedTransition.messageId === currentMessageId
    ) {
      const { run } = pendingTimedTransition;
      setPendingTimedTransition(null);
      run();
    }
  }, [pendingTimedTransition, textComplete, currentMessageId]);

  const showContinueNow = isRevealed("continue_button") && Boolean(onContinue) && textComplete;

  // Maintain stable ref for onContinue so setDockedChat never triggers an infinite render loop
  const onContinueRef = useRef<(() => void) | undefined>(undefined);
  onContinueRef.current = onContinue;
  const triggerDockedContinue = useCallback(() => {
    onContinueRef.current?.();
  }, []);

  // Reset chat dock state when starting or returning to early beats
  useEffect(() => {
    if (currentBeat === "B00" || currentBeat === "B01") {
      setChatDocked(false);
      setActiveModelModal(null);
      setMessageStack([]);
      setB06VideoPhase("idle");
      setB06Recentering(false);
    }
  }, [currentBeat]);

  // B06 chain video lifecycle on turns 1, 2, 3. "failed" is sticky until the beat is left,
  // so a failure never restarts the video from 0s.
  useEffect(() => {
    if (currentBeat !== "B06") {
      setB06VideoPhase("idle");
      setB06Recentering(false);
      return;
    }
    if (turnIndex === 0 || turnIndex === 4 || reducedMotion) {
      // Reduced motion: no videos; the cue effect advances after a reading dwell.
      setB06VideoPhase("idle");
      setB06Recentering(false);
      return;
    }
    retireGroup("continue_button");
    setB06VideoPhase((p) => (p === "failed" ? p : canPlayControlsChainVideo() ? "playing" : "failed"));
  }, [currentBeat, turnIndex, reducedMotion, retireGroup]);

  // B06 watchdogs while the chain video plays (one run for the whole chain, not per turn):
  // no playback by the start watchdog → still PNG fallback; media time frozen while the tab
  // is visible → still PNG fallback, so the tutorial never stalls.
  useEffect(() => {
    if (currentBeat !== "B06" || b06VideoPhase !== "playing") return;
    b06VideoStartedRef.current = false;
    const startedAt = Date.now();
    let lastTime = -1;
    let lastChange = startedAt;
    const tick = window.setInterval(() => {
      const now = Date.now();
      const v = b06VideoRef.current;
      if (!b06VideoStartedRef.current) {
        if (now - startedAt >= B06_VIDEO_START_WATCHDOG_MS) setB06VideoPhase("failed");
        return;
      }
      if (!v || document.visibilityState !== "visible" || v.ended) {
        lastChange = now;
        return;
      }
      if (v.currentTime !== lastTime) {
        lastTime = v.currentTime;
        lastChange = now;
      } else if (now - lastChange >= B06_VIDEO_STALL_WATCHDOG_MS) {
        setB06VideoPhase("failed");
      }
    }, 500);
    return () => window.clearInterval(tick);
  }, [currentBeat, b06VideoPhase]);

  // B06 video-time cues: turn follows the video's media time, never goes backwards.
  useEffect(() => {
    if (currentBeat !== "B06" || b06VideoPhase !== "playing") return;
    const v = b06VideoRef.current as
      | (HTMLVideoElement & {
          requestVideoFrameCallback?: (cb: (now: number, meta: { mediaTime: number }) => void) => number;
          cancelVideoFrameCallback?: (id: number) => void;
        })
      | null;
    if (!v) return;
    const sync = (mediaTime: number) => {
      const turn = b06TurnForMediaTime(mediaTime);
      setTurnIndex((t) => (t >= 1 && t < 4 ? Math.max(t, turn) : t));
    };
    const onTimeUpdate = () => sync(v.currentTime);
    v.addEventListener("timeupdate", onTimeUpdate);
    v.addEventListener("seeked", onTimeUpdate);
    let stopped = false;
    let frameId = 0;
    const onFrame = (_now: number, meta: { mediaTime: number }) => {
      if (stopped) return;
      sync(meta.mediaTime);
      frameId = v.requestVideoFrameCallback!(onFrame);
    };
    if (typeof v.requestVideoFrameCallback === "function") frameId = v.requestVideoFrameCallback(onFrame);
    return () => {
      stopped = true;
      v.removeEventListener("timeupdate", onTimeUpdate);
      v.removeEventListener("seeked", onTimeUpdate);
      if (frameId) v.cancelVideoFrameCallback?.(frameId);
    };
  }, [currentBeat, b06VideoPhase, setTurnIndex]);

  // B06 failed video: show the still PNG beside Infie, then move on after a reading dwell
  // (per turn, so turns 1-3 each get their still). Gate on text complete so we never advance before text is readable.
  useEffect(() => {
    if (currentBeat !== "B06" || b06VideoPhase !== "failed") return;
    if (turnIndex < 1 || turnIndex > 3) return;
    const line = B06_DEVICE_LINES[turnIndex] ?? "";
    const t = window.setTimeout(() => {
      if (textCompleteRef.current) {
        setTurnIndex((ti) => (ti === turnIndex ? Math.min(ti + 1, 4) : ti));
      } else {
        setB06PendingAdvance(true);
      }
    }, Math.max(B06_STILL_MIN_DWELL_MS, segueDwellMs(line)));
    return () => window.clearTimeout(t);
  }, [currentBeat, turnIndex, b06VideoPhase, setTurnIndex]);

  // When pending advance is waiting for B06 device text to complete, advance immediately upon completion
  useEffect(() => {
    if (currentBeat === "B06" && b06PendingAdvance && textComplete) {
      setB06PendingAdvance(false);
      setTurnIndex((t) => (t >= 1 && t < 4 ? t + 1 : t));
    }
  }, [currentBeat, b06PendingAdvance, textComplete, setTurnIndex]);

  useEffect(() => {
    setB06PendingAdvance(false);
  }, [turnIndex]);

  // B01 arrival sequence timer -> B02 (preserves Infinite Intelligence and i², fading cleanly before real Infie fades in at B02)
  useEffect(() => {
    if (currentBeat !== "B01") return;
    b02CompletedRef.current = false;
    setB01Stage("lettering");
    if (reducedMotion) {
      const t1 = window.setTimeout(() => setB01Stage("mark"), 650);
      const t2 = window.setTimeout(() => setB01Stage("outro"), 1350);
      const t3 = window.setTimeout(() => advanceBeat("B02"), 1600);
      return () => {
        window.clearTimeout(t1);
        window.clearTimeout(t2);
        window.clearTimeout(t3);
      };
    }
    const t1 = window.setTimeout(() => setB01Stage("mark"), 900);
    const t2 = window.setTimeout(() => setB01Stage("outro"), 2150);
    const t3 = window.setTimeout(() => advanceBeat("B02"), 2600);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      window.clearTimeout(t3);
    };
  }, [currentBeat, reducedMotion, advanceBeat]);

  // B02: Let Infie fade into her normal position first, then greet, then reveal the identity form
  useEffect(() => {
    if (currentBeat !== "B02") return;
    b02CompletedRef.current = false;
    retireGroup("identity_controls");
    const delay = reducedMotion ? 950 : 1950;
    const timer = window.setTimeout(() => {
      revealGroup("identity_controls");
    }, delay);
    return () => window.clearTimeout(timer);
  }, [currentBeat, reducedMotion, revealGroup, retireGroup]);

  // Cue-timed reveals across B03–B21. Each element appears AFTER the line that
  // introduces it. Continue is per-turn: retired on every turn change, then
  // introduced again by that turn's line. Reduced motion keeps the same order
  // and reading dwell, but with a short reveal delay and fade only.
  useEffect(() => {
    if (currentBeat === "B00" || currentBeat === "COMPLETE") {
      setPendingTimedTransition(null);
      return;
    }
    setPendingTimedTransition(null);
    retireGroup("continue_button");
    const timers: number[] = [];
    const at = (ms: number, fn: () => void, compress = true) =>
      timers.push(window.setTimeout(fn, compress && reducedMotion ? Math.min(ms, 150) : ms));
    const afterDwellAndText = (ms: number, fn: () => void, compress = true) => {
      const scheduledId = currentMessageId;
      at(
        ms,
        () => {
          if (textCompleteRef.current) {
            fn();
          } else {
            setPendingTimedTransition({ messageId: scheduledId, run: fn });
          }
        },
        compress
      );
    };

    if (currentBeat === "B03") {
      if (turnIndex === 0) {
        at(450, () => revealGroup(["level_indicator", "continue_button"]));
      } else if (turnIndex === 1) {
        // "What a noob." appears as its own message and holds for a full second before the next message
        afterDwellAndText(B03_NOOB_TIMER_MS, () => setTurnIndex(2), false);
      } else {
        at(450, () => revealGroup("continue_button"));
      }
    } else if (currentBeat === "B04") {
      if (turnIndex === 0) at(500, () => revealGroup("project_interest_reply"));
      else at(500, () => revealGroup("continue_button"));
    } else if (currentBeat === "B05") {
      if (turnIndex === 0) at(600, () => revealGroup(["music_play_only", "continue_button"]));
      else {
        at(120, () => revealGroup(["music_play_only", "music_full_player"]));
        at(1050, () => revealGroup("continue_button"));
      }
    } else if (currentBeat === "B06") {
      if (turnIndex === 0) {
        at(350, () => revealGroup("controls_mic_prompt"));
      } else if (turnIndex === 4) {
        revealGroup("controls_illustrations");
        at(450, () => revealGroup("continue_button"));
      } else {
        revealGroup("controls_illustrations");
        // No gate: in normal motion the video's `ended` advances; reduced motion shows the
        // still PNG and moves on after a reading dwell.
        if (reducedMotion) {
          const line = B06_DEVICE_LINES[turnIndex] ?? "";
          at(
            Math.max(B06_STILL_MIN_DWELL_MS, segueDwellMs(line)),
            () => {
              if (textCompleteRef.current) {
                setTurnIndex((t) => (t === turnIndex ? Math.min(t + 1, 4) : t));
              } else {
                setB06PendingAdvance(true);
              }
            },
            false
          );
        }
      }
    } else if (currentBeat === "B07") {
      at(400, () => revealGroup("continue_button"));
    } else if (currentBeat === "B08") {
      if (turnIndex === 0) {
        at(300, () => revealGroup("workspace_tree"));
        at(500, () => revealGroup("continue_button"));
      } else if (turnIndex === 1) {
        // Simultaneously with Turn 2 message, reveal i2 / Project / Session nav group while tree stays
        revealGroup(["workspace_tree", "header_breadcrumbs"]);
        at(500, () => revealGroup("continue_button"));
      } else {
        retireGroup("workspace_tree");
        revealGroup(["project_folder_only", "folder_illustration", "header_breadcrumbs"]);
        at(450, () => revealGroup("continue_button"));
      }
    } else if (currentBeat === "B09") {
      retireGroup("workspace_tree");
      revealGroup(["project_folder_only", "folder_illustration"]);
      if (turnIndex === 2) {
        at(250, () => revealGroup("stylist_preview"));
      } else {
        retireGroup("stylist_preview");
      }
      at(450, () => revealGroup("continue_button"));
    } else if (currentBeat === "B10") {
      retireGroup(["workspace_tree", "project_folder_only", "folder_illustration", "stylist_preview"]);
      if (turnIndex === 0) {
        retireGroup("model_signin_buttons");
        at(450, () => revealGroup("continue_button"));
      } else if (turnIndex === 1) {
        revealGroup("model_signin_buttons");
        if (connectedModels.length >= 1) {
          at(200, () => revealGroup("continue_button"));
        } else {
          retireGroup("continue_button");
        }
      } else {
        retireGroup("model_signin_buttons");
        at(200, () => revealGroup("continue_button"));
      }
    } else if (currentBeat === "B11") {
      retireGroup("model_signin_buttons");
      if (turnIndex === 0) {
        revealGroup(["header_tutorials_widgets_games", "tutorials_entry"]);
        at(450, () => revealGroup("continue_button"));
      } else if (turnIndex === 1) {
        revealGroup([
          "header_tutorials_widgets_games",
          "tutorials_entry",
          "header_notifications_settings",
        ]);
        at(450, () => revealGroup("continue_button"));
      } else {
        // Turn 2: Notification/Settings pill glides to its top-right Header dock before B12 begins
        revealGroup([
          "header_tutorials_widgets_games",
          "tutorials_entry",
          "header_notifications_settings",
        ]);
        afterDwellAndText(600, () => advanceBeat("B12"));
      }
    } else if (currentBeat === "B12") {
      revealGroup([
        "header_breadcrumbs",
        "header_tutorials_widgets_games",
        "header_notifications_settings",
        "home_header_controls",
        "tutorials_entry",
        "home_conversation_entry",
        "home_projects_and_actions",
      ]);
      if (turnIndex === 0) {
        // Bridge line → conversation slides left and lands → dwell → Active Projects (Turn 1).
        afterDwellAndText(
          reducedMotion ? 1000 : B12_BRIDGE_READ_MS + B12_SLIDE_MS + B12_LANDED_DWELL_MS,
          () => setTurnIndex(1),
          false
        );
      } else if (turnIndex === 1) {
        revealGroup("home_resume_projects");
        // Continue only after Active Projects finish their entrance
        // (not compressed in reduced motion: the fade still runs, order must hold).
        at(B12_PROJECTS_FADE_MS + 120, () => revealGroup("continue_button"), false);
      } else if (turnIndex === 2) {
        revealGroup(["home_resume_projects", "home_new_import_buttons"]);
        at(450, () => revealGroup("continue_button"), false);
      } else if (turnIndex === 3 || turnIndex === 4) {
        revealGroup(["home_resume_projects", "home_new_import_buttons"]);
        at(400, () => revealGroup("continue_button"));
      } else if (turnIndex === 5) {
        revealGroup(["home_resume_projects", "home_new_import_buttons", "home_action_buttons"]);
        at(400, () => revealGroup("continue_button"));
      } else {
        // Turn 6: two project choices glow teal/cyan; no Continue button
        revealGroup([
          "home_resume_projects",
          "home_new_import_buttons",
          "home_action_buttons",
          "tutorial_demo_project",
        ]);
      }
    } else if (currentBeat === "B13") {
      if (turnIndex === 0) {
        // Infie speaks first; then the side and bottom panels slide in toward the chat
        // (~0.7s); Continue is offered only once they have landed.
        revealGroup("project_navigation");
        at(900, () => revealGroup("project_roadmap_sessions"));
        at(1900, () => revealGroup("continue_button"));
      } else {
        revealGroup(["project_navigation", "project_roadmap_sessions"]);
        at(450, () => revealGroup("continue_button"));
      }
    } else if (currentBeat === "B14") {
      revealGroup([
        "project_navigation",
        "project_roadmap_sessions",
        "demo_session_and_question",
      ]);
      if (turnIndex === 0) {
        at(450, () => revealGroup("continue_button"));
      }
    } else if (currentBeat === "B15") {
      if (turnIndex < B15_TASKS_TURN) {
        revealGroup("session_agent_controls");
        at(450, () => revealGroup("continue_button"));
      } else {
        revealGroup(["session_agent_controls", "session_task_groups"]);
      }
    } else if (currentBeat === "B16") {
      revealGroup(["session_agent_controls", "session_task_groups", "session_pr_status"]);
      at(450, () => revealGroup("continue_button"));
    } else if (currentBeat === "B17") {
      const lastExplanationIdx = B17_EXPLANATIONS.length - 1;
      if (turnIndex <= lastExplanationIdx) {
        revealGroup("session_completion_form");
        if (turnIndex < lastExplanationIdx) {
          at(350, () => revealGroup("continue_button"));
        }
      } else if (turnIndex === lastExplanationIdx + 1) {
        // After Submit: the session is closed (Continue).
        retireGroup("session_completion_form");
        at(400, () => revealGroup("continue_button"));
      } else {
        // Segue to the rest of the UI: require both dwell (halved per B17 timing rule) and text completion.
        retireGroup("session_completion_form");
        afterDwellAndText(segueDwellMs(B17_TO_UI_SEGUE, 0.5), () => advanceBeat("B18"), false);
      }
    } else if (currentBeat === "B18") {
      retireGroup("session_completion_form");
      if (turnIndex === B18_MOVE_TURN) {
        retireGroup(["library_entry_and_example", "continue_button"]);
        revealGroup(["music_play_only", "music_full_player", "widget_move_resize"]);
      } else if (turnIndex === B18_PANELS_TURN) {
        retireGroup("library_entry_and_example");
        revealGroup(["music_play_only", "music_full_player", "widget_move_resize"]);
        at(450, () => revealGroup("continue_button"));
      } else if (turnIndex === B18_OPEN_WIDGETS_TURN) {
        retireGroup(["library_entry_and_example", "continue_button"]);
        revealGroup(["music_play_only", "music_full_player", "widget_move_resize"]);
      } else if (turnIndex === B18_LIBRARY_TURN) {
        // Gallery is opened by clicking Widgets in Turn 2; reveal Library callout Continue.
        revealGroup(["music_play_only", "music_full_player", "widget_move_resize", "library_entry_and_example"]);
        at(350, () => revealGroup("continue_button"));
      } else {
        // Segue from widgets to the other surfaces of iSquared: require both dwell and text completion.
        retireGroup(["library_entry_and_example", "continue_button"]);
        revealGroup(["music_play_only", "music_full_player", "widget_move_resize"]);
        afterDwellAndText(segueDwellMs(B18_TO_SURFACES_SEGUE), () => advanceBeat("B19"), false);
      }
    } else if (currentBeat === "B19") {
      retireGroup("library_entry_and_example");
      if (turnIndex < B19_HOME_TURN) {
        at(450, () => revealGroup("continue_button"));
      }
    } else if (currentBeat === "B20") {
      revealGroup("tutorials_entry");
      at(450, () => revealGroup("continue_button"));
    } else if (currentBeat === "B21") {
      revealGroup("tutorials_entry");
      at(600, () => revealGroup("continue_button"));
    }
    return () => timers.forEach((t) => window.clearTimeout(t));
  }, [
    currentBeat,
    turnIndex,
    currentMessageId,
    maxEnabledBeat,
    connectedModels.length,
    reducedMotion,
    revealGroup,
    retireGroup,
    setTurnIndex,
    advanceBeat,
  ]);

  // Shared B02 completion path (used by both Submit and Sign in with GitHub)
  // Guarded by b02CompletedRef so duplicate advancement can never occur.
  // NOTE: all hooks must run before any early return (rules of hooks).
  const completeB02Identity = useCallback(
    (profile: UserProfile) => {
      if (b02CompletedRef.current || currentBeat !== "B02") {
        return;
      }
      b02CompletedRef.current = true;
      setNameError(null);
      setEmailError(null);
      setUserProfile(profile);
      retireGroup("identity_controls");
      advanceBeat("B03");
    },
    [currentBeat, setUserProfile, retireGroup, advanceBeat]
  );

  // B02 Identity Handlers
  const validateAndSubmitIdentity = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (b02CompletedRef.current || currentBeat !== "B02") return;

    const trimmedName = nameDraft.trim();
    const trimmedEmail = emailDraft.trim();
    let valid = true;

    if (!trimmedName) {
      setNameError("Enter your name");
      valid = false;
    } else {
      setNameError(null);
    }

    if (!trimmedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setEmailError("Enter a valid email");
      valid = false;
    } else {
      setEmailError(null);
    }

    if (!valid) {
      if (!trimmedName) {
        nameInputRef.current?.focus();
      } else {
        emailInputRef.current?.focus();
      }
      return;
    }

    completeB02Identity({
      name: trimmedName,
      email: trimmedEmail,
      authMethod: "form",
    });
  };

  const handleGitHubSignIn = () => {
    const trimmedEmail = emailDraft.trim();
    const hasValidTypedEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail);

    completeB02Identity({
      name: "Null",
      email: hasValidTypedEmail ? trimmedEmail : "you@e.mail",
      authMethod: "github",
    });
  };

  // Accumulate 3-message rolling stack during early center-stage beats (B02–B11)
  useEffect(() => {
    if (!isEarlyCenterStage || !currentLine) return;
    setMessageStack((prev) => {
      const existingIdx = prev.findIndex((m) => m.id === currentMessageId);
      if (existingIdx >= 0) {
        if (prev[existingIdx].text === currentLine) return prev;
        const updated = [...prev];
        updated[existingIdx] = { id: currentMessageId, text: currentLine };
        return updated.slice(-3);
      }
      return [...prev, { id: currentMessageId, text: currentLine }].slice(-3);
    });
  }, [isEarlyCenterStage, currentMessageId, currentLine]);

  // Pre-dock: if the stage content is taller than the space above the action row, keep the
  // newest message in view (only this scroll container moves; nothing else).
  const stageScrollRef = useRef<HTMLDivElement | null>(null);
  useLayoutEffect(() => {
    if (!isEarlyCenterStage) return;
    const el = stageScrollRef.current;
    if (!el) return;
    let frame = 0;
    const scrollToLatest = () => {
      // Follow layout, not a guessed delay: trees shrink the viewport and the
      // typewriter keeps growing the message after it first mounts.
      el.scrollTop = el.scrollHeight;
    };
    const followLayout = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(scrollToLatest);
    };
    const observer = new ResizeObserver(followLayout);
    observer.observe(el);
    if (el.firstElementChild) observer.observe(el.firstElementChild);
    scrollToLatest();
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [isEarlyCenterStage, messageStack]);

  // From B12 onward, ordinary messages live in the docked Infie chat across Home, Project, and Session.
  // B18 Turn 3 (Library) also renders a floating callout beneath the open Widgets gallery while
  // recording its message in the rolling 3-message docked chat feed (with a single Continue on the callout).
  const isFloatingCallout = currentBeat === "B18" && turnIndex === B18_LIBRARY_TURN;

  useEffect(() => {
    if (isEarlyCenterStage || currentBeat === "B00" || currentBeat === "COMPLETE" || !currentLine) {
      return;
    }
    const nextShowContinue = isFloatingCallout ? false : showContinueNow;
    const nextOnContinue = isFloatingCallout ? undefined : triggerDockedContinue;
    const nextOnTextComplete = isFloatingCallout ? undefined : handleDockedTextComplete;
    setDockedChat((prev) => {
      const msgId = currentMessageId;
      const baseHistory: ReadonlyArray<DockedTutorialChatEntry> =
        prev.history.length > 0
          ? prev.history
          : messageStackRef.current.slice(-2).map((m) => ({
              id: m.id,
              role: "assistant" as const,
              text: m.text,
            }));
      const exists = baseHistory.some((m) => m.id === msgId);
      if (
        exists &&
        prev.currentMessageId === msgId &&
        prev.currentLine === currentLine &&
        prev.showContinue === nextShowContinue &&
        prev.onContinue === nextOnContinue &&
        prev.onTextComplete === nextOnTextComplete &&
        prev.history.length > 0
      ) {
        return prev;
      }
      let nextHistory = baseHistory;
      if (!exists) {
        const additions: DockedTutorialChatEntry[] = [
          { id: msgId, role: "assistant", text: currentLine, kind: "message" },
        ];
        // B14: the demo agent question arrives right after "When an agent has a question…",
        // so it stays in conversation order ahead of "Or click the Session name…".
        if (currentBeat === "B14" && turnIndex === 1) {
          additions.push({
            id: "B14-agent-question",
            role: "assistant",
            text: B14_AGENT_QUESTION,
            kind: "agent_question",
          });
        }
        nextHistory = [...baseHistory, ...additions].slice(-3);
      }
      return {
        currentMessageId: msgId,
        currentLine,
        history: nextHistory,
        showContinue: nextShowContinue,
        onContinue: nextOnContinue,
        onTextComplete: nextOnTextComplete,
      };
    });
  }, [
    currentBeat,
    turnIndex,
    currentMessageId,
    currentLine,
    isEarlyCenterStage,
    isFloatingCallout,
    showContinueNow,
    triggerDockedContinue,
    handleDockedTextComplete,
    setDockedChat,
  ]);

  // Before Infie's conversation docks (B12), show up to 3 messages in the rolling stack.
  const displayedMessages =
    messageStack.length > 0
      ? messageStack.slice(-3)
      : currentLine
      ? [{ id: currentMessageId, text: currentLine }]
      : [];

  const handleInterestSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    const text = interestDraft.trim();
    if (!text) {
      document.getElementById("onboarding-project-interest")?.focus();
      return;
    }
    try {
      localStorage.setItem("i2.onboarding.interest", text);
    } catch {}
    setProjectInterestReply(text);
    setInterestDraft("");
    setChatDocked(true);
    setTurnIndex(1);
  };

  // Infie's side of the tutorial is scripted: a free-form message stops at the prototype limit.
  const limit = usePrototypeLimit();
  const handleDockedChatSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    const text = interestDraft.trim();
    if (!text) return;
    setInterestDraft("");
    limit(TUTORIAL_CHAT_LIMIT);
  };

  const visibleFileCount =
    currentBeat === "B09" ? Math.min(turnIndex + 1, B09_FILE_LABELS.length) : 0;

  if (currentBeat === "B00" || currentBeat === "COMPLETE") {
    return null;
  }

  // B01 Arrival Screen
  if (currentBeat === "B01") {
    return (
      <div
        className="fixed inset-x-0 z-40 flex items-center justify-center pointer-events-none"
        style={{ top: STAGE_TOP, height: 196 }}
      >
        <AnimatePresence mode="wait">
          {b01Stage === "lettering" && (
            <motion.div
              key="lettering"
              initial={{ opacity: 0, scale: reducedMotion ? 1 : 0.94 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: reducedMotion ? 1 : 0.85 }}
              transition={{ duration: reducedMotion ? 0.2 : 0.45 }}
              className="flex flex-col items-center gap-3 px-4 text-center"
            >
              <div
                className="w-24 h-1 rounded-full"
                style={{
                  background:
                    "linear-gradient(90deg, transparent, #2dd4bf, #abefa3, transparent)",
                  boxShadow: "0 0 24px rgba(45, 212, 191, 0.7)",
                }}
              />
              <span
                style={{
                  fontFamily: "'Space Grotesk', sans-serif",
                  fontSize: 28,
                  fontWeight: 700,
                  color: "#2dd4bf",
                  letterSpacing: "-0.02em",
                  textShadow: "0 0 28px rgba(45, 212, 191, 0.55)",
                }}
              >
                Infinite Intelligence
              </span>
            </motion.div>
          )}

          {b01Stage === "mark" && (
            <motion.div
              key="mark"
              initial={{ opacity: 0, scale: reducedMotion ? 1 : 1.25 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: reducedMotion ? 1 : 0.7 }}
              transition={{ duration: reducedMotion ? 0.2 : 0.4 }}
              className="flex items-center justify-center"
            >
              <span
                style={{
                  fontFamily: "'Space Grotesk', sans-serif",
                  fontSize: 52,
                  fontWeight: 700,
                  color: "#abefa3",
                  letterSpacing: "-0.04em",
                  textShadow: "0 0 36px rgba(45, 212, 191, 0.8)",
                }}
              >
                i²
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  // Early beats (B02–B11): Floating in usable negative space in the center of the viewport
  if (isEarlyCenterStage) {
    const activeControlsMedia =
      currentBeat === "B06" && (turnIndex === 1 || turnIndex === 2 || turnIndex === 3)
        ? B06_CONTROLS_MEDIA[turnIndex]
        : null;
    const isB06VideoActive =
      Boolean(activeControlsMedia) &&
      !reducedMotion &&
      b06VideoPhase === "playing";
    // What floats beside Infie: one still PNG (reduced motion / failed video) or the
    // Turn 4 three-device array. It is absolutely positioned, so the stage row never
    // re-lays out; Infie's group glides with an explicit transform instead (no pop).
    const besideMedia: "single" | "array" | null =
      currentBeat === "B06" && turnIndex === 4 && !b06Recentering
        ? "array"
        : activeControlsMedia && (reducedMotion || b06VideoPhase === "failed")
        ? "single"
        : null;
    const besideWidth =
      besideMedia === "array" ? B06_ARRAY_WIDTH_PX : besideMedia === "single" ? B06_SINGLE_PNG_PX : 0;
    const infieGroupShift = besideMedia ? -(besideWidth + B06_BESIDE_GAP_PX) / 2 : 0;
    const besideLeft = `calc(100% + ${B06_BESIDE_GAP_PX}px)`;
    const showHotkeyCard = currentBeat === "B07" && turnIndex === 2;
    const showStylistMargin = currentBeat === "B09" && turnIndex === 2 && isRevealed("stylist_preview");
    const showRightMargin = showHotkeyCard || showStylistMargin;
    const chatShift = narrowStage && showRightMargin;
    const shiftPad = chatShift ? "min(280px, 36vw)" : undefined;
    const padLeft = 24;
    const padRight = chatShift ? Math.min(280, viewportWidth * 0.36) : 24;
    const chatCenterX = (padLeft + viewportWidth - padRight) / 2;
    const chatVisualWidth = Math.min(540 * chatScale(), Math.max(0, viewportWidth - padLeft - padRight));
    const rightMarginLeft = Math.round(chatCenterX + chatVisualWidth / 2);
    const b06ScaleDuration = reducedMotion ? 0 : isB06VideoActive ? 0.65 : B06_RECENTER_MS / 1000;

    return (
      <>
      <div
        data-name="OnboardingStageFrame"
        data-chat-shift={chatShift ? "true" : "false"}
        className="fixed inset-0 z-30 flex flex-col items-center px-6 pointer-events-none overflow-hidden"
        style={{
          background: "transparent",
          paddingRight: shiftPad,
        }}
      >
        <div
          data-name="OnboardingChatColumn"
          className="i2-chat-scale flex flex-col items-center gap-2 max-w-4xl w-full h-full min-h-0 pointer-events-auto"
          style={{
            paddingTop: STAGE_TOP,
            paddingBottom: `calc(${PREDOCK_BOTTOM_OFFSET} + 132px)`,
          }}
        >
          {/* Infie Stage Row: Live Infie (or B06 transformation video) + B06 floating device PNGs.
              When the B06 transformation video plays, the row grows from 132px to 264px so the
              chat below slides down smoothly to make room, then returns to 132px when it ends. */}
          <motion.div
            data-name="InfieStageRow"
            initial={false}
            animate={{ height: isB06VideoActive ? 264 : 132 }}
            transition={{
              height: { duration: b06ScaleDuration, ease: [0.22, 1, 0.36, 1] },
            }}
            className="relative flex items-center justify-center w-full shrink-0"
            style={{ background: "transparent", border: "none" }}
          >
            <motion.div
              data-name="InfieStageGroup"
              data-b06-scaled={isB06VideoActive ? "2x" : "1x"}
              initial={false}
              animate={{ x: infieGroupShift }}
              transition={{
                x: {
                  duration: reducedMotion ? 0 : B06_RECENTER_MS / 1000,
                  ease: [0.22, 1, 0.36, 1],
                },
              }}
              className="relative flex items-center justify-center"
              style={{ width: 132, height: 132 }}
            >
              <motion.div
                data-name="InfieVideoScale"
                initial={false}
                animate={{ scale: isB06VideoActive ? 2 : 1 }}
                transition={{
                  scale: { duration: b06ScaleDuration, ease: [0.22, 1, 0.36, 1] },
                }}
                className="relative flex items-center justify-center"
                style={{ width: 132, height: 132, transformOrigin: "center center" }}
              >
                <motion.div
                  data-name="InfieArrival"
                  initial={currentBeat === "B02" ? { opacity: 0 } : false}
                  animate={{ opacity: 1 }}
                  transition={{
                    opacity: {
                      duration: reducedMotion ? 0.75 : 1.4,
                      ease: "easeInOut",
                    },
                  }}
                  className="relative flex items-center justify-center"
                >
                  <InfieHeroArtwork
                    reducedMotion={reducedMotion}
                    pointingToPlay={currentBeat === "B05" && turnIndex === 0}
                    pressNonce={pressNonce}
                    danceNonce={danceNonce}
                    size="lg"
                    formId={currentForm}
                    hiddenForVideo={isB06VideoActive}
                  />
                </motion.div>
                {/* B06 Muted black-background transformation video at Infie's position */}
                <AnimatePresence>
                  {activeControlsMedia && isB06VideoActive && (
                    <motion.div
                      key="b06-controls-chain-video"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.28, ease: "easeInOut" }}
                      className="absolute inset-0 pointer-events-none select-none z-20"
                      style={{ width: 132, height: 132, background: "transparent" }}
                    >
                      {/* True-alpha WebM: a plain <video> so the browser composites the alpha itself. */}
                      <video
                        ref={(el) => {
                          b06VideoRef.current = el;
                        }}
                        data-name="ControlsTransformationVideo"
                        data-video-phase={b06VideoPhase}
                        src={B06_CONTROLS_CHAIN_VIDEO_SRC}
                        muted
                        playsInline
                        autoPlay
                        preload="auto"
                        aria-hidden="true"
                        className="absolute inset-0 size-full object-contain pointer-events-none select-none"
                        style={{ background: "transparent" }}
                        onPlaying={() => {
                          b06VideoStartedRef.current = true;
                        }}
                        onEnded={(e) => {
                          if (e.currentTarget !== b06VideoRef.current) return;
                          if (b06VideoPhase !== "playing") return;
                          // The chain is over: all three devices (Turn 4). Gate on text completion so text is readable.
                          if (textCompleteRef.current) {
                            setTurnIndex(4);
                          } else {
                            setB06PendingAdvance(true);
                          }
                        }}
                        onError={(e) => {
                          if (e.currentTarget !== b06VideoRef.current) return;
                          // Still PNG fallback; the failed-phase effect moves on after a dwell.
                          setB06VideoPhase("failed");
                        }}
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>

              {/* Beside Infie: still PNG (reduced motion / failed video) or Turn 4 all-three array */}
              <AnimatePresence>
                {besideMedia === "single" && activeControlsMedia && (
                  <motion.img
                    key={`single-${activeControlsMedia.id}`}
                    data-name="ControlsDeviceIllustration"
                    data-device={activeControlsMedia.id}
                    src={activeControlsMedia.pngSrc}
                    alt={activeControlsMedia.label}
                    initial={{ opacity: 0, x: reducedMotion ? 0 : 18 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, transition: { duration: 0.25 } }}
                    transition={{ duration: 0.32, ease: "easeOut" }}
                    className="absolute object-contain pointer-events-none select-none"
                    style={{
                      left: besideLeft,
                      top: "50%",
                      marginTop: -B06_SINGLE_PNG_PX / 2,
                      width: B06_SINGLE_PNG_PX,
                      height: B06_SINGLE_PNG_PX,
                      background: "transparent",
                      border: "none",
                      boxShadow: "none",
                    }}
                  />
                )}
                {besideMedia === "array" && (
                  <motion.div
                    key="b06-all-three"
                    data-name="ControlsAllThreeIllustrations"
                    initial={{ opacity: 0, x: reducedMotion ? 0 : 18 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, transition: { duration: 0.25, ease: "easeOut" } }}
                    transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
                    className="absolute flex items-center"
                    style={{
                      left: besideLeft,
                      top: "50%",
                      marginTop: -B06_ARRAY_PNG_PX / 2,
                      gap: B06_ARRAY_GAP_PX,
                      background: "transparent",
                      border: "none",
                      boxShadow: "none",
                    }}
                  >
                    {[1, 2, 3].map((idx) => {
                      const item = B06_CONTROLS_MEDIA[idx];
                      return (
                        <img
                          key={item.id}
                          data-device={item.id}
                          src={item.pngSrc}
                          alt={item.label}
                          className="object-contain pointer-events-none select-none shrink-0"
                          style={{
                            width: B06_ARRAY_PNG_PX,
                            height: B06_ARRAY_PNG_PX,
                            background: "transparent",
                            border: "none",
                            boxShadow: "none",
                          }}
                        />
                      );
                    })}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </motion.div>

          {/* Only the message stack scrolls. Infie and the illustrations stay put. */}
          <div
            ref={stageScrollRef}
            data-name="OnboardingMessageScroller"
            className="i2-conversation-scroll shrink min-h-0 overflow-y-auto w-full max-w-[540px]"
          >
            <div className="flex flex-col items-center gap-1.5 w-full">
              <AnimatePresence initial={currentBeat === "B02"} mode="popLayout">
                {displayedMessages.map((msg, idx) => {
                  const isLatest = idx === displayedMessages.length - 1;
                  const isB02Greeting = msg.id === "B02-0";
                  const greetingDelay = isB02Greeting ? (reducedMotion ? 0.35 : 0.75) : 0;
                  const greetingDuration = isB02Greeting ? (reducedMotion ? 0.3 : 0.5) : 0.22;
                  return (
                    <motion.div
                      key={msg.id}
                      data-slot={isLatest ? "infie-message" : "infie-message-history"}
                      data-message-id={msg.id}
                      initial={{ opacity: 0, y: reducedMotion ? 0 : 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{
                        opacity: { duration: greetingDuration, delay: greetingDelay, ease: "easeOut" },
                        y: { duration: greetingDuration, delay: greetingDelay, ease: "easeOut" },
                      }}
                      className="px-3.5 py-2 rounded-[12px] w-full break-words shrink-0"
                      style={{
                        background: "transparent",
                        border: isLatest
                          ? "1px solid rgba(45, 212, 191, 0.45)"
                          : "1px solid rgba(45, 212, 191, 0.2)",
                        backdropFilter: "blur(6px)",
                        color: isLatest
                          ? "rgba(255, 255, 255, 0.95)"
                          : "rgba(255, 255, 255, 0.7)",
                        fontFamily: "'Rounded Mplus 1c', sans-serif",
                        fontSize: 13.5,
                        lineHeight: 1.48,
                      }}
                    >
                      {isLatest ? (
                        <RevealingInfieText
                          text={msg.text}
                          live
                          onComplete={handleTextComplete}
                        />
                      ) : (
                        msg.text
                      )}
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          </div>

          {currentBeat === "B10" && turnIndex === 2 && <PreferenceSlidersPreview />}

          {/* B02: Name and Email fields in center content flow */}
          {currentBeat === "B02" && isRevealed("identity_controls") && textComplete && (
            <motion.div
              initial={{ opacity: 0, y: reducedMotion ? 0 : 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: reducedMotion ? 0.25 : 0.45, ease: "easeOut" }}
              className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-[460px] mt-1"
            >
              <FloatingField
                ref={nameInputRef}
                id="onboarding-name"
                label="Name"
                placeholder="First name"
                value={nameDraft}
                onChange={(v) => {
                  setNameDraft(v);
                  if (nameError) setNameError(null);
                }}
                error={nameError}
                autoComplete="name"
                onKeyDown={(e) => {
                  if (e.key === "Enter") validateAndSubmitIdentity();
                }}
              />
              <FloatingField
                ref={emailInputRef}
                id="onboarding-email"
                label="Email"
                type="email"
                placeholder="you@e.mail"
                value={emailDraft}
                onChange={(v) => {
                  setEmailDraft(v);
                  if (emailError) setEmailError(null);
                }}
                error={emailError}
                autoComplete="email"
                onKeyDown={(e) => {
                  if (e.key === "Enter") validateAndSubmitIdentity();
                }}
              />
            </motion.div>
          )}

          {/* B04 Turn 0: Project interest field in center content flow */}
          {currentBeat === "B04" && turnIndex === 0 && !chatDocked && isRevealed("project_interest_reply") && textComplete && (
            <motion.form
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              onSubmit={handleInterestSubmit}
              className="flex flex-wrap items-end gap-3 w-full max-w-[480px] pointer-events-auto mt-1"
              style={{ background: "transparent", border: "none" }}
            >
              <FloatingField
                id="onboarding-project-interest"
                label="What you like to build"
                placeholder="Mobile apps, multiplayer games, creative tools…"
                value={interestDraft}
                onChange={setInterestDraft}
                className="flex-1 min-w-[240px]"
                autoFocus
              />
              <FloatingButton type="submit" variant="primary">
                <Send size={14} />
                <span>Send</span>
              </FloatingButton>
            </motion.form>
          )}

          {/* B08 Turns 0–1: Animated, indented, VERTICAL folder tree built from native elements */}
          {currentBeat === "B08" &&
            (turnIndex === 0 || turnIndex === 1) &&
            isRevealed("workspace_tree") && (
              <motion.div
                data-name="WorkspaceVerticalTree"
                initial={{ opacity: 0, y: reducedMotion ? 0 : 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.35 }}
                className="flex flex-col items-start gap-1 pt-0.5 px-2"
                style={{ background: "transparent", border: "none", boxShadow: "none" }}
              >
                {/* Root folder */}
                <div className="flex items-center gap-2">
                  <Folder size={15} className="text-white/75 shrink-0" />
                  <span
                    style={{
                      fontFamily: "monospace",
                      fontSize: 13,
                      fontWeight: 600,
                      color: "rgba(255, 255, 255, 0.92)",
                    }}
                  >
                    pet-show-and-tell-i2Workspace/
                  </span>
                </div>

                {/* 7 children including staging worktree */}
                <div className="flex flex-col items-start gap-0.5 pl-4">
                  {B08_WORKSPACE_CHILDREN.map((child, idx) => {
                    const isLast = idx === B08_WORKSPACE_CHILDREN.length - 1;
                    const connector = isLast ? "└──" : "├──";
                    return (
                      <motion.div
                        key={child.name}
                        data-tree-child={child.name}
                        initial={{ opacity: 0, x: reducedMotion ? 0 : -6 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{
                          duration: 0.25,
                          delay: reducedMotion ? 0 : idx * 0.06,
                        }}
                        className="flex items-center gap-2"
                        style={{ background: "transparent", border: "none" }}
                      >
                        <span
                          aria-hidden="true"
                          style={{
                            fontFamily: "monospace",
                            fontSize: 12,
                            color: "rgba(255, 255, 255, 0.32)",
                            userSelect: "none",
                          }}
                        >
                          {connector}
                        </span>
                        <Folder
                          size={14}
                          className={
                            child.isGreenProject
                              ? "text-[#abefa3] shrink-0"
                              : "text-white/55 shrink-0"
                          }
                        />
                        <span
                          style={{
                            fontFamily: "monospace",
                            fontSize: 12.5,
                            fontWeight: child.isGreenProject ? 700 : 400,
                            color: child.isGreenProject
                              ? "#abefa3"
                              : "rgba(255, 255, 255, 0.82)",
                          }}
                        >
                          {child.name}
                        </span>
                        {child.annotation && (
                          <span
                            style={{
                              fontFamily: "'Rounded Mplus 1c', sans-serif",
                              fontSize: 11.5,
                              color: "rgba(255, 255, 255, 0.42)",
                              marginLeft: 6,
                            }}
                          >
                            {child.annotation}
                          </span>
                        )}
                      </motion.div>
                    );
                  })}
                </div>
              </motion.div>
            )}

          {/* B08 Turns 2–3 & B09 Turns 0–3: ONLY the green project/ folder (alone) + B09 indented vertical file list */}
          {((currentBeat === "B08" && turnIndex >= 2) || currentBeat === "B09") &&
            isRevealed("project_folder_only") && (
              <motion.div
                data-name="GreenProjectFolderOnly"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.35 }}
                className="flex flex-col items-start gap-2 pt-2"
                style={{ background: "transparent", border: "none" }}
              >
                <div
                  className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-[9px]"
                  style={{
                    background: "transparent",
                    border: "1px solid rgba(171, 239, 163, 0.55)",
                  }}
                >
                  <Folder size={15} className="text-[#abefa3]" />
                  <span
                    style={{
                      fontFamily: "'Space Grotesk', sans-serif",
                      fontSize: 13,
                      fontWeight: 600,
                      color: "#abefa3",
                    }}
                  >
                    project/
                  </span>
                </div>

                {visibleFileCount > 0 && (
                  <div className="flex flex-col items-start gap-1.5 pl-6">
                    {B09_FILE_LABELS.slice(0, visibleFileCount).map((fileName, idx) => {
                      const isCurrent = idx === visibleFileCount - 1;
                      const isLast = idx === visibleFileCount - 1;
                      return (
                        <motion.div
                          key={fileName}
                          data-file-label={fileName}
                          initial={{ opacity: 0, x: reducedMotion ? 0 : -6 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ duration: 0.25 }}
                          className="inline-flex items-center gap-2"
                          style={{ background: "transparent" }}
                        >
                          <span
                            aria-hidden="true"
                            style={{
                              fontFamily: "monospace",
                              fontSize: 12,
                              color: "rgba(171, 239, 163, 0.45)",
                            }}
                          >
                            {isLast ? "└──" : "├──"}
                          </span>
                          <div
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[7px]"
                            style={{
                              background: "transparent",
                              border: isCurrent
                                ? "1px solid rgba(45, 212, 191, 0.65)"
                                : "1px solid rgba(255, 255, 255, 0.18)",
                              color: isCurrent ? "#2dd4bf" : "rgba(255, 255, 255, 0.82)",
                              fontFamily: "monospace",
                              fontSize: 12,
                            }}
                          >
                            <FileText size={12} />
                            <span>{fileName}</span>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                )}
              </motion.div>
            )}

          {/* B10 Turn 1: Faux Model Provider Sign-In Buttons (Claude, ChatGPT, Grok, Gemini, Cline, Use local models) */}
          {currentBeat === "B10" && turnIndex === 1 && isRevealed("model_signin_buttons") && (
            <motion.div
              data-name="ModelSignInButtons"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="flex flex-col items-center gap-3 pt-1 max-w-xl w-full"
              style={{ background: "transparent", border: "none" }}
            >
              <div className="flex flex-wrap items-center justify-center gap-2.5">
                {B10_MODEL_PROVIDERS.map((provider) => {
                  const isConnected = connectedModels.includes(provider.id);
                  return (
                    <button
                      key={provider.id}
                      type="button"
                      data-provider-id={provider.id}
                      data-connected={isConnected ? "true" : "false"}
                      onClick={() => setActiveModelModal(provider)}
                      className="inline-flex items-center gap-2 px-3.5 py-2 rounded-[10px] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2dd4bf]/60"
                      style={{
                        background: isConnected
                          ? "rgba(171, 239, 163, 0.16)"
                          : "rgba(255, 255, 255, 0.06)",
                        border: isConnected
                          ? "1px solid rgba(171, 239, 163, 0.55)"
                          : "1px solid rgba(255, 255, 255, 0.22)",
                        color: isConnected ? "#abefa3" : "rgba(255, 255, 255, 0.9)",
                        fontFamily: "'Space Grotesk', sans-serif",
                        fontSize: 12.5,
                        fontWeight: 600,
                      }}
                    >
                      {isConnected ? (
                        <Check size={13} className="text-[#abefa3]" />
                      ) : provider.kind === "local" ? (
                        <Cpu size={13} className="text-[#2dd4bf]" />
                      ) : (
                        <Sparkles size={13} className="text-[#2dd4bf]" />
                      )}
                      <span>{provider.label}</span>
                    </button>
                  );
                })}
              </div>
              {turnIndex === 1 && connectedModels.length === 0 && (
                <span
                  style={{
                    fontFamily: "'Rounded Mplus 1c', sans-serif",
                    fontSize: 11.5,
                    color: "rgba(255, 255, 255, 0.55)",
                  }}
                >
                  Connect at least one model provider above to continue.
                </span>
              )}
            </motion.div>
          )}

        </div>
        {showRightMargin && (
          <div
            data-name="OnboardingRightMargin"
            className="fixed inset-y-0 right-0 flex items-center justify-center p-4 pointer-events-none z-10"
            style={{ left: rightMarginLeft }}
          >
            <div className="w-full max-w-[350px] flex justify-center pointer-events-auto">
              {showHotkeyCard && (
                <div
                  data-name="OnboardingHotkeyCard"
                  className="rounded-[12px] p-3.5 flex flex-col gap-2 w-full max-w-[290px]"
                  style={{
                    background: "rgba(18, 16, 27, 0.92)",
                    border: "1px solid rgba(45, 212, 191, 0.45)",
                  }}
                >
                  <p style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 12, fontWeight: 700, color: "#2dd4bf" }}>Hotkeys</p>
                  <p style={{ fontFamily: "'Rounded Mplus 1c', sans-serif", fontSize: 12, lineHeight: 1.45, color: "rgba(255,255,255,0.9)" }}>
                    Alt+click asks a question. Voice or text, then a follow-up.
                  </p>
                  <p style={{ fontFamily: "'Rounded Mplus 1c', sans-serif", fontSize: 12, lineHeight: 1.45, color: "rgba(255,255,255,0.9)" }}>
                    Shift+click reports a problem. Confirm or ask, then a todo or an in-branch fix.
                  </p>
                  <p style={{ fontFamily: "'Rounded Mplus 1c', sans-serif", fontSize: 12, lineHeight: 1.45, color: "rgba(255,255,255,0.9)" }}>
                    Ctrl+click opens links, go-to-symbol, and import, or a quick summary.
                  </p>
                  <p style={{ fontFamily: "'Rounded Mplus 1c', sans-serif", fontSize: 11.5, color: "rgba(255,255,255,0.62)" }}>
                    Alt = question · Shift = problem.
                  </p>
                </div>
              )}
              {showStylistMargin && <StylistPreview reducedMotion={reducedMotion} />}
            </div>
          </div>
        )}
      </div>

      {/* B10 Clearly Simulated Sign-In Modal (no real OAuth, no network, no password/credentials) */}
      <AnimatePresence>
        {currentBeat === "B10" && activeModelModal && (
          <motion.div
            key="b10-faux-signin-modal"
            data-name="SimulatedModelSignInModal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-sm pointer-events-auto"
            onClick={() => setActiveModelModal(null)}
          >
            <motion.div
              initial={{ scale: 0.95, y: 8 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 8 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md rounded-[14px] p-5 flex flex-col gap-3.5"
              style={{
                background: "#12101b",
                border: "1px solid rgba(45, 212, 191, 0.45)",
                boxShadow: "0 16px 48px rgba(0, 0, 0, 0.65)",
              }}
            >
              <div className="flex items-center justify-between">
                <span
                  style={{
                    fontFamily: "'Space Grotesk', sans-serif",
                    fontSize: 15,
                    fontWeight: 700,
                    color: "#ffffff",
                  }}
                >
                  Simulated Sign-In · {activeModelModal.label}
                </span>
                <button
                  type="button"
                  onClick={() => setActiveModelModal(null)}
                  aria-label="Close simulated sign-in"
                  className="p-1 rounded text-white/50 hover:text-white"
                >
                  <X size={15} />
                </button>
              </div>
              <p
                style={{
                  fontFamily: "'Rounded Mplus 1c', sans-serif",
                  fontSize: 12.5,
                  lineHeight: 1.5,
                  color: "rgba(255, 255, 255, 0.72)",
                }}
              >
                Tutorial simulation only — no real OAuth, network request, or credentials are collected. Completing this step marks{" "}
                <strong className="text-white">{activeModelModal.label}</strong> as connected for your demo Session Agents.
              </p>
              <div className="flex items-center justify-end gap-2.5 pt-1">
                <FloatingButton
                  type="button"
                  variant="secondary"
                  onClick={() => setActiveModelModal(null)}
                >
                  Cancel
                </FloatingButton>
                <FloatingButton
                  type="button"
                  variant="primary"
                  onClick={() => {
                    connectModel(activeModelModal.id);
                    setActiveModelModal(null);
                  }}
                >
                  <Check size={14} />
                  <span>Connect {activeModelModal.label}</span>
                </FloatingButton>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Fixed bottom zone, lifted off the bottom edge: the action buttons (Submit / Sign in
          with GitHub, microphone choices, Continue) always sit directly above the chat input.
          Before the input exists (B02–B04) an invisible spacer keeps them in the same spot. */}
      <div
        data-name="PredockBottomZone"
        data-chat-shift={chatShift ? "true" : "false"}
        className="i2-chat-scale fixed inset-x-0 z-40 pointer-events-none flex flex-col items-center gap-3 px-4"
        style={{ bottom: PREDOCK_BOTTOM_OFFSET, paddingRight: shiftPad }}
      >
        <div
          data-name="DockedChatActionRow"
          className="min-h-[44px] w-full max-w-xl flex flex-wrap items-center justify-center gap-3 pointer-events-auto"
        >
          {currentBeat === "B02" && isRevealed("identity_controls") && textComplete ? (
            <motion.div
              key="b02-actions"
              initial={{ opacity: 0, y: reducedMotion ? 0 : 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: reducedMotion ? 0.25 : 0.4, ease: "easeOut" }}
              className="flex flex-wrap items-center justify-center gap-3"
            >
              <FloatingButton type="button" variant="primary" onClick={validateAndSubmitIdentity}>
                Submit
              </FloatingButton>
              <FloatingButton type="button" variant="secondary" onClick={handleGitHubSignIn}>
                <Github size={15} />
                <span>Sign in with GitHub</span>
              </FloatingButton>
            </motion.div>
          ) : currentBeat === "B06" && turnIndex === 0 && isRevealed("controls_mic_prompt") && textComplete ? (
            // Simulated microphone prompt: both choices advance, no media API is ever called.
            <motion.div
              key="b06-mic-actions"
              data-name="SimulatedMicrophonePrompt"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="flex flex-wrap items-center justify-center gap-3"
            >
              <FloatingButton
                type="button"
                variant="primary"
                onClick={() => {
                  setMicPermissionChoice("allow");
                  setTurnIndex(1);
                }}
              >
                <Mic size={14} />
                <span>Allow microphone</span>
              </FloatingButton>
              <FloatingButton
                type="button"
                variant="secondary"
                onClick={() => {
                  setMicPermissionChoice("not_now");
                  setTurnIndex(1);
                }}
              >
                <MicOff size={14} />
                <span>Not now</span>
              </FloatingButton>
            </motion.div>
          ) : showContinueNow ? (
            <motion.div
              key={`continue-${currentMessageId}`}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
              className="flex justify-center"
            >
              <FloatingContinueButton onClick={onContinue!} />
            </motion.div>
          ) : null}
        </div>

        {/* General Message Input Field Slot (when present; when absent, invisible spacer) */}
        <div className="w-full max-w-xl">
          {chatDocked ? (
            <motion.form
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              onSubmit={handleDockedChatSubmit}
              className="flex items-center gap-2.5 w-full px-3.5 py-2 rounded-[14px] pointer-events-auto"
              style={{
                background: "rgba(10, 8, 20, 0.78)",
                border: "1px solid rgba(45, 212, 191, 0.35)",
                backdropFilter: "blur(12px)",
                boxShadow: "0 8px 32px rgba(0, 0, 0, 0.4)",
              }}
            >
              <input
                id="onboarding-docked-chat-input"
                value={interestDraft}
                onChange={(e) => setInterestDraft(e.target.value)}
                placeholder="Talk to Infie…"
                className="flex-1 bg-transparent text-white text-sm placeholder-white/35 focus:outline-none"
                style={{
                  fontFamily: "'Rounded Mplus 1c', sans-serif",
                }}
              />
              <button
                type="submit"
                aria-label="Send message to Infie"
                className="inline-flex items-center justify-center size-8 rounded-[10px] transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2dd4bf]/60"
                style={{
                  background: "rgba(45, 212, 191, 0.18)",
                  border: "1px solid rgba(45, 212, 191, 0.5)",
                  color: "#2dd4bf",
                }}
              >
                <Send size={14} />
              </button>
            </motion.form>
          ) : (
            // Placeholder space maintaining the exact same layout height
            <div className="h-[42px] pointer-events-none" aria-hidden="true" />
          )}
        </div>
      </div>
      </>
    );
  }

  // From B12 onward, ordinary messages live in the docked Infie chat across Home, Project, and Session.
  // The only floating stage left is the B18 Turn 1 callout beneath the auto-opened Widgets gallery.
  if (!isFloatingCallout) {
    return null;
  }

  return (
    <motion.div
      key="b18-library-callout"
      data-name="FloatingInfieCallout"
      initial={{ opacity: 0, y: reducedMotion ? 0 : 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.15, ease: "easeOut" }}
      className="fixed inset-x-0 z-[60] flex justify-center px-6 pointer-events-none"
      style={{ bottom: "5vh", background: "transparent" }}
    >
      <div
        className="flex items-center gap-3 pointer-events-auto"
        style={{ background: "transparent", border: "none" }}
      >
        <InfieHeroArtwork
          reducedMotion={reducedMotion}
          danceNonce={danceNonce}
          size="sm"
          formId={currentForm}
        />
        <FloatingInfieMessage
          message={currentLine}
          showContinue={isRevealed("continue_button") && Boolean(onContinue)}
          onContinue={onContinue}
          onTextComplete={handleTextComplete}
        />
      </div>
    </motion.div>
  );
}
