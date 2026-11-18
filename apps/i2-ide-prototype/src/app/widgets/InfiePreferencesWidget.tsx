import React, { useState } from "react";
import * as SliderPrimitive from "@radix-ui/react-slider";
import { Sparkles, RotateCcw, Bot, Zap, Cpu } from "lucide-react";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "../components/ui/tooltip";
import {
  useInfiePreferences,
  GUIDANCE_STOPS,
  SASSINESS_STOPS,
  VERBOSITY_STOPS,
  TECHNICAL_LEVEL_STOPS,
  TEXT_SPEED_STOPS,
  EFFORT_STOPS,
  type PreferenceStop,
} from "./infiePreferencesContext";

interface DiscretePreferenceSliderProps {
  id: string;
  label: string;
  description?: string;
  stops: PreferenceStop[];
  currentIndex: number;
  onChange: (index: number) => void;
  badgeAccent?: string;
  compact?: boolean;
}

function DiscretePreferenceSlider({
  id,
  label,
  description,
  stops,
  currentIndex,
  onChange,
  badgeAccent = "#2dd4bf",
  compact = false,
}: DiscretePreferenceSliderProps) {
  const currentStop = stops[currentIndex] ?? stops[0];
  const [thumbTipOpen, setThumbTipOpen] = useState(false);
  const [dragging, setDragging] = useState(false);

  return (
    <div className={compact ? "flex flex-col gap-0" : "flex flex-col gap-2 rounded-[10px] bg-[#161517] border border-white/6 p-3.5 hover:border-white/12 transition-colors"}>
      {/* Header with Title and Current Selection Badge */}
      <div className="flex items-center justify-between gap-2">
        <div>
          <span className="font-['Space_Grotesk',sans-serif] text-[13px] font-bold text-white tracking-wide">
            {label}
          </span>
          {!compact && description && (
            <p className="font-['Rounded_Mplus_1c',sans-serif] text-[10px] text-[#666] mt-0.5">
              {description}
            </p>
          )}
        </div>
        {!compact && <span
          className="px-2.5 py-0.5 rounded-full text-[11px] font-bold font-['Rounded_Mplus_1c',sans-serif] shrink-0"
          style={{
            background: `${badgeAccent}18`,
            color: badgeAccent,
            border: `1px solid ${badgeAccent}35`,
          }}
        >
          {currentStop.label}
        </span>}
      </div>

      {/* Selected Stop Description */}
      {!compact && <p className="font-['Rounded_Mplus_1c',sans-serif] text-[11px] text-[#999] leading-relaxed">
        {currentStop.description}
      </p>}

      {/* Radix Slider Container with Thumb Tooltip and Aligned Stops */}
      <div className={compact ? "relative" : "pt-2 pb-1 relative"}>
        <SliderPrimitive.Root
          id={id}
          value={[currentIndex]}
          onValueChange={(vals) => {
            setThumbTipOpen(true);
            if (vals && vals.length > 0) onChange(vals[0]);
          }}
          onPointerDownCapture={() => setDragging(true)}
          onPointerUp={() => setDragging(false)}
          onPointerCancel={() => setDragging(false)}
          min={0}
          max={stops.length - 1}
          step={1}
          aria-label={label}
          className="relative flex w-full touch-none select-none items-center py-2 cursor-pointer z-10"
        >
          <SliderPrimitive.Track className="relative h-2 w-full grow overflow-hidden rounded-full bg-white/10">
            <SliderPrimitive.Range
              className="absolute h-full rounded-full transition-all"
              style={{ background: badgeAccent }}
            />
          </SliderPrimitive.Track>

          {/* Thumb with active Tooltip while hovering/focusing/dragging */}
          <Tooltip open={dragging || thumbTipOpen} onOpenChange={setThumbTipOpen}>
            <TooltipTrigger asChild>
              <SliderPrimitive.Thumb
                aria-label={label}
                aria-valuemin={0}
                aria-valuemax={stops.length - 1}
                aria-valuenow={currentIndex}
                aria-valuetext={`${currentStop.label}: ${currentStop.description}`}
                className="block h-4 w-4 rounded-full border-2 bg-[#161517] shadow-md transition-transform hover:scale-115 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2dd4bf] focus-visible:ring-offset-2 focus-visible:ring-offset-[#161517] cursor-grab active:cursor-grabbing"
                style={{
                  borderColor: badgeAccent,
                  boxShadow: `0 0 8px ${badgeAccent}40`,
                }}
              />
            </TooltipTrigger>
            <TooltipContent
              side="top"
              className="z-[10070] bg-[#1c1b20] border border-white/15 text-white max-w-[240px] p-2.5 shadow-2xl rounded-[8px]"
            >
              <p className="font-['Space_Grotesk',sans-serif] text-[11px] font-bold text-[#2dd4bf]">
                {currentStop.label}
              </p>
              <p className="font-['Rounded_Mplus_1c',sans-serif] text-[10px] text-[#aaa] mt-1 leading-snug">
                {currentStop.description}
              </p>
            </TooltipContent>
          </Tooltip>
        </SliderPrimitive.Root>

        {/* Hoverable Stops with Tooltips accurately aligned with slider stops */}
        <div className={compact ? "hidden" : "relative w-full h-4 -mt-1 pointer-events-auto"}>
          {stops.map((stop, idx) => {
            const isSelected = idx === currentIndex;
            const leftPercent = stops.length > 1 ? (idx / (stops.length - 1)) * 100 : 0;
            return (
              <div
                key={stop.index}
                className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 flex items-center justify-center"
                style={{ left: `${leftPercent}%` }}
              >
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      onClick={() => onChange(idx)}
                      aria-label={`${label} stop: ${stop.label}`}
                      aria-pressed={isSelected}
                      className="p-1 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2dd4bf] focus-visible:ring-offset-2 focus-visible:ring-offset-[#161517] cursor-pointer rounded-full"
                    >
                      <div
                        className="w-2.5 h-2.5 rounded-full transition-all"
                        style={{
                          background: isSelected
                            ? badgeAccent
                            : idx < currentIndex
                            ? `${badgeAccent}80`
                            : "rgba(255, 255, 255, 0.25)",
                          transform: isSelected ? "scale(1.2)" : undefined,
                          boxShadow: isSelected ? `0 0 6px ${badgeAccent}` : undefined,
                        }}
                      />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent
                    side="top"
                    className="z-[10070] bg-[#1c1b20] border border-white/15 text-white max-w-[240px] p-2.5 shadow-2xl rounded-[8px]"
                  >
                    <p className="font-['Space_Grotesk',sans-serif] text-[11px] font-bold text-[#2dd4bf]">
                      {stop.label}
                    </p>
                    <p className="font-['Rounded_Mplus_1c',sans-serif] text-[10px] text-[#aaa] mt-1 leading-snug">
                      {stop.description}
                    </p>
                  </TooltipContent>
                </Tooltip>
              </div>
            );
          })}
        </div>

        {/* Textual Minimum and Maximum Endpoint Labels Only (No Numeric Labels) */}
        {!compact && <div className="flex items-center justify-between text-[11px] font-['Rounded_Mplus_1c',sans-serif] text-[#666] pt-1.5 select-none">
          <span>{stops[0].label}</span>
          <span>{stops[stops.length - 1].label}</span>
        </div>}
      </div>
    </div>
  );
}

export function InfiePreferencesWidget({ expanded = false }: { expanded?: boolean }) {
  const {
    preferences,
    setGuidanceStopIndex,
    setSassinessStopIndex,
    setVerbosityStopIndex,
    setTechnicalLevelStopIndex,
    setTextSpeedStopIndex,
    setEffortStopIndex,
    resetDefaults,
  } = useInfiePreferences();

  return (
    <TooltipProvider delayDuration={150}>
      <div
        data-testid="infie-preferences-widget"
        className="flex flex-col h-full bg-[#111012] text-white overflow-y-auto min-h-0 select-text"
      >
        {/* Banner / Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-[#18171a] border-b border-white/8 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-[7px] bg-[#2dd4bf]/15 border border-[#2dd4bf]/30 flex items-center justify-center text-[#2dd4bf]">
              <Sparkles size={14} />
            </div>
            <div>
              <h3 className="font-['Space_Grotesk',sans-serif] text-[13px] font-bold text-white flex items-center gap-1.5">
                Preference Sliders
                <span className="text-[9px] font-medium font-mono px-1.5 py-0.2 rounded bg-white/5 text-[#888]">
                  This session
                </span>
              </h3>
              <p className="font-['Rounded_Mplus_1c',sans-serif] text-[10px] text-[#777]">
                Configure assistance style, tone, compression, text reveal pacing, and effort
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={resetDefaults}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-[6px] bg-white/5 hover:bg-white/10 text-[#aaa] hover:text-white text-[11px] font-['Rounded_Mplus_1c',sans-serif] border border-white/8 transition-colors cursor-pointer"
            title="Reset preferences to defaults"
          >
            <RotateCcw size={11} />
            <span>Reset</span>
          </button>
        </div>

        {/* Content Area */}
        <div
          className={`flex-1 p-4 space-y-4 ${
            expanded ? "max-w-[780px] mx-auto w-full" : "w-full"
          }`}
        >
          {/* Section: Agent Personality & Assistance */}
          <div>
            <div className="flex items-center gap-2 mb-2.5">
              <Bot size={13} className="text-[#2dd4bf]" />
              <h4 className="font-['Space_Grotesk',sans-serif] text-[11px] font-bold uppercase tracking-wider text-[#777]">
                Assistance &amp; Tone
              </h4>
            </div>
            <div className="grid grid-cols-1 gap-3">
              {/* 1. Guidance (5 choices, low asks everything, high acts on behalf, default 80 / Autonomous) */}
              <DiscretePreferenceSlider
                id="pref-guidance"
                label="Guidance"
                description="Level of autonomous execution: from confirming every step to acting directly on your behalf"
                stops={GUIDANCE_STOPS}
                currentIndex={preferences.guidanceStopIndex}
                onChange={setGuidanceStopIndex}
                badgeAccent="#2dd4bf"
              />

              {/* 2. Sassiness (5 choices, min None / no jokes or sarcasm, max Very Sarcastic, default 100) */}
              <DiscretePreferenceSlider
                id="pref-sassiness"
                label="Sassiness"
                description="Humor, sarcastic quips, and banter: from no jokes or sarcasm to maximum snark"
                stops={SASSINESS_STOPS}
                currentIndex={preferences.sassinessStopIndex}
                onChange={setSassinessStopIndex}
                badgeAccent="#f59e0b"
              />

              {/* 3. Verbosity (5 choices, default 0 / Natural short-and-sweet to Caveman) */}
              <DiscretePreferenceSlider
                id="pref-verbosity"
                label="Verbosity & Compression"
                description="Response density scaling from natural short-and-sweet phrasing to extreme Caveman compression"
                stops={VERBOSITY_STOPS}
                currentIndex={preferences.verbosityStopIndex}
                onChange={setVerbosityStopIndex}
                badgeAccent="#38bdf8"
              />

              {/* 4. Technical Level (5 choices, default Experienced, provisional) */}
              <DiscretePreferenceSlider
                id="pref-technical-level"
                label="Technical Level"
                description="Choose how much engineering terminology models use"
                stops={TECHNICAL_LEVEL_STOPS}
                currentIndex={preferences.technicalLevelStopIndex}
                onChange={setTechnicalLevelStopIndex}
                badgeAccent="#a78bfa"
              />
            </div>
          </div>

          {/* Section: UI Streaming & Pacing */}
          <div>
            <div className="flex items-center gap-2 mb-2.5">
              <Zap size={13} className="text-[#abefa3]" />
              <h4 className="font-['Space_Grotesk',sans-serif] text-[11px] font-bold uppercase tracking-wider text-[#777]">
                Pacing &amp; Reveal Speed
              </h4>
            </div>
            <div className="grid grid-cols-1 gap-3">
              {/* 5. Text Speed (3 choices, default Normal, provisional) */}
              <DiscretePreferenceSlider
                id="pref-text-speed"
                label="Text Reveal Speed"
                description="Text pacing for all models and conversations, including tutorials"
                stops={TEXT_SPEED_STOPS}
                currentIndex={preferences.textSpeedStopIndex}
                onChange={setTextSpeedStopIndex}
                badgeAccent="#abefa3"
              />
            </div>
          </div>

          {/* Section: Effort */}
          <div>
            <div className="flex items-center gap-2 mb-2.5">
              <Cpu size={13} className="text-[#fb7185]" />
              <h4 className="font-['Space_Grotesk',sans-serif] text-[11px] font-bold uppercase tracking-wider text-[#777]">
                Model Choice &amp; Reasoning
              </h4>
            </div>
            <div className="grid grid-cols-1 gap-3">
              {/* 6. Effort (5 numeric stops 1-5, default 3) */}
              <DiscretePreferenceSlider
                id="pref-effort"
                label="Effort"
                description="Intended model-choice and reasoning-effort preference (1–5). This prototype does not invoke models or change a real reasoning budget."
                stops={EFFORT_STOPS}
                currentIndex={preferences.effortStopIndex}
                onChange={setEffortStopIndex}
                badgeAccent="#fb7185"
              />
            </div>
          </div>

          {/* Context Footer / Disclaimer: does not claim all preferences affect generated AI output */}
          <div className="rounded-[8px] bg-white/3 border border-white/6 p-3 text-[11px] font-['Rounded_Mplus_1c',sans-serif] text-[#777] leading-relaxed">
            <p>
              Applies to all models in all conversations. Settings reset when you refresh. Text speed respects reduced motion. Assistance, tone, and effort controls are previews in this prototype and do not invoke models or change a real reasoning budget.
            </p>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}

/** Small, shared-state tutorial preview: names and tracks only. */
export function PreferenceSlidersPreview() {
  const p = useInfiePreferences();
  const rows = [
    { label: "Guidance", stops: GUIDANCE_STOPS, index: p.preferences.guidanceStopIndex, change: p.setGuidanceStopIndex },
    { label: "Sassiness", stops: SASSINESS_STOPS, index: p.preferences.sassinessStopIndex, change: p.setSassinessStopIndex },
    { label: "Verbosity", stops: VERBOSITY_STOPS, index: p.preferences.verbosityStopIndex, change: p.setVerbosityStopIndex },
    { label: "Technical Level", stops: TECHNICAL_LEVEL_STOPS, index: p.preferences.technicalLevelStopIndex, change: p.setTechnicalLevelStopIndex },
    { label: "Speed", stops: TEXT_SPEED_STOPS, index: p.preferences.textSpeedStopIndex, change: p.setTextSpeedStopIndex },
    { label: "Effort", stops: EFFORT_STOPS, index: p.preferences.effortStopIndex, change: p.setEffortStopIndex },
  ];
  return (
    <TooltipProvider delayDuration={150}>
      <div
        data-name="PreferenceSlidersPreview"
        aria-label="Preference Sliders"
        className="w-full max-w-[320px] shrink-0 space-y-1 px-3.5 py-2.5 rounded-[12px]"
        style={{
          background: "transparent",
          border: "1px solid rgba(45, 212, 191, 0.34)",
          backdropFilter: "blur(6px)",
        }}
      >
        {rows.map((row) => <DiscretePreferenceSlider key={row.label} id={`tutorial-pref-${row.label}`} label={row.label} stops={row.stops} currentIndex={row.index} onChange={row.change} compact />)}
      </div>
    </TooltipProvider>
  );
}
