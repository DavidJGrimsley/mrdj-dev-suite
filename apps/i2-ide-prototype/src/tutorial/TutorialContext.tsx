import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  useEffect,
  useReducer,
} from "react";
import type { PreviewVersion, SessionTabId } from "./types.ts";
import {
  createInitialFlowState,
  flowReducer,
  type FlowAction,
  type FlowState,
  type SessionFlowState,
} from "./flow.ts";
import {
  DEFAULT_PREVIEW_DEVICE,
  DEFAULT_PREVIEW_ORIENTATION,
  type PreviewDevice,
  type PreviewOrientation,
} from "./viewport.ts";

interface TutorialContextValue {
  // Jenny
  isJennyOpen: boolean;
  openJenny: () => void;
  closeJenny: () => void;
  onJennyCompletedCallback?: () => void;
  setOnJennyCompletedCallback: (cb: () => void) => void;

  // Experimemo project lifecycle (nothing exists until Jenny completes)
  flow: FlowState;
  projectCreated: boolean;
  session: SessionFlowState | null;
  sessionStarted: boolean;
  dispatchFlow: (action: FlowAction) => void;
  createProject: () => void;
  resetTutorial: () => void;

  // Session conveniences
  activeSessionTab: SessionTabId;
  setActiveSessionTab: (tab: SessionTabId) => void;
  previewVersion: PreviewVersion;

  // Shared responsive web-preview viewport (inline widget and enlarged modal)
  previewDevice: PreviewDevice;
  previewOrientation: PreviewOrientation;
  setPreviewDevice: (device: PreviewDevice) => void;
  setPreviewOrientation: (orientation: PreviewOrientation) => void;
}

const TutorialContext = createContext<TutorialContextValue | null>(null);

export function TutorialProvider({ children }: { children: React.ReactNode }) {
  const [isJennyOpen, setIsJennyOpen] = useState<boolean>(false);
  const [flow, dispatchFlow] = useReducer(flowReducer, undefined, createInitialFlowState);
  const [previewDevice, setPreviewDeviceState] = useState<PreviewDevice>(DEFAULT_PREVIEW_DEVICE);
  const [previewOrientation, setPreviewOrientationState] = useState<PreviewOrientation>(
    DEFAULT_PREVIEW_ORIENTATION
  );
  const [onJennyCompletedCallback, setOnJennyCompletedCallbackState] = useState<
    (() => void) | undefined
  >(undefined);

  const openJenny = useCallback(() => {
    setIsJennyOpen(true);
  }, []);

  const closeJenny = useCallback(() => {
    setIsJennyOpen(false);
  }, []);

  const createProject = useCallback(() => {
    setPreviewDeviceState(DEFAULT_PREVIEW_DEVICE);
    setPreviewOrientationState(DEFAULT_PREVIEW_ORIENTATION);
    dispatchFlow({ type: "CREATE_PROJECT" });
  }, []);

  const resetTutorial = useCallback(() => {
    setIsJennyOpen(false);
    dispatchFlow({ type: "RESET" });
  }, []);

  const setActiveSessionTab = useCallback((tab: SessionTabId) => {
    dispatchFlow({ type: "SET_TAB", tab });
  }, []);

  const setPreviewDevice = useCallback((device: PreviewDevice) => {
    setPreviewDeviceState(device);
  }, []);

  const setPreviewOrientation = useCallback((orientation: PreviewOrientation) => {
    setPreviewOrientationState(orientation);
  }, []);

  const setOnJennyCompletedCallback = useCallback((cb: () => void) => {
    setOnJennyCompletedCallbackState(() => cb);
  }, []);

  // Scripted steps (scanning, planning, provider work) advance on timers owned by the flow lanes.
  const homeLane = flow.lanes.home;
  const openaiLane = flow.lanes.openai;
  const claudeLane = flow.lanes.claude;
  const geminiLane = flow.lanes.gemini;
  const taskLane = flow.lanes.task;
  useEffect(() => {
    if (!homeLane) return;
    const t = window.setTimeout(() => dispatchFlow(homeLane.action), homeLane.delay);
    return () => window.clearTimeout(t);
  }, [homeLane]);
  useEffect(() => {
    if (!openaiLane) return;
    const t = window.setTimeout(() => dispatchFlow(openaiLane.action), openaiLane.delay);
    return () => window.clearTimeout(t);
  }, [openaiLane]);
  useEffect(() => {
    if (!claudeLane) return;
    const t = window.setTimeout(() => dispatchFlow(claudeLane.action), claudeLane.delay);
    return () => window.clearTimeout(t);
  }, [claudeLane]);
  useEffect(() => {
    if (!geminiLane) return;
    const t = window.setTimeout(() => dispatchFlow(geminiLane.action), geminiLane.delay);
    return () => window.clearTimeout(t);
  }, [geminiLane]);
  useEffect(() => {
    if (!taskLane) return;
    const reduced =
      typeof window !== "undefined" &&
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const delay = reduced ? Math.min(taskLane.delay, 250) : taskLane.delay;
    const t = window.setTimeout(() => dispatchFlow(taskLane.action), delay);
    return () => window.clearTimeout(t);
  }, [taskLane]);

  // Escape key handler: closes Jenny if open
  useEffect(() => {
    if (!isJennyOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        closeJenny();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isJennyOpen, closeJenny]);

  const session = flow.session;
  const activeSessionTab: SessionTabId = session?.activeTab ?? "infie";
  const previewVersion: PreviewVersion = flow.projectPreviewVersion;

  const value: TutorialContextValue = useMemo(
    () => ({
      isJennyOpen,
      openJenny,
      closeJenny,
      onJennyCompletedCallback,
      setOnJennyCompletedCallback,
      flow,
      projectCreated: flow.projectCreated,
      session,
      sessionStarted: session !== null,
      dispatchFlow,
      createProject,
      resetTutorial,
      activeSessionTab,
      setActiveSessionTab,
      previewVersion,
      previewDevice,
      previewOrientation,
      setPreviewDevice,
      setPreviewOrientation,
    }),
    [
      isJennyOpen,
      openJenny,
      closeJenny,
      onJennyCompletedCallback,
      setOnJennyCompletedCallback,
      flow,
      session,
      createProject,
      resetTutorial,
      activeSessionTab,
      setActiveSessionTab,
      previewVersion,
      previewDevice,
      previewOrientation,
      setPreviewDevice,
      setPreviewOrientation,
    ]
  );

  return (
    <TutorialContext.Provider value={value}>{children}</TutorialContext.Provider>
  );
}

export function useTutorial(): TutorialContextValue {
  const ctx = useContext(TutorialContext);
  if (!ctx) {
    throw new Error("useTutorial must be used within a TutorialProvider");
  }
  return ctx;
}
