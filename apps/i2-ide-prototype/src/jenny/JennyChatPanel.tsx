import React, { useState, useRef, useEffect } from "react";
import { Send, Sparkles, User, CornerDownLeft } from "lucide-react";
import type { ChatMessage } from "./types.ts";

interface JennyChatPanelProps {
  messages: ChatMessage[];
  onSendMessage: (text: string) => void;
  isAnalyzing?: boolean;
  engineLabel?: string;
}

export function JennyChatPanel({
  messages,
  onSendMessage,
  isAnalyzing = false,
  engineLabel = "Local planning helper",
}: JennyChatPanelProps) {
  const [inputText, setInputText] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isAnalyzing]);

  const handleSend = () => {
    const trimmed = inputText.trim();
    if (!trimmed || isAnalyzing) return;
    onSendMessage(trimmed);
    setInputText("");
    if (inputRef.current) {
      inputRef.current.style.height = "auto";
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    onSendMessage(suggestion);
  };

  // Get suggestions from the last assistant message
  const lastJennyMessage = [...messages].reverse().find((m) => m.role === "jenny");
  const suggestions = lastJennyMessage?.suggestions || [];

  return (
    <div className="flex flex-col h-full bg-[#121118]">
      {/* Header */}
      <div className="p-4 border-b border-white/8 shrink-0 bg-[#161420] flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#a78bfa] to-[#7c3aed] flex items-center justify-center text-white shadow-md">
              <Sparkles size={17} />
            </div>
            <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-[#abefa3] border-2 border-[#161420]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-['Space_Grotesk',sans-serif] text-[15px] font-bold text-white tracking-tight">
                Jenny
              </h2>
              <span className="px-2 py-0.5 rounded-[4px] bg-[#a78bfa]/15 text-[#a78bfa] text-[10px] font-bold font-mono">
                PLANNING
              </span>
            </div>
            <p className="text-[11.5px] font-['Rounded_Mplus_1c',sans-serif] text-white/50">
              Project Creation & Discovery Specialist
            </p>
          </div>
        </div>

        <div className="text-right hidden sm:block">
          <span className="text-[10px] font-mono uppercase tracking-wider text-white/30 block">
            Engine
          </span>
          <span className="text-[11px] font-['Rounded_Mplus_1c',sans-serif] text-[#a78bfa]">
            {engineLabel}
          </span>
        </div>
      </div>

      {/* Message History */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((m) => {
          const isJenny = m.role === "jenny";
          return (
            <div
              key={m.id}
              className={`flex gap-3 ${isJenny ? "justify-start" : "justify-end"} items-start`}
            >
              {isJenny && (
                <div className="w-7 h-7 rounded-full bg-[#a78bfa]/20 border border-[#a78bfa]/35 flex items-center justify-center text-[#a78bfa] shrink-0 mt-0.5">
                  <Sparkles size={13} />
                </div>
              )}

              <div
                className={`max-w-[85%] rounded-[12px] px-4 py-3 text-[13px] font-['Rounded_Mplus_1c',sans-serif] leading-relaxed shadow-sm ${
                  isJenny
                    ? "bg-[#1c1a27] text-slate-100 border border-white/8"
                    : "bg-[#abefa3] text-[#111817] font-medium"
                }`}
              >
                <div className="whitespace-pre-wrap">{m.text}</div>
              </div>

              {!isJenny && (
                <div className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center text-white/60 shrink-0 mt-0.5">
                  <User size={13} />
                </div>
              )}
            </div>
          );
        })}

        {isAnalyzing && (
          <div className="flex gap-3 justify-start items-center">
            <div className="w-7 h-7 rounded-full bg-[#a78bfa]/20 border border-[#a78bfa]/35 flex items-center justify-center text-[#a78bfa] shrink-0 animate-pulse">
              <Sparkles size={13} />
            </div>
            <div className="px-4 py-2.5 rounded-[12px] bg-[#1c1a27] border border-white/8 text-[12px] font-['Rounded_Mplus_1c',sans-serif] text-white/50 flex items-center gap-2">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#a78bfa] animate-ping" />
              Jenny is updating the project blueprint...
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Quick Suggestions (if any) */}
      {suggestions.length > 0 && !isAnalyzing && (
        <div className="px-4 pb-2 pt-1 flex flex-wrap gap-1.5 shrink-0">
          {suggestions.map((s, idx) => (
            <button
              key={idx}
              onClick={() => handleSuggestionClick(s)}
              className="px-3 py-1.5 rounded-full bg-[#1c1a27] hover:bg-[#a78bfa]/20 text-[11.5px] font-['Rounded_Mplus_1c',sans-serif] text-white/80 hover:text-[#a78bfa] border border-white/8 hover:border-[#a78bfa]/30 transition-colors"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {/* Input Area */}
      <div className="p-4 border-t border-white/8 bg-[#161420] shrink-0">
        <div className="relative rounded-[12px] bg-[#1c1a27] border border-white/10 focus-within:border-[#a78bfa]/50 transition-colors">
          <textarea
            aria-label="Message Jenny"
            disabled={isAnalyzing}
            ref={inputRef}
            rows={2}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Describe your idea or answer Jenny's question..."
            className="w-full bg-transparent px-3.5 py-3 pr-12 text-[13px] font-['Rounded_Mplus_1c',sans-serif] text-white placeholder-white/35 focus:outline-none resize-none leading-relaxed"
          />
          <button
            aria-label="Send message"
            onClick={handleSend}
            disabled={!inputText.trim() || isAnalyzing}
            className={`absolute right-2.5 bottom-2.5 w-8 h-8 rounded-[8px] flex items-center justify-center transition-all ${
              inputText.trim() && !isAnalyzing
                ? "bg-[#abefa3] text-[#14121a] hover:bg-[#8de085] shadow-md cursor-pointer"
                : "bg-white/5 text-white/20 cursor-not-allowed"
            }`}
          >
            <Send size={14} />
          </button>
        </div>
        <div className="flex items-center justify-between text-[11px] font-['Rounded_Mplus_1c',sans-serif] text-white/35 mt-2 px-1">
          <span>Press Enter to send, Shift+Enter for new line</span>
          <span>Jenny extracts requirements into the blueprint live</span>
        </div>
      </div>
    </div>
  );
}
