import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Sparkles,
  Layers,
  CheckCircle2,
  Loader2,
  X,
  Clock,
  ArrowRight,
  Shield,
  Palette,
  Database,
  Smartphone,
  Compass,
  FileCheck,
} from "lucide-react";
import {
  createInitialTutorialBlueprint,
  SCRIPTED_JENNY_TURNS,
  JENNY_SUMMARY_MESSAGE,
  APPROVAL_ANSWER_TEXT,
} from "./scriptedData.ts";
import type { TutorialBlueprintState } from "./types.ts";

interface TutorialJennyScreenProps {
  onComplete: () => void;
  onClose: () => void;
  className?: string;
}

interface DisplayMessage {
  id: string;
  role: "jenny" | "user";
  text: string;
}

export function TutorialJennyScreen({
  onComplete,
  onClose,
  className = "",
}: TutorialJennyScreenProps) {
  // Turn index: 0 to 25 (questions 1 to 26), 26 is summary/approval
  const [currentTurnIndex, setCurrentTurnIndex] = useState<number>(0);
  const [blueprint, setBlueprint] = useState<TutorialBlueprintState>(() =>
    createInitialTutorialBlueprint()
  );
  const [messages, setMessages] = useState<DisplayMessage[]>([
    {
      id: "jenny-q-0",
      role: "jenny",
      text: SCRIPTED_JENNY_TURNS[0].question,
    },
  ]);
  const [isAdvancing, setIsAdvancing] = useState<boolean>(false);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [generationStep, setGenerationStep] = useState<string>("");
  const [mobileTab, setMobileTab] = useState<"chat" | "blueprint">("chat");

  const chatScrollRef = useRef<HTMLDivElement>(null);
  const isAdvancingRef = useRef<boolean>(false);

  // Auto-scroll chat to bottom on new messages
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTo({
        top: chatScrollRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [messages]);

  // Handle clicking the single fixed sample answer
  const handleAnswerClick = useCallback(() => {
    // Double click guard: prevent advancing twice
    if (isAdvancingRef.current || isAdvancing) return;

    if (currentTurnIndex < SCRIPTED_JENNY_TURNS.length) {
      isAdvancingRef.current = true;
      setIsAdvancing(true);

      const turn = SCRIPTED_JENNY_TURNS[currentTurnIndex];

      // 1. Append user answer
      const userMsg: DisplayMessage = {
        id: `user-a-${turn.turnIndex}`,
        role: "user",
        text: turn.answer,
      };

      // 2. Patch blueprint with ONLY this turn's data
      setBlueprint((prev) => turn.patch(prev));

      // 3. Next turn logic
      const nextTurnIdx = currentTurnIndex + 1;
      setCurrentTurnIndex(nextTurnIdx);

      if (nextTurnIdx < SCRIPTED_JENNY_TURNS.length) {
        // Next question
        const nextQ = SCRIPTED_JENNY_TURNS[nextTurnIdx];
        const jennyMsg: DisplayMessage = {
          id: `jenny-q-${nextQ.turnIndex}`,
          role: "jenny",
          text: nextQ.question,
        };
        setMessages((prev) => [...prev, userMsg, jennyMsg]);
      } else {
        // Summary & propose roadmap tasks
        const summaryMsg: DisplayMessage = {
          id: "jenny-summary",
          role: "jenny",
          text: JENNY_SUMMARY_MESSAGE,
        };
        setMessages((prev) => [...prev, userMsg, summaryMsg]);
      }

      // Reset double click lock after short tick
      setTimeout(() => {
        isAdvancingRef.current = false;
        setIsAdvancing(false);
      }, 50);
    } else if (currentTurnIndex === SCRIPTED_JENNY_TURNS.length) {
      // Final approval: Yes, generate Experimemo
      isAdvancingRef.current = true;
      setIsAdvancing(true);

      const approvalMsg: DisplayMessage = {
        id: "user-approval",
        role: "user",
        text: APPROVAL_ANSWER_TEXT,
      };
      setMessages((prev) => [...prev, approvalMsg]);

      setIsGenerating(true);
      setGenerationStep("Analyzing Experimemo requirements...");

      setTimeout(() => {
        setGenerationStep(
          "Resolving Exact framework templates and starter workspace..."
        );
        setTimeout(() => {
          setGenerationStep(
            "Generating app.contract, app.ts, and project memory..."
          );
          setTimeout(() => {
            setGenerationStep("Verification clean. Project ready!");
            setTimeout(() => {
              setIsGenerating(false);
              isAdvancingRef.current = false;
              setIsAdvancing(false);
              onComplete();
            }, 500);
          }, 400);
        }, 400);
      }, 400);
    }
  }, [currentTurnIndex, isAdvancing, onComplete]);

  // Current answer button text
  const currentAnswerText =
    currentTurnIndex < SCRIPTED_JENNY_TURNS.length
      ? SCRIPTED_JENNY_TURNS[currentTurnIndex].answer
      : currentTurnIndex === SCRIPTED_JENNY_TURNS.length
      ? APPROVAL_ANSWER_TEXT
      : null;

  return (
    <div
      data-testid="tutorial-jenny-screen"
      className={`fixed inset-0 z-50 flex flex-col bg-[#09090d] text-[#e4e4e7] overflow-hidden select-none ${className}`}
    >
      {/* Mobile Tab Toggle (< 768px) */}
      <div className="flex md:hidden items-center justify-between px-4 py-2 bg-[#121216] border-b border-[#27272a] shrink-0">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setMobileTab("chat")}
            className={`px-3 py-1 rounded text-[12px] font-medium transition-colors ${
              mobileTab === "chat"
                ? "bg-[#2dd4bf] text-[#042f2e] font-semibold"
                : "text-[#a1a1aa] hover:text-white"
            }`}
          >
            Chat
          </button>
          <button
            type="button"
            onClick={() => setMobileTab("blueprint")}
            className={`px-3 py-1 rounded text-[12px] font-medium transition-colors ${
              mobileTab === "blueprint"
                ? "bg-[#2dd4bf] text-[#042f2e] font-semibold"
                : "text-[#a1a1aa] hover:text-white"
            }`}
          >
            Blueprint
          </button>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close Jenny"
          className="p-1.5 rounded text-[#71717a] hover:text-white hover:bg-white/10"
        >
          <X size={16} />
        </button>
      </div>

      {/* Main Full-Viewport Split: Blueprint Left, Chat Right */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden relative">
        {/* Left: Blueprint Panel */}
        <div
          data-testid="blueprint-panel"
          className={`w-full md:w-[46%] lg:w-[44%] flex flex-col border-r border-[#27272a] bg-[#0c0c10] overflow-y-auto p-5 md:p-6 space-y-4 ${
            mobileTab === "blueprint" ? "flex" : "hidden md:flex"
          }`}
        >
          {/* Blueprint Header */}
          <div className="flex items-center justify-between pb-3 border-b border-[#27272a] shrink-0">
            <div className="flex items-center gap-2">
              <Layers size={16} className="text-[#2dd4bf]" />
              <h3 className="text-[13px] font-semibold text-white uppercase tracking-wider">
                Project Blueprint
              </h3>
            </div>
            <span
              data-testid="blueprint-framework-badge"
              className="text-[11px] px-2 py-0.5 rounded bg-white/5 text-[#a1a1aa] font-mono"
            >
              {blueprint.framework.isDiscussed
                ? `${blueprint.framework.value} framework`
                : "Framework: Not discussed"}
            </span>
          </div>

          {/* Blueprint Sections */}
          <div className="space-y-4 text-[12px]">
            {/* 1. Identity & Name */}
            <div
              id="bp-section-identity"
              className="p-3.5 rounded-xl bg-[#141419] border border-[#27272a] space-y-3"
            >
              <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-[#71717a]">
                <Layers size={12} className="text-[#2dd4bf]" />
                <span>Identity & Purpose</span>
              </div>

              <div>
                <label className="text-[10px] text-[#71717a] uppercase font-semibold">
                  Project Name
                </label>
                <div
                  data-testid="bp-project-name"
                  className={`mt-0.5 font-mono text-[13px] font-semibold ${
                    blueprint.projectName.isDiscussed
                      ? "text-[#2dd4bf]"
                      : "text-[#52525b] italic"
                  }`}
                >
                  {blueprint.projectName.isDiscussed
                    ? blueprint.projectName.value
                    : "Not discussed"}
                </div>
              </div>

              <div>
                <label className="text-[10px] text-[#71717a] uppercase font-semibold">
                  Overview & Scope
                </label>
                <div
                  data-testid="bp-overview"
                  className={`mt-0.5 leading-relaxed ${
                    blueprint.overview.isDiscussed
                      ? "text-[#e4e4e7]"
                      : "text-[#52525b] italic"
                  }`}
                >
                  {blueprint.overview.isDiscussed
                    ? blueprint.overview.value
                    : "Not discussed"}
                </div>
              </div>

              <div>
                <label className="text-[10px] text-[#71717a] uppercase font-semibold">
                  Target Audience
                </label>
                <div
                  data-testid="bp-target-audience"
                  className={`mt-0.5 leading-relaxed ${
                    blueprint.targetAudience.isDiscussed
                      ? "text-[#d4d4d8]"
                      : "text-[#52525b] italic"
                  }`}
                >
                  {blueprint.targetAudience.isDiscussed
                    ? blueprint.targetAudience.value
                    : "Not discussed"}
                </div>
              </div>
            </div>

            {/* 2. Platform & Framework */}
            <div
              id="bp-section-platform"
              className="p-3.5 rounded-xl bg-[#141419] border border-[#27272a] space-y-3"
            >
              <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-[#71717a]">
                <Smartphone size={12} className="text-[#2dd4bf]" />
                <span>Platform & Framework</span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-[#71717a] uppercase font-semibold">
                    Target Platforms
                  </label>
                  <div
                    data-testid="bp-platforms"
                    className={`mt-0.5 font-mono text-[12px] ${
                      blueprint.targetPlatforms.isDiscussed
                        ? "text-[#2dd4bf]"
                        : "text-[#52525b] italic"
                    }`}
                  >
                    {blueprint.targetPlatforms.isDiscussed
                      ? blueprint.targetPlatforms.value?.join(", ")
                      : "Not discussed"}
                  </div>
                </div>

                <div>
                  <label className="text-[10px] text-[#71717a] uppercase font-semibold">
                    Framework
                  </label>
                  <div
                    data-testid="bp-framework"
                    className={`mt-0.5 font-mono text-[12px] ${
                      blueprint.framework.isDiscussed
                        ? "text-[#2dd4bf]"
                        : "text-[#52525b] italic"
                    }`}
                  >
                    {blueprint.framework.isDiscussed
                      ? blueprint.framework.value
                      : "Not discussed"}
                  </div>
                </div>
              </div>

              <div>
                <label className="text-[10px] text-[#71717a] uppercase font-semibold">
                  First Target Platform (Preview Priority)
                </label>
                <div
                  data-testid="bp-first-platform"
                  className={`mt-0.5 ${
                    blueprint.firstTargetPlatform.isDiscussed
                      ? "text-[#d4d4d8]"
                      : "text-[#52525b] italic"
                  }`}
                >
                  {blueprint.firstTargetPlatform.isDiscussed
                    ? blueprint.firstTargetPlatform.value
                    : "Not discussed"}
                </div>
              </div>
            </div>

            {/* 3. Scope & Goals */}
            <div
              id="bp-section-goals"
              className="p-3.5 rounded-xl bg-[#141419] border border-[#27272a] space-y-3"
            >
              <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-[#71717a]">
                <Compass size={12} className="text-[#2dd4bf]" />
                <span>Scope, Goals & Boundaries</span>
              </div>

              <div>
                <label className="text-[10px] text-[#71717a] uppercase font-semibold">
                  Problem Statement
                </label>
                <div
                  data-testid="bp-problem"
                  className={`mt-0.5 ${
                    blueprint.problemStatement.isDiscussed
                      ? "text-[#d4d4d8]"
                      : "text-[#52525b] italic"
                  }`}
                >
                  {blueprint.problemStatement.isDiscussed
                    ? blueprint.problemStatement.value
                    : "Not discussed"}
                </div>
              </div>

              <div>
                <label className="text-[10px] text-[#71717a] uppercase font-semibold">
                  Success Criteria / Goals
                </label>
                <div
                  data-testid="bp-goals"
                  className={`mt-0.5 ${
                    blueprint.productGoals.isDiscussed
                      ? "text-[#d4d4d8]"
                      : "text-[#52525b] italic"
                  }`}
                >
                  {blueprint.productGoals.isDiscussed
                    ? blueprint.productGoals.value
                    : "Not discussed"}
                </div>
              </div>

              <div>
                <label className="text-[10px] text-[#71717a] uppercase font-semibold">
                  Non-Goals (Out of Scope)
                </label>
                <div
                  data-testid="bp-non-goals"
                  className={`mt-0.5 ${
                    blueprint.nonGoals.isDiscussed
                      ? "text-[#d4d4d8]"
                      : "text-[#52525b] italic"
                  }`}
                >
                  {blueprint.nonGoals.isDiscussed
                    ? blueprint.nonGoals.value
                    : "Not discussed"}
                </div>
              </div>

              <div>
                <label className="text-[10px] text-[#71717a] uppercase font-semibold">
                  Future Scope (Later Ideas)
                </label>
                <div
                  data-testid="bp-later-scope"
                  className={`mt-0.5 ${
                    blueprint.laterScope.isDiscussed
                      ? "text-[#d4d4d8]"
                      : "text-[#52525b] italic"
                  }`}
                >
                  {blueprint.laterScope.isDiscussed
                    ? blueprint.laterScope.value
                    : "Not discussed"}
                </div>
              </div>
            </div>

            {/* 4. Features & User Flows */}
            <div
              id="bp-section-flows"
              className="p-3.5 rounded-xl bg-[#141419] border border-[#27272a] space-y-3"
            >
              <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-[#71717a]">
                <CheckCircle2 size={12} className="text-[#2dd4bf]" />
                <span>Features & Flows</span>
              </div>

              <div>
                <label className="text-[10px] text-[#71717a] uppercase font-semibold">
                  Primary Flow (First Action)
                </label>
                <div
                  data-testid="bp-core-flows"
                  className={`mt-0.5 ${
                    blueprint.coreFlows.isDiscussed
                      ? "text-[#d4d4d8]"
                      : "text-[#52525b] italic"
                  }`}
                >
                  {blueprint.coreFlows.isDiscussed
                    ? blueprint.coreFlows.value
                    : "Not discussed"}
                </div>
              </div>

              <div>
                <label className="text-[10px] text-[#71717a] uppercase font-semibold">
                  Key Features & Information
                </label>
                {blueprint.keyFeatures.isDiscussed &&
                blueprint.keyFeatures.value &&
                blueprint.keyFeatures.value.length > 0 ? (
                  <ul
                    data-testid="bp-key-features"
                    className="mt-1 space-y-1 pl-1"
                  >
                    {blueprint.keyFeatures.value.map((feat, i) => (
                      <li
                        key={i}
                        className="flex items-start gap-1.5 text-[11.5px] text-[#e4e4e7]"
                      >
                        <span className="text-[#2dd4bf] mt-0.5">•</span>
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div
                    data-testid="bp-key-features"
                    className="mt-0.5 text-[#52525b] italic"
                  >
                    Not discussed
                  </div>
                )}
              </div>

              <div>
                <label className="text-[10px] text-[#71717a] uppercase font-semibold">
                  Screens & Views
                </label>
                {blueprint.screens.isDiscussed &&
                blueprint.screens.value &&
                blueprint.screens.value.length > 0 ? (
                  <div
                    data-testid="bp-screens"
                    className="mt-1 flex flex-wrap gap-1.5"
                  >
                    {blueprint.screens.value.map((s, i) => (
                      <span
                        key={i}
                        className="px-2 py-0.5 rounded bg-[#27272a] text-[#d4d4d8] text-[11px] font-mono"
                      >
                        {s}
                      </span>
                    ))}
                  </div>
                ) : (
                  <div
                    data-testid="bp-screens"
                    className="mt-0.5 text-[#52525b] italic"
                  >
                    Not discussed
                  </div>
                )}
              </div>
            </div>

            {/* 5. Data & Architecture */}
            <div
              id="bp-section-data"
              className="p-3.5 rounded-xl bg-[#141419] border border-[#27272a] space-y-3"
            >
              <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-[#71717a]">
                <Database size={12} className="text-[#2dd4bf]" />
                <span>Data & Architecture</span>
              </div>

              <div>
                <label className="text-[10px] text-[#71717a] uppercase font-semibold">
                  Data Stored
                </label>
                <div
                  data-testid="bp-data-stored"
                  className={`mt-0.5 ${
                    blueprint.dataStored.isDiscussed
                      ? "text-[#d4d4d8]"
                      : "text-[#52525b] italic"
                  }`}
                >
                  {blueprint.dataStored.isDiscussed
                    ? blueprint.dataStored.value
                    : "Not discussed"}
                </div>
              </div>

              <div>
                <label className="text-[10px] text-[#71717a] uppercase font-semibold">
                  Storage & Offline Sync
                </label>
                <div
                  data-testid="bp-data-storage"
                  className={`mt-0.5 ${
                    blueprint.dataStorage.isDiscussed
                      ? "text-[#d4d4d8]"
                      : "text-[#52525b] italic"
                  }`}
                >
                  {blueprint.dataStorage.isDiscussed
                    ? blueprint.dataStorage.value
                    : "Not discussed"}
                </div>
              </div>

              <div>
                <label className="text-[10px] text-[#71717a] uppercase font-semibold">
                  Accounts & Backend
                </label>
                <div
                  data-testid="bp-authentication"
                  className={`mt-0.5 ${
                    blueprint.authentication.isDiscussed
                      ? "text-[#d4d4d8]"
                      : "text-[#52525b] italic"
                  }`}
                >
                  {blueprint.authentication.isDiscussed
                    ? blueprint.authentication.value
                    : "Not discussed"}
                </div>
              </div>
            </div>

            {/* 6. Design & Style */}
            <div
              id="bp-section-design"
              className="p-3.5 rounded-xl bg-[#141419] border border-[#27272a] space-y-3"
            >
              <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-[#71717a]">
                <Palette size={12} className="text-[#2dd4bf]" />
                <span>Visual Style & Navigation</span>
              </div>

              <div>
                <label className="text-[10px] text-[#71717a] uppercase font-semibold">
                  Visual Style
                </label>
                <div
                  data-testid="bp-visual-style"
                  className={`mt-0.5 ${
                    blueprint.visualStyle.isDiscussed
                      ? "text-[#d4d4d8]"
                      : "text-[#52525b] italic"
                  }`}
                >
                  {blueprint.visualStyle.isDiscussed
                    ? blueprint.visualStyle.value
                    : "Not discussed"}
                </div>
              </div>

              <div>
                <label className="text-[10px] text-[#71717a] uppercase font-semibold">
                  Navigation Pattern
                </label>
                <div
                  data-testid="bp-navigation"
                  className={`mt-0.5 ${
                    blueprint.navigationPattern.isDiscussed
                      ? "text-[#d4d4d8]"
                      : "text-[#52525b] italic"
                  }`}
                >
                  {blueprint.navigationPattern.isDiscussed
                    ? blueprint.navigationPattern.value
                    : "Not discussed"}
                </div>
              </div>

              <div>
                <label className="text-[10px] text-[#71717a] uppercase font-semibold">
                  UI Style & Layout
                </label>
                <div
                  data-testid="bp-references"
                  className={`mt-0.5 ${
                    blueprint.referenceDesigns.isDiscussed
                      ? "text-[#d4d4d8]"
                      : "text-[#52525b] italic"
                  }`}
                >
                  {blueprint.referenceDesigns.isDiscussed
                    ? blueprint.referenceDesigns.value
                    : "Not discussed"}
                </div>
              </div>
            </div>

            {/* 7. Operations, Team & Monetization */}
            <div
              id="bp-section-operations"
              className="p-3.5 rounded-xl bg-[#141419] border border-[#27272a] space-y-3"
            >
              <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-[#71717a]">
                <Shield size={12} className="text-[#2dd4bf]" />
                <span>Operations & Release</span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-[#71717a] uppercase font-semibold">
                    Monetization
                  </label>
                  <div
                    data-testid="bp-monetization"
                    className={`mt-0.5 ${
                      blueprint.monetizationStrategy.isDiscussed
                        ? "text-[#d4d4d8]"
                        : "text-[#52525b] italic"
                    }`}
                  >
                    {blueprint.monetizationStrategy.isDiscussed
                      ? blueprint.monetizationStrategy.value
                      : "Not discussed"}
                  </div>
                </div>

                <div>
                  <label className="text-[10px] text-[#71717a] uppercase font-semibold">
                    Team & Maintenance
                  </label>
                  <div
                    data-testid="bp-team"
                    className={`mt-0.5 ${
                      blueprint.teamContext.isDiscussed
                        ? "text-[#d4d4d8]"
                        : "text-[#52525b] italic"
                    }`}
                  >
                    {blueprint.teamContext.isDiscussed
                      ? blueprint.teamContext.value
                      : "Not discussed"}
                  </div>
                </div>
              </div>

              <div>
                <label className="text-[10px] text-[#71717a] uppercase font-semibold">
                  Onboarding Gate
                </label>
                <div
                  data-testid="bp-onboarding"
                  className={`mt-0.5 ${
                    blueprint.onboardingFlow.isDiscussed
                      ? "text-[#d4d4d8]"
                      : "text-[#52525b] italic"
                  }`}
                >
                  {blueprint.onboardingFlow.isDiscussed
                    ? blueprint.onboardingFlow.value
                    : "Not discussed"}
                </div>
              </div>

              <div>
                <label className="text-[10px] text-[#71717a] uppercase font-semibold">
                  Distribution Strategy
                </label>
                <div
                  data-testid="bp-distribution"
                  className={`mt-0.5 ${
                    blueprint.distribution.isDiscussed
                      ? "text-[#d4d4d8]"
                      : "text-[#52525b] italic"
                  }`}
                >
                  {blueprint.distribution.isDiscussed
                    ? blueprint.distribution.value
                    : "Not discussed"}
                </div>
              </div>

              <div>
                <label className="text-[10px] text-[#71717a] uppercase font-semibold">
                  Legal & Support Readiness
                </label>
                <div
                  data-testid="bp-legal-support"
                  className={`mt-0.5 ${
                    blueprint.legalSupport.isDiscussed
                      ? "text-[#d4d4d8]"
                      : "text-[#52525b] italic"
                  }`}
                >
                  {blueprint.legalSupport.isDiscussed
                    ? blueprint.legalSupport.value
                    : "Not discussed"}
                </div>
              </div>
            </div>

            {/* 8. Quality & Standards */}
            <div
              id="bp-section-quality"
              className="p-3.5 rounded-xl bg-[#141419] border border-[#27272a] space-y-3"
            >
              <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-[#71717a]">
                <FileCheck size={12} className="text-[#2dd4bf]" />
                <span>Project Setup & Quality Checks</span>
              </div>

              <div>
                <label className="text-[10px] text-[#71717a] uppercase font-semibold">
                  Workspace & Contract Setup
                </label>
                <div
                  data-testid="bp-setup"
                  className={`mt-0.5 ${
                    blueprint.projectSetup.isDiscussed
                      ? "text-[#d4d4d8]"
                      : "text-[#52525b] italic"
                  }`}
                >
                  {blueprint.projectSetup.isDiscussed
                    ? blueprint.projectSetup.value
                    : "Not discussed"}
                </div>
              </div>

              <div>
                <label className="text-[10px] text-[#71717a] uppercase font-semibold">
                  i² Guidelines & Quality Checks
                </label>
                <div
                  data-testid="bp-guidelines"
                  className={`mt-0.5 ${
                    blueprint.mdsGuidelines.isDiscussed
                      ? "text-[#d4d4d8]"
                      : "text-[#52525b] italic"
                  }`}
                >
                  {blueprint.mdsGuidelines.isDiscussed
                    ? blueprint.mdsGuidelines.value
                    : "Not discussed"}
                </div>
              </div>
            </div>

            {/* 9. Proposed Roadmap (Tasks appear ONLY after turn 26!) */}
            {blueprint.roadmapTasks && blueprint.roadmapTasks.length > 0 && (
              <div
                id="bp-section-roadmap"
                data-testid="bp-roadmap-tasks"
                className="p-3.5 rounded-xl bg-[#181822] border border-[#2dd4bf]/40 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-[#2dd4bf]">
                    <Clock size={12} className="text-[#2dd4bf]" />
                    <span>Proposed Initial Roadmap Tasks</span>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-[#2dd4bf]/15 text-[#2dd4bf] font-mono">
                    PROPOSED
                  </span>
                </div>

                <div className="space-y-2">
                  {blueprint.roadmapTasks.map((t, idx) => (
                    <div
                      key={t.id}
                      data-testid={`roadmap-task-${idx}`}
                      className="p-2.5 rounded-lg bg-[#111116] border border-[#27272a] flex items-center justify-between"
                    >
                      <span className="text-[12px] font-medium text-white/90">
                        {t.title}
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20 font-mono uppercase">
                        {t.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right: Jenny Chat Panel */}
        <div
          data-testid="jenny-chat-panel"
          className={`w-full md:w-[54%] lg:w-[56%] flex flex-col bg-[#09090d] overflow-hidden ${
            mobileTab === "chat" ? "flex" : "hidden md:flex"
          }`}
        >
          {/* Header inside conversation: Jenny identity + Demo pill + Close button */}
          <div className="flex items-center justify-between px-6 py-3.5 bg-[#101014] border-b border-[#27272a] shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-[#2dd4bf]/10 text-[#2dd4bf] border border-[#2dd4bf]/20">
                <Sparkles size={16} />
              </div>
              <div className="flex items-center gap-2">
                <h2 className="text-[14px] font-bold text-white tracking-tight">
                  Jenny
                </h2>
                <span
                  data-testid="demo-indicator"
                  className="text-[10px] px-2 py-0.5 rounded font-mono bg-[#2dd4bf]/10 text-[#2dd4bf] border border-[#2dd4bf]/20"
                >
                  DEMO SIMULATION
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label="Close Jenny"
              className="p-1.5 rounded-lg text-[#71717a] hover:text-white hover:bg-white/10 transition-colors"
              title="Close Jenny"
            >
              <X size={16} />
            </button>
          </div>

          {/* Messages Scroll Area */}
          <div
            ref={chatScrollRef}
            data-testid="chat-messages-container"
            className="flex-1 overflow-y-auto p-6 space-y-4"
          >
            {messages.map((msg) => {
              const isJenny = msg.role === "jenny";
              return (
                <div
                  key={msg.id}
                  data-testid={`chat-message-${msg.role}`}
                  className={`flex flex-col gap-1 ${
                    isJenny ? "items-start" : "items-end"
                  }`}
                >
                  <span className="text-[11px] text-[#71717a] font-medium px-1">
                    {isJenny ? "Jenny" : "You"}
                  </span>
                  <div
                    className={`rounded-2xl px-4 py-3 text-[13px] leading-relaxed max-w-[85%] whitespace-pre-line ${
                      isJenny
                        ? "bg-[#16161c] border border-[#27272a] text-[#f4f4f5]"
                        : "bg-[#2dd4bf] text-[#042f2e] font-medium shadow-sm"
                    }`}
                  >
                    {msg.text}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Bottom Fixed Sample Answer Bar (No user typing) */}
          <div className="p-4 bg-[#101014] border-t border-[#27272a] shrink-0">
            {currentAnswerText ? (
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between text-[11px] text-[#71717a] px-1">
                  <span>Sample Answer (Click to advance)</span>
                  <span className="font-mono text-[10px]">
                    {currentTurnIndex < SCRIPTED_JENNY_TURNS.length
                      ? `Turn ${currentTurnIndex + 1} of 26`
                      : "Blueprint Finalized"}
                  </span>
                </div>
                <button
                  type="button"
                  data-testid="sample-answer-button"
                  onClick={handleAnswerClick}
                  disabled={isAdvancing || isGenerating}
                  className={`w-full flex items-center justify-between gap-3 px-4 py-3 rounded-xl border text-left transition-all ${
                    isAdvancing || isGenerating
                      ? "opacity-50 pointer-events-none bg-[#1c1c22] border-[#27272a] text-[#71717a]"
                      : currentTurnIndex === SCRIPTED_JENNY_TURNS.length
                      ? "bg-[#2dd4bf] hover:bg-[#14b8a6] text-[#042f2e] border-[#2dd4bf] font-semibold shadow-md"
                      : "bg-[#181820] hover:bg-[#20202a] border-[#2dd4bf]/30 hover:border-[#2dd4bf] text-white shadow-sm"
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Sparkles
                      size={15}
                      className={
                        currentTurnIndex === SCRIPTED_JENNY_TURNS.length
                          ? "text-[#042f2e] shrink-0"
                          : "text-[#2dd4bf] shrink-0"
                      }
                    />
                    <span className="text-[13px] leading-snug break-words font-medium">
                      {currentAnswerText}
                    </span>
                  </div>
                  <ArrowRight
                    size={15}
                    className={
                      currentTurnIndex === SCRIPTED_JENNY_TURNS.length
                        ? "text-[#042f2e] shrink-0"
                        : "text-[#2dd4bf] shrink-0"
                    }
                  />
                </button>
              </div>
            ) : (
              <div className="text-center py-2 text-[12px] text-[#71717a] italic">
                Discovery completed.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Simulated Generation Modal */}
      {isGenerating && (
        <div
          data-testid="simulated-generation-modal"
          className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-50 p-4"
        >
          <div className="w-full max-w-md p-6 rounded-2xl bg-[#141418] border border-[#27272a] shadow-2xl flex flex-col items-center text-center gap-4">
            <div className="p-3 rounded-full bg-[#2dd4bf]/10 text-[#2dd4bf] border border-[#2dd4bf]/20">
              <Loader2 size={28} className="animate-spin text-[#2dd4bf]" />
            </div>
            <h3 className="text-[16px] font-bold text-white">
              Simulating Project Generation
            </h3>
            <p className="text-[13px] text-[#a1a1aa] font-mono min-h-[40px]">
              {generationStep}
            </p>
            <div className="w-full bg-[#27272a] h-1.5 rounded-full overflow-hidden">
              <div className="bg-[#2dd4bf] h-full w-3/4 animate-pulse rounded-full" />
            </div>
            <p className="text-[11px] text-[#71717a]">
              Tutorial demonstration — opening Experimemo Project Home next.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
