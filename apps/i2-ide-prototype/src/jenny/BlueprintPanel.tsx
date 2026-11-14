import React, { useState } from "react";

import {

  Layers,

  Sparkles,

  CheckCircle2,

  AlertCircle,

  HelpCircle,

  Clock,

  Plus,

  X,

  FileText,

  ChevronRight,

  ChevronDown,

  Edit2,

  Check,

  Zap,

} from "lucide-react";

import type {

  FrameworkId,

  ProjectBlueprint,

  ProjectMemoryFiles,

  RequirementItem,

  RequirementProvenance,

  RequirementStatus,

} from "./types.ts";

import { getFramework, SUPPORTED_FRAMEWORKS } from "./frameworks.ts";

import { generateProjectMemory } from "./discovery.ts";



interface BlueprintPanelProps {

  blueprint: ProjectBlueprint;

  onUpdateBlueprint: (updater: (prev: ProjectBlueprint) => ProjectBlueprint) => void;

  onGenerate: () => void;

  frameworkChangedWarning?: boolean;

}



const STATUS_CONFIG: Record<

  RequirementStatus,

  { label: string; bg: string; text: string; border: string; icon: React.ReactNode }

> = {

  answered: {

    label: "Answered",

    bg: "bg-[#abefa3]/10",

    text: "text-[#abefa3]",

    border: "border-[#abefa3]/30",

    icon: <CheckCircle2 size={11} className="text-[#abefa3]" />,

  },

  inferred: {

    label: "Inferred",

    bg: "bg-[#a78bfa]/10",

    text: "text-[#a78bfa]",

    border: "border-[#a78bfa]/30",

    icon: <Sparkles size={11} className="text-[#a78bfa]" />,

  },

  unknown: {

    label: "Unknown",

    bg: "bg-white/5",

    text: "text-white/40",

    border: "border-white/10",

    icon: <HelpCircle size={11} className="text-white/40]" />,

  },

  deferred: {

    label: "Deferred",

    bg: "bg-[#fbbf24]/10",

    text: "text-[#fbbf24]",

    border: "border-[#fbbf24]/30",

    icon: <Clock size={11} className="text-[#fbbf24]" />,

  },

  conflicting: {

    label: "Conflicting",

    bg: "bg-rose-500/10",

    text: "text-rose-400",

    border: "border-rose-500/30",

    icon: <AlertCircle size={11} className="text-rose-400" />,

  },

  "requires-confirmation": {

    label: "Confirm",

    bg: "bg-orange-500/10",

    text: "text-orange-400",

    border: "border-orange-500/30",

    icon: <AlertCircle size={11} className="text-orange-400" />,

  },

};



function StatusBadge({

  status,

  provenance,

}: {

  status: RequirementStatus;

  provenance?: RequirementProvenance;

}) {

  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.unknown;

  return (

    <span

      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-['Rounded_Mplus_1c',sans-serif] font-medium border ${cfg.bg} ${cfg.text} ${cfg.border}`}

      title={provenance ? `Provenance: ${provenance}` : undefined}

    >

      {cfg.icon}

      <span>{cfg.label}</span>

    </span>

  );

}



export function BlueprintPanel({

  blueprint,

  onUpdateBlueprint,

  onGenerate,

  frameworkChangedWarning,

}: BlueprintPanelProps) {

  const fw = getFramework(blueprint.frameworkId);

  const [newFeatureText, setNewFeatureText] = useState("");

  const [editingField, setEditingField] = useState<string | null>(null);

  const [editValue, setEditValue] = useState("");

  const [previewTab, setPreviewTab] = useState<keyof ProjectMemoryFiles>("infoMd");

  const [showMemoryPreview, setShowMemoryPreview] = useState(false);



  // Derive preview documents live from blueprint

  const memoryPreview = generateProjectMemory(blueprint);



  const startEdit = (field: string, initial: string) => {

    setEditingField(field);

    setEditValue(initial);

  };



  const commitEdit = (field: string) => {

    if (field === "projectName") {

      onUpdateBlueprint((prev) => {

        const val = editValue.trim() || prev.projectName.value;

        const slug = val.toLowerCase().replace(/[^a-z0-9]+/g, "-");

        return {

          ...prev,

          projectName: {

            ...prev.projectName,

            value: val,

            status: "answered",

            provenance: "user-edit",

          },

          slug: {

            ...prev.slug,

            value: slug || "app",

            status: "answered",

            provenance: "user-edit",

          },

          approvedPlanId: null,

        };

      });

    } else if (field === "elevatorPitch") {

      onUpdateBlueprint((prev) => ({

        ...prev,

        elevatorPitch: {

          ...prev.elevatorPitch,

          value: editValue.trim(),

          status: "answered",

          provenance: "user-edit",

        },

        approvedPlanId: null,

      }));

    } else if (field === "visualDirection") {

      onUpdateBlueprint((prev) => ({

        ...prev,

        visualDirection: {

          ...prev.visualDirection,

          value: editValue.trim() || prev.visualDirection.value,

          status: "answered",

          provenance: "user-edit",

        },

        approvedPlanId: null,

      }));

    } else if (field === "dataStorage") {

      onUpdateBlueprint((prev) => ({

        ...prev,

        dataStorage: {

          ...prev.dataStorage,

          value: editValue.trim() || prev.dataStorage.value,

          status: "answered",

          provenance: "user-edit",

        },

        approvedPlanId: null,

      }));

    }

    setEditingField(null);

  };



  const handleAddFeature = () => {

    const text = newFeatureText.trim();

    if (!text) return;

    onUpdateBlueprint((prev) => ({

      ...prev,

      mvpFeatures: {

        ...prev.mvpFeatures,

        value: Array.from(new Set([...prev.mvpFeatures.value, text])),

        status: "answered",

        provenance: "user-edit",

      },

      approvedPlanId: null,

    }));

    setNewFeatureText("");

  };



  const handleRemoveFeature = (feat: string) => {

    onUpdateBlueprint((prev) => ({

      ...prev,

      mvpFeatures: {

        ...prev.mvpFeatures,

        value: prev.mvpFeatures.value.filter((f) => f !== feat),

        provenance: "user-edit",

      },

      approvedPlanId: null,

    }));

  };



  const handleTogglePlatform = (platform: string) => {

    onUpdateBlueprint((prev) => {

      const current = prev.platforms.value;

      const next = current.includes(platform)

        ? current.filter((p) => p !== platform)

        : [...current, platform];

      return {

        ...prev,

        platforms: {

          ...prev.platforms,

          value: next.length > 0 ? next : [platform],

          status: "answered",

          provenance: "user-edit",

        },

        approvedPlanId: null,

      };

    });

  };



  const handleToggleTemplate = (templateName: string) => {

    onUpdateBlueprint((prev) => ({

      ...prev,

      template: templateName,

      approvedPlanId: null,

    }));

  };



  const readiness = blueprint.readinessScore;



  return (

    <div className="flex flex-col h-full bg-[#18161f] border-r border-white/8 select-none">

      {/* Top Header / Progress */}

      <div className="p-4 border-b border-white/8 shrink-0 bg-[#14121a]">

        <div className="flex items-center justify-between mb-2">

          <div className="flex items-center gap-2">

            <Layers size={16} className="text-[#a78bfa]" />

            <h2 className="font-['Space_Grotesk',sans-serif] text-[15px] font-bold text-white tracking-tight">

              Project Blueprint

            </h2>

          </div>

          <div className="flex items-center gap-2">

            <span className="text-[11px] font-['Rounded_Mplus_1c',sans-serif] text-white/50">

              Readiness:

            </span>

            <span

              className={`text-[12px] font-bold font-mono ${

                readiness >= 70 ? "text-[#abefa3]" : "text-[#fbbf24]"

              }`}

            >

              {readiness}%

            </span>

          </div>

        </div>



        {/* Readiness Bar */}

        <div className="w-full h-1.5 rounded-full bg-white/5 overflow-hidden">

          <div

            className="h-full rounded-full transition-all duration-500 ease-out"

            style={{

              width: `${readiness}%`,

              background:

                readiness >= 70

                  ? "linear-gradient(90deg, #a78bfa 0%, #abefa3 100%)"

                  : "linear-gradient(90deg, #a78bfa 0%, #fbbf24 100%)",

            }}

          />

        </div>

      </div>



      {/* Blueprint Content Sections (scrollable) */}

      <div className="flex-1 overflow-y-auto p-4 space-y-4">

        {frameworkChangedWarning && (

          <div className="p-3 rounded-[8px] bg-amber-500/10 border border-amber-500/25 flex items-start gap-2.5">

            <AlertCircle size={15} className="text-amber-400 shrink-0 mt-0.5" />

            <p className="text-[11.5px] font-['Rounded_Mplus_1c',sans-serif] text-amber-200/90 leading-relaxed">

              Framework changed to <strong>{fw.displayName}</strong>. Previous plan approval has

              been reset. Please re-review the blueprint before generating.

            </p>

          </div>

        )}



        {/* 1. Identity & Pitch */}

        <div className="p-3 rounded-[10px] bg-[#1d1b27] border border-white/6 hover:border-white/10 transition-colors">

          <div className="flex items-center justify-between mb-2">

            <span className="text-[11px] font-['Space_Grotesk',sans-serif] uppercase tracking-wider text-white/40 font-semibold">

              Project Identity

            </span>

            <StatusBadge

              status={blueprint.projectName.status}

              provenance={blueprint.projectName.provenance}

            />

          </div>



          {editingField === "projectName" ? (

            <div className="flex items-center gap-2 mb-2">

              <input

                type="text"

                value={editValue}

                onChange={(e) => setEditValue(e.target.value)}

                onKeyDown={(e) => {

                  if (e.key === "Enter") commitEdit("projectName");

                  if (e.key === "Escape") setEditingField(null);

                }}

                className="flex-1 px-2.5 py-1.5 bg-[#121118] border border-[#a78bfa]/50 rounded-[6px] text-white text-[13px] font-['Space_Grotesk',sans-serif] focus:outline-none"

                autoFocus

              />

              <button

                aria-label="Save project name"
                onClick={() => commitEdit("projectName")}

                className="p-1.5 rounded-[6px] bg-[#abefa3] text-[#14121a] hover:bg-[#8de085]"

              >

                <Check size={14} />

              </button>

            </div>

          ) : (

            <div

              role="button" tabIndex={0} aria-label="Edit projectName"
              onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); startEdit("projectName", blueprint.projectName.value); } } }
              onClick={() => startEdit("projectName", blueprint.projectName.value)}

              className="group flex items-center justify-between cursor-pointer py-1"

            >

              <div>

                <p className="font-['Space_Grotesk',sans-serif] text-[15px] font-bold text-white group-hover:text-[#abefa3] transition-colors">

                  {blueprint.projectName.value || "Untitled Project"}

                </p>

                <p className="text-[11px] font-mono text-white/40">

                  id: {blueprint.slug.value || "untitled-project"}

                </p>

              </div>

              <Edit2

                size={13}

                className="text-white/20 group-hover:text-white/60 transition-colors"

              />

            </div>

          )}



          {/* Elevator Pitch */}

          {editingField === "elevatorPitch" ? (

            <div className="mt-2 space-y-2">

              <textarea

                value={editValue}

                onChange={(e) => setEditValue(e.target.value)}

                rows={3}

                className="w-full p-2 bg-[#121118] border border-[#a78bfa]/50 rounded-[6px] text-white text-[12px] font-['Rounded_Mplus_1c',sans-serif] focus:outline-none"

                autoFocus

              />

              <div className="flex justify-end gap-2">

                <button

                  onClick={() => setEditingField(null)}

                  className="px-2 py-1 text-[11px] text-white/50 hover:text-white"

                >

                  Cancel

                </button>

                <button

                  onClick={() => commitEdit("elevatorPitch")}

                  className="px-2.5 py-1 bg-[#abefa3] text-[#14121a] rounded-[5px] text-[11px] font-bold"

                >

                  Save Pitch

                </button>

              </div>

            </div>

          ) : (

            <div

              role="button" tabIndex={0} aria-label="Edit elevatorPitch"
              onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); startEdit("elevatorPitch", blueprint.elevatorPitch.value); } } }
              onClick={() => startEdit("elevatorPitch", blueprint.elevatorPitch.value)}

              className="mt-2 group p-2 rounded-[6px] bg-[#14121a] border border-white/5 cursor-pointer hover:border-white/10"

            >

              <p className="text-[12px] font-['Rounded_Mplus_1c',sans-serif] text-white/70 line-clamp-2 leading-relaxed">

                {blueprint.elevatorPitch.value || "Click to add elevator pitch or app concept..."}

              </p>

            </div>

          )}

        </div>



        {/* 2. Framework & Templates */}

        <div className="p-3 rounded-[10px] bg-[#1d1b27] border border-white/6">

          <div className="flex items-center justify-between mb-2">

            <span className="text-[11px] font-['Space_Grotesk',sans-serif] uppercase tracking-wider text-white/40 font-semibold">

              Selected Framework

            </span>

            <span className="text-[11px] font-mono text-[#a78bfa]">{fw.maturity}</span>

          </div>



          <div className="flex items-center justify-between p-2.5 rounded-[8px] bg-[#14121a] border border-white/5 mb-3">

            <div>

              <p className="font-['Space_Grotesk',sans-serif] text-[13px] font-bold text-white">

                {fw.displayName}

              </p>

              <p className="text-[11px] font-['Rounded_Mplus_1c',sans-serif] text-white/50">

                UI: {fw.uiLanguage} · Logic: {fw.dataLogic}

              </p>

            </div>

            <div className="px-2 py-0.5 rounded-[5px] bg-[#a78bfa]/15 text-[#a78bfa] text-[10px] font-bold font-mono">

              {blueprint.frameworkId === "exact" ? "EXACT DEFAULT" : "EXPO STACK"}

            </div>

          </div>



          {/* Starter Template */}

          <p className="text-[11px] font-['Rounded_Mplus_1c',sans-serif] text-white/40 mb-1.5">

            Starter Template

          </p>

          <div className="flex flex-wrap gap-1.5">

            {fw.availableTemplates.map((tmpl) => (

              <button

                key={tmpl}

                onClick={() => handleToggleTemplate(tmpl)}

                className={`px-2.5 py-1 rounded-[6px] text-[11px] font-['Rounded_Mplus_1c',sans-serif] font-medium transition-colors ${

                  blueprint.template === tmpl

                    ? "bg-[#abefa3] text-[#14121a] font-bold"

                    : "bg-[#14121a] text-white/60 hover:text-white border border-white/5"

                }`}

              >

                {tmpl}

              </button>

            ))}

          </div>

        </div>



        {/* 3. Target Platforms */}

        <div className="p-3 rounded-[10px] bg-[#1d1b27] border border-white/6">

          <div className="flex items-center justify-between mb-2">

            <span className="text-[11px] font-['Space_Grotesk',sans-serif] uppercase tracking-wider text-white/40 font-semibold">

              Target Platforms

            </span>

            <StatusBadge

              status={blueprint.platforms.status}

              provenance={blueprint.platforms.provenance}

            />

          </div>

          <div className="flex flex-wrap gap-1.5">

            {["Web", "macOS", "iOS", "Android", "Desktop"].map((plat) => {

              const active = blueprint.platforms.value.includes(plat);

              return (

                <button

                  key={plat}

                  onClick={() => handleTogglePlatform(plat)}

                  className={`px-2.5 py-1 rounded-[6px] text-[11px] font-['Rounded_Mplus_1c',sans-serif] transition-colors border ${

                    active

                      ? "bg-[#2dd4bf]/15 border-[#2dd4bf]/40 text-[#2dd4bf] font-bold"

                      : "bg-[#14121a] border-white/5 text-white/40 hover:text-white"

                  }`}

                >

                  {plat}

                </button>

              );

            })}

          </div>

        </div>



        {/* 4. MVP Core Features */}

        <div className="p-3 rounded-[10px] bg-[#1d1b27] border border-white/6">

          <div className="flex items-center justify-between mb-2">

            <span className="text-[11px] font-['Space_Grotesk',sans-serif] uppercase tracking-wider text-white/40 font-semibold">

              MVP Features ({blueprint.mvpFeatures.value.length})

            </span>

            <StatusBadge

              status={blueprint.mvpFeatures.status}

              provenance={blueprint.mvpFeatures.provenance}

            />

          </div>



          <div className="space-y-1.5 mb-2.5">

            {blueprint.mvpFeatures.value.length === 0 ? (

              <p className="text-[11.5px] font-['Rounded_Mplus_1c',sans-serif] text-white/40 italic py-1">

                No features captured yet. Tell Jenny in chat or add below.

              </p>

            ) : (

              blueprint.mvpFeatures.value.map((feat) => (

                <div

                  key={feat}

                  className="group flex items-center justify-between p-2 rounded-[6px] bg-[#14121a] border border-white/5 text-[12px] font-['Rounded_Mplus_1c',sans-serif] text-white/90"

                >

                  <span className="flex items-center gap-2">

                    <span className="w-1.5 h-1.5 rounded-full bg-[#abefa3]" />

                    {feat}

                  </span>

                  <button

                    onClick={() => handleRemoveFeature(feat)}

                    className="opacity-0 group-hover:opacity-100 p-0.5 text-white/30 hover:text-rose-400 transition-opacity"

                    aria-label="Remove feature"

                  >

                    <X size={12} />

                  </button>

                </div>

              ))

            )}

          </div>



          {/* Add Feature input */}

          <div className="flex gap-1.5">

            <input

              type="text"

              aria-label="New MVP feature"
              placeholder="+ Add feature..."

              value={newFeatureText}

              onChange={(e) => setNewFeatureText(e.target.value)}

              onKeyDown={(e) => {

                if (e.key === "Enter") handleAddFeature();

              }}

              className="flex-1 px-2.5 py-1 bg-[#14121a] border border-white/10 rounded-[6px] text-white text-[11.5px] font-['Rounded_Mplus_1c',sans-serif] placeholder-white/30 focus:outline-none focus:border-[#a78bfa]/40"

            />

            <button

              onClick={handleAddFeature}

              className="px-2 py-1 rounded-[6px] bg-white/10 hover:bg-white/20 text-white text-[11px] flex items-center gap-1"

            >

              <Plus size={12} /> Add

            </button>

          </div>

        </div>



        {/* 5. Styling & Visual Direction */}

        <div className="p-3 rounded-[10px] bg-[#1d1b27] border border-white/6">

          <div className="flex items-center justify-between mb-2">

            <span className="text-[11px] font-['Space_Grotesk',sans-serif] uppercase tracking-wider text-white/40 font-semibold">

              Visual Direction

            </span>

            <StatusBadge

              status={blueprint.visualDirection.status}

              provenance={blueprint.visualDirection.provenance}

            />

          </div>

          <div className="p-2 rounded-[6px] bg-[#14121a] border border-white/5 text-[12px] font-['Rounded_Mplus_1c',sans-serif]">

            <p className="text-white/80 font-medium">{blueprint.visualDirection.value}</p>

            <p className="text-[11px] text-white/40 mt-0.5">

              Palette: {blueprint.colorPalette.value}

            </p>

          </div>

        </div>



        {/* 6. Technical Architecture & Data */}

        <div className="p-3 rounded-[10px] bg-[#1d1b27] border border-white/6">

          <div className="flex items-center justify-between mb-2">

            <span className="text-[11px] font-['Space_Grotesk',sans-serif] uppercase tracking-wider text-white/40 font-semibold">

              Data & Architecture

            </span>

            <StatusBadge

              status={blueprint.dataStorage.status}

              provenance={blueprint.dataStorage.provenance}

            />

          </div>

          <div className="p-2 rounded-[6px] bg-[#14121a] border border-white/5 text-[12px] font-['Rounded_Mplus_1c',sans-serif]">

            <p className="text-white/80">{blueprint.dataStorage.value}</p>

            <p className="text-[11px] text-white/40 mt-0.5">

              Auth: {blueprint.authentication.value}

            </p>

          </div>

        </div>



        {/* 7. Deferred Items / Post-MVP */}

        {blueprint.deferredFeatures.value.length > 0 && (

          <div className="p-3 rounded-[10px] bg-[#1d1b27] border border-white/6">

            <div className="flex items-center justify-between mb-2">

              <span className="text-[11px] font-['Space_Grotesk',sans-serif] uppercase tracking-wider text-white/40 font-semibold">

                Deferred Decisions (Post-MVP)

              </span>

              <StatusBadge status="deferred" provenance="chat" />

            </div>

            <div className="space-y-1">

              {blueprint.deferredFeatures.value.map((d) => (

                <div

                  key={d}

                  className="px-2 py-1 rounded-[5px] bg-[#14121a] text-[11px] font-['Rounded_Mplus_1c',sans-serif] text-amber-300/80 flex items-center gap-1.5"

                >

                  <Clock size={11} className="text-amber-400 shrink-0" />

                  <span>{d}</span>

                </div>

              ))}

            </div>

          </div>

        )}



        {/* 8. Project Memory Drafts Preview toggle */}

        <div className="pt-1">

          <button

            onClick={() => setShowMemoryPreview((p) => !p)}

            className="w-full flex items-center justify-between p-2.5 rounded-[8px] bg-[#14121a] border border-white/6 hover:border-white/15 text-[12px] font-['Space_Grotesk',sans-serif] font-semibold text-white/80 transition-colors"

          >

            <span className="flex items-center gap-2">

              <FileText size={14} className="text-[#a78bfa]" />

              Project Memory Drafts ({Object.keys(memoryPreview).length} files)

            </span>

            {showMemoryPreview ? <ChevronDown size={14} /> : <ChevronRight size={14} />}

          </button>



          {showMemoryPreview && (

            <div className="mt-2 p-2.5 rounded-[8px] bg-[#121118] border border-white/8 text-[11px]">

              <div className="flex gap-1 border-b border-white/10 pb-1.5 mb-2 overflow-x-auto">

                {(["infoMd", "styleMd", "guidelinesMd", "todoMd"] as const).map((tab) => (

                  <button

                    key={tab}

                    onClick={() => setPreviewTab(tab)}

                    className={`px-2 py-0.5 rounded-[4px] text-[10.5px] font-mono transition-colors ${

                      previewTab === tab

                        ? "bg-[#a78bfa] text-[#14121a] font-bold"

                        : "text-white/50 hover:text-white"

                    }`}

                  >

                    project/{tab.replace("Md", ".md")}

                  </button>

                ))}

              </div>

              <pre className="p-2 rounded bg-black/40 font-mono text-[10px] text-white/70 max-h-40 overflow-auto whitespace-pre-wrap leading-relaxed">

                {memoryPreview[previewTab]}

              </pre>

            </div>

          )}

        </div>

      </div>



      {/* Blueprint Action Footer */}

      <div className="p-4 border-t border-white/8 bg-[#14121a] shrink-0">

        <button

          onClick={onGenerate}

          className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-[10px] font-['Space_Grotesk',sans-serif] text-[14px] font-bold tracking-tight transition-transform active:scale-[0.99] shadow-lg"

          style={{

            background:

              blueprint.frameworkId === "exact"

                ? "linear-gradient(135deg, #8cffff 0%, #2dd4bf 100%)"

                : "linear-gradient(135deg, #a78bfa 0%, #7c3aed 100%)",

            color: "#0c0a12",

          }}

        >

          <Zap size={16} className="shrink-0" />

          <span>{fw.actionText}</span>

        </button>

        <p className="text-center text-[10.5px] font-['Rounded_Mplus_1c',sans-serif] text-white/40 mt-2">

          Review blueprint draft

        </p>

      </div>

    </div>

  );

}
