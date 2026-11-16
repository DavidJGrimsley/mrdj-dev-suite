import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useState,
  type ReactNode,
} from "react";
import { assetUrl } from "../assetUrl";
import {
  clearPetReplayState,
  getPetPreviewVersionForTarget,
  getRemainingCodingMs,
  getRemainingCodingSeconds,
  loadPetReplayState,
  PET_AGENT_TASKS_PENDING,
  PET_DIFF_SUMMARY,
  PET_PLAN_MD_TEXT,
  PET_SOURCE_DIFFS,
  PET_WRAP_UP_STEP_DELAY_MS,
  petReplayReducer,
  savePetReplayState,
  type PetArtifactsBundle,
  type PetDiffEntry,
  type PetReplayState,
} from "./petSessionData";

interface PetSessionContextValue {
  state: PetReplayState;
  remainingMs: number;
  remainingSeconds: number;
  planMd: string;
  taskLabel: string;
  sourceDiffs: readonly PetDiffEntry[];
  diffSummary: { commitFiles: string; branchFiles: string; add: string; del: string };
  approvePlan: () => void;
  testApp: () => void;
  toggleChecklistItem: (id: string) => void;
  verifyTesting: () => void;
  openPr: () => void;
  startWrapUp: () => void;
  mergePr: () => void;
  submitBlankReport: () => void;
  updateMain: () => void;
  reconcile: () => void;
  selectBranchPreview: (target: string) => void;
  sendUserMessage: (text: string) => void;
  resetReplay: () => void;
  previewVersionFor: (target: string) => "v1" | "v2";
}

const PetSessionContext = createContext<PetSessionContextValue | null>(null);

export function PetSessionProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(petReplayReducer, undefined, () => loadPetReplayState());
  const [nowMs, setNowMs] = useState<number>(() => Date.now());
  const [artifacts, setArtifacts] = useState<PetArtifactsBundle | null>(null);

  useEffect(() => {
    let alive = true;
    fetch(assetUrl("/workspace-files/pet-add-comments.json"))
      .then(async (res) => {
        if (!res.ok) return null;
        const data = JSON.parse(await res.text()) as PetArtifactsBundle;
        return data && Array.isArray(data.files) ? data : null;
      })
      .then((bundle) => {
        if (alive && bundle) setArtifacts(bundle);
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    savePetReplayState(state);
  }, [state]);

  useEffect(() => {
    if (state.status !== "CODING" || state.deadline === null) return;
    const check = () => {
      const current = Date.now();
      setNowMs(current);
      if (state.deadline !== null && current >= state.deadline) {
        dispatch({ type: "TICK", now: current });
      }
    };
    check();
    const interval = window.setInterval(check, 250);
    const msLeft = Math.max(0, state.deadline - Date.now());
    const exactTimer = window.setTimeout(check, msLeft + 20);
    return () => {
      window.clearInterval(interval);
      window.clearTimeout(exactTimer);
    };
  }, [state.status, state.deadline]);

  // Simulated wrap-up polling: one scripted check per tick. Resumes from the saved step after a reload.
  useEffect(() => {
    if (state.status !== "PR OPEN" || state.wrapUpPhase !== "polling") return;
    const timer = window.setTimeout(() => dispatch({ type: "WRAP_UP_STEP" }), PET_WRAP_UP_STEP_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [state.status, state.wrapUpPhase, state.wrapUpStep]);

  const approvePlan = useCallback(() => {
    const now = Date.now();
    setNowMs(now);
    dispatch({ type: "APPROVE_PLAN", now });
  }, []);

  const testApp = useCallback(() => dispatch({ type: "TEST_APP" }), []);
  const toggleChecklistItem = useCallback((id: string) => dispatch({ type: "TOGGLE_CHECKLIST", id }), []);
  const verifyTesting = useCallback(() => dispatch({ type: "VERIFY_TESTING" }), []);
  const openPr = useCallback(() => dispatch({ type: "OPEN_PR" }), []);
  const startWrapUp = useCallback(() => dispatch({ type: "START_WRAP_UP" }), []);
  const mergePr = useCallback(() => dispatch({ type: "MERGE_PR" }), []);
  const submitBlankReport = useCallback(() => dispatch({ type: "SUBMIT_BLANK_REPORT" }), []);
  const updateMain = useCallback(() => dispatch({ type: "UPDATE_MAIN" }), []);
  const reconcile = useCallback(() => dispatch({ type: "RECONCILE" }), []);
  const selectBranchPreview = useCallback(
    (target: string) => dispatch({ type: "SELECT_BRANCH_PREVIEW", target }),
    [],
  );
  const sendUserMessage = useCallback(
    (text: string) => dispatch({ type: "SEND_USER_MESSAGE", text }),
    [],
  );
  const resetReplay = useCallback(() => {
    clearPetReplayState();
    dispatch({ type: "RESET" });
  }, []);

  const previewVersionFor = useCallback(
    (target: string) => getPetPreviewVersionForTarget(target, state),
    [state],
  );

  const remainingMs = getRemainingCodingMs(state, nowMs);
  const remainingSeconds = getRemainingCodingSeconds(state, nowMs);
  const planMd = artifacts?.planMd || PET_PLAN_MD_TEXT;
  const taskLabel = artifacts?.taskLabel || PET_AGENT_TASKS_PENDING[0].label;
  const sourceDiffs = artifacts?.files ?? PET_SOURCE_DIFFS;
  const diffSummary = artifacts?.summary ?? PET_DIFF_SUMMARY;

  const value = useMemo<PetSessionContextValue>(
    () => ({
      state,
      remainingMs,
      remainingSeconds,
      planMd,
      taskLabel,
      sourceDiffs,
      diffSummary,
      approvePlan,
      testApp,
      toggleChecklistItem,
      verifyTesting,
      openPr,
      startWrapUp,
      mergePr,
      submitBlankReport,
      updateMain,
      reconcile,
      selectBranchPreview,
      sendUserMessage,
      resetReplay,
      previewVersionFor,
    }),
    [
      state,
      remainingMs,
      remainingSeconds,
      planMd,
      taskLabel,
      sourceDiffs,
      diffSummary,
      approvePlan,
      testApp,
      toggleChecklistItem,
      verifyTesting,
      openPr,
      startWrapUp,
      mergePr,
      submitBlankReport,
      updateMain,
      reconcile,
      selectBranchPreview,
      sendUserMessage,
      resetReplay,
      previewVersionFor,
    ],
  );

  return <PetSessionContext.Provider value={value}>{children}</PetSessionContext.Provider>;
}

export function usePetSession(): PetSessionContextValue {
  const ctx = useContext(PetSessionContext);
  if (!ctx) throw new Error("PetSessionProvider is missing");
  return ctx;
}
