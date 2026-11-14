import React, { useState, useEffect, useCallback, useRef } from "react";

import {

  Sparkles,

  X,


  Columns,




  ArrowLeft,

} from "lucide-react";

import type {

  ChatMessage,

  FrameworkId,

  GenerationPlan,

  ProjectBlueprint,

  ProjectCreationHost,

} from "./types.ts";

import {

  DEFAULT_FRAMEWORK,


  SUPPORTED_FRAMEWORKS,

  getFramework,

} from "./frameworks.ts";

import {

  JENNY_INITIAL_GREETING,

  createInitialBlueprint,

  redactCredentials,
  redactValue,

} from "./discovery.ts";

import { DraftSession, RevisionGate, switchFramework } from "./session.ts";

import { useJennyHost } from "./HostProvider.tsx";

import { BlueprintPanel } from "./BlueprintPanel.tsx";

import { JennyChatPanel } from "./JennyChatPanel.tsx";

import { GenerationModal } from "./GenerationModal.tsx";



interface JennyCreationScreenProps {

  initialFrameworkId?: FrameworkId;

  host?: ProjectCreationHost;

  onClose: () => void;

  onComplete?: () => void;

  onFrameworkChange?: (id: FrameworkId) => void;

}



export function JennyCreationScreen({

  initialFrameworkId = DEFAULT_FRAMEWORK,

  host: injectedHost,

  onClose,

  onComplete,

  onFrameworkChange,

}: JennyCreationScreenProps) {

  const contextHost = useJennyHost();

  const host = injectedHost ?? contextHost;

  const [blueprint, setBlueprint] = useState<ProjectBlueprint>(() =>

    createInitialBlueprint(initialFrameworkId)

  );



  const [messages, setMessages] = useState<ChatMessage[]>([

    {

      id: "initial-jenny-greeting",

      role: "jenny",

      text: JENNY_INITIAL_GREETING,

      timestamp: Date.now(),

      suggestions: [

        "Photo sharing mobile app with camera & feeds",

        "Local markdown notes app with offline search",

        "Real-time team chat with direct messages",

      ],

    },

  ]);



  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const [isBlueprintCollapsed, setIsBlueprintCollapsed] = useState(false);

  const [isDraftSaved, setIsDraftSaved] = useState(true);

  const [frameworkChangedWarning, setFrameworkChangedWarning] = useState(false);

  const [activePlan, setActivePlan] = useState<GenerationPlan | null>(null);



  const [loaded, setLoaded] = useState(false);

  const [error, setError] = useState("");

  const [mobilePane, setMobilePane] = useState<"chat" | "blueprint">("chat");

  const gate = useRef(new RevisionGate());

  const session = useRef<DraftSession | null>(null);

  const latest = useRef({ blueprint, messages });

  latest.current = { blueprint, messages };

  const savingVersion = useRef(0);

  const hydrated = useRef(false);
  const allowSave = useRef(false);

  useEffect(() => {

    let live = true;

    const draftSession = new DraftSession(host); session.current = draftSession;

    hydrated.current = false; allowSave.current = false;

    setLoaded(false); setIsDraftSaved(false);

    draftSession.loaded.then(draft => {

      if (!live) return;

      if (draft) { latest.current = { blueprint: draft.blueprint, messages: draft.messages }; setBlueprint(draft.blueprint); setMessages(draft.messages); onFrameworkChange?.(draft.blueprint.frameworkId); }

      allowSave.current = true;

    }).catch(e => { if (live) setError(String(e)); }).finally(() => { if (live) { hydrated.current = allowSave.current; setLoaded(true); } });

    return () => { live = false; gate.current.invalidate(); if (hydrated.current) void draftSession.save(latest.current).catch(() => undefined); };

  }, [host]);

  const saveLatest = async () => {

    if (!loaded || !session.current || !allowSave.current) return;

    const version = ++savingVersion.current;

    setIsDraftSaved(false);

    try { await session.current.save(latest.current); if (version === savingVersion.current) setIsDraftSaved(host.capabilities.draftPersistenceAvailable); }

    catch (e) { setError(String(e)); }

  };

  useEffect(() => {

    if (!loaded) return;

    setIsDraftSaved(false);

    const timer = setTimeout(() => { void saveLatest(); }, 400);

    return () => clearTimeout(timer);

  }, [blueprint, messages, loaded, host]);

  const closeScreen = async () => { gate.current.invalidate(); await saveLatest(); onClose(); };

  const updateBlueprint = (updater: (previous: ProjectBlueprint) => ProjectBlueprint) => {

    gate.current.invalidate(); setIsAnalyzing(false); setActivePlan(null);

    setBlueprint(previous => redactValue({ ...updater(previous), approvedPlanId: null }));

  };

  const handleFrameworkChange = (id: FrameworkId) => {

    updateBlueprint(previous => switchFramework(previous, id)); onFrameworkChange?.(id); setFrameworkChangedWarning(true);

  };



  // Handle sending a chat message to Jenny

  const handleSendMessage = useCallback(

    async (text: string) => {

      const userMsg: ChatMessage = {

        id: `msg_user_${Date.now()}`,

        role: "user",

        text: redactCredentials(text),

        timestamp: Date.now(),

      };



      const token = gate.current.invalidate();

      setError("");

      setMessages((prev) => [...prev, userMsg]);

      setIsAnalyzing(true);



      try {

        const history = messages;

        const result = await host.analyzeIdea(redactCredentials(text), blueprint, history);



        if (!gate.current.current(token)) return;

        setBlueprint(result.updatedBlueprint);



        const jennyMsg: ChatMessage = {

          id: `msg_jenny_${Date.now()}`,

          role: "jenny",

          text: result.reply,

          timestamp: Date.now(),

          suggestions: result.suggestions,

        };



        setMessages((prev) => [...prev, jennyMsg]);

      } catch (err) {

        if (gate.current.current(token)) setError(`Discovery failed: ${String(err)}`);

      } finally {

        if (gate.current.current(token)) setIsAnalyzing(false);

      }

    },

    [blueprint, messages, host]

  );



  // Triggered when user clicks "Generate new [framework] project"

  const handleOpenGeneration = useCallback(async () => {

    const token = gate.current.invalidate();

    setError("");

    try {

      const plan = await host.createPlan(blueprint);

      if (gate.current.current(token)) { setActivePlan(plan); setFrameworkChangedWarning(false); }

    } catch (e) { if (gate.current.current(token)) setError(`Plan review failed: ${String(e)}`); }

  }, [blueprint, host]);



  const currentFw = getFramework(blueprint.frameworkId);



  return (

    <div className="fixed inset-0 z-50 flex flex-col bg-[#100f14] text-white overflow-hidden select-none">

      {/* Top Creation Header */}

      <header className="h-[52px] bg-[#161420] border-b border-white/8 px-4 flex items-center justify-between shrink-0 z-20">

        <div className="flex items-center gap-3">

          <button

            onClick={() => void closeScreen()}

            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-[7px] text-white/60 hover:text-white hover:bg-white/5 text-[12px] font-['Space_Grotesk',sans-serif] transition-colors"

            aria-label="Close creation screen"

          >

            <ArrowLeft size={14} />

            <span className="hidden sm:inline">Back</span>

          </button>



          <div className="h-4 w-px bg-white/10" />



          {/* Jenny Identity */}

          <div className="flex items-center gap-2">

            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-[#a78bfa] to-[#7c3aed] flex items-center justify-center text-white">

              <Sparkles size={13} />

            </div>

            <span className="font-['Space_Grotesk',sans-serif] text-[14px] font-bold tracking-tight text-white">

              Jenny

            </span>

            <span className="text-[12px] font-['Rounded_Mplus_1c',sans-serif] text-white/40 hidden md:inline">

              / New Project Discovery

            </span>

          </div>



          {/* Framework Switcher (Exact default vs Expo) */}

          <label className="text-xs"> <span className="sr-only">Framework</span>

            <select aria-label="Framework" disabled={!loaded} value={blueprint.frameworkId} onChange={e => handleFrameworkChange(e.target.value as FrameworkId)} className="bg-[#1c1a27] rounded p-1 max-w-40">

              {SUPPORTED_FRAMEWORKS.map(fw => <option key={fw.id} value={fw.id}>{fw.displayName}</option>)}

            </select>

          </label>

        </div>



        {/* Right header controls */}

        <div className="flex items-center gap-3">

          {/* Draft Saved Indicator */}

          <div className="flex items-center gap-1.5 text-[11px] font-['Rounded_Mplus_1c',sans-serif] text-white/40">

            <span

              className={`w-2 h-2 rounded-full ${

                isDraftSaved ? "bg-[#abefa3]" : "bg-amber-400 animate-pulse"

              }`}

            />

            <span className="hidden sm:inline">

              {!loaded ? "Loading draft…" : !host.capabilities.draftPersistenceAvailable ? "Draft storage unavailable" : isDraftSaved ? "Draft saved" : "Draft pending save"}

            </span>

          </div>



          <div className="h-4 w-px bg-white/10" />



          {/* Toggle Blueprint Column */}

          <button

            onClick={() => setIsBlueprintCollapsed((c) => !c)}

            className="flex items-center gap-1 px-2.5 py-1 rounded-[6px] text-white/60 hover:text-white hover:bg-white/5 text-[11.5px] font-['Rounded_Mplus_1c',sans-serif] transition-colors"

            aria-label={isBlueprintCollapsed ? "Show Blueprint" : "Hide Blueprint"}

          >

            <Columns size={14} />

            <span className="hidden md:inline">

              {isBlueprintCollapsed ? "Show Blueprint" : "Hide Blueprint"}

            </span>

          </button>



          {/* Close Button */}

          <button

            onClick={() => void closeScreen()}

            className="p-1.5 rounded-[6px] text-white/60 hover:text-white hover:bg-white/10 transition-colors"

            aria-label="Close creation screen"

          >

            <X size={16} />

          </button>

        </div>

      </header>



      {error && <p role="alert" className="text-rose-300 p-2 text-sm">{error}</p>}

      <div className="md:hidden flex gap-4 p-2" role="tablist" aria-label="Creation view">

        <button role="tab" aria-selected={mobilePane === "chat"} onClick={() => setMobilePane("chat")}>Chat</button>

        <button role="tab" aria-selected={mobilePane === "blueprint"} onClick={() => setMobilePane("blueprint")}>Blueprint</button>

      </div>

      {/* Main Body: 2-Column Split View */}

      <div className="flex-1 flex overflow-hidden" ref={element => { if (element) element.inert = !loaded; }} aria-busy={!loaded}>

        {/* Left: Editable Project Blueprint Panel */}

        {!isBlueprintCollapsed && (

          <div className={`${mobilePane === "blueprint" ? "block" : "hidden"} md:block w-full md:w-[420px] lg:w-[460px] xl:w-[500px] shrink-0 h-full`}>

            <BlueprintPanel

              blueprint={blueprint}

              onUpdateBlueprint={updateBlueprint}

              onGenerate={handleOpenGeneration}

              frameworkChangedWarning={frameworkChangedWarning}

            />

          </div>

        )}



        {/* Right: Jenny Chat & Discovery Interface */}

        <div className={`${mobilePane === "chat" ? "block" : "hidden"} md:block flex-1 h-full min-w-0`}>

          <JennyChatPanel

            messages={messages}

            onSendMessage={handleSendMessage}

            isAnalyzing={isAnalyzing || !loaded}

            engineLabel={host.capabilities.engineLabel || (host.capabilities.modelProviderAvailable ? "Connected planning provider" : "Local planning helper")}

          />

        </div>

      </div>



      {/* Generation Approval & Truthful Host Modal */}

      {activePlan && (

        <GenerationModal

          plan={activePlan}

          host={host}

          onClose={() => setActivePlan(null)}

          onReturnHome={() => {

            setActivePlan(null);

            void saveLatest().then(() => onComplete ? onComplete() : onClose());

          }}

        />

      )}

    </div>

  );

}
