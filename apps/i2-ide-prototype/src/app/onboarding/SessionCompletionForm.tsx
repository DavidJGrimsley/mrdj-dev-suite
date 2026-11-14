import React, { useState } from "react";
import { motion } from "motion/react";
import { Star } from "lucide-react";
import { FloatingField, FloatingButton } from "./FloatingPrimitives";

// B17 Session Completion Form, rendered inside the Session chat column (above the
// action row) so it never overlaps the chat. Unboxed: bordered fields with
// transparent interiors, filled/bordered buttons, and no outer form card.
export function SessionCompletionForm({
  submitEnabled,
  onSubmit,
  summaryDefault = "Implemented comment sheet & verified preview in session worktree.",
  correctedActionDefault = "Check the platform before choosing a command.",
}: {
  submitEnabled: boolean;
  onSubmit: (values: { summary: string; correctedAction: string }) => void;
  summaryDefault?: string;
  correctedActionDefault?: string;
}) {
  const [summary, setSummary] = useState(summaryDefault);
  const [correctedAction, setCorrectedAction] = useState(correctedActionDefault);
  const [rating, setRating] = useState(5);
  const [feedback, setFeedback] = useState("");

  return (
    <motion.form
      data-name="SessionCompletionForm"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      onSubmit={(e) => {
        e.preventDefault();
        // Enter in a field never acts as Continue; Submit only works on the final turn.
        if (submitEnabled) onSubmit({ summary, correctedAction });
      }}
      className="flex flex-col gap-3 w-full px-4 pt-2 pb-2 shrink-0"
      style={{ background: "transparent", border: "none", boxShadow: "none" }}
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <FloatingField
          id="b17-summary"
          label="Infie-prefilled summary"
          value={summary}
          onChange={setSummary}
        />
        <FloatingField
          id="b17-corrected-action"
          label="Corrected action"
          value={correctedAction}
          onChange={setCorrectedAction}
        />
      </div>
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1.5">
          <span
            style={{
              fontFamily: "'Space Grotesk', sans-serif",
              fontSize: 12,
              fontWeight: 500,
              color: "rgba(255, 255, 255, 0.72)",
            }}
          >
            Session rating
          </span>
          <div className="flex items-center gap-1" role="group" aria-label="Session rating">
            {[1, 2, 3, 4, 5].map((star) => {
              const active = star <= rating;
              return (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  aria-label={`Rate ${star} out of 5`}
                  aria-pressed={star === rating}
                  className="p-1.5 rounded-[7px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2dd4bf]/60"
                  style={{
                    background: active ? "rgba(45, 212, 191, 0.18)" : "rgba(255, 255, 255, 0.04)",
                    border: active
                      ? "1px solid rgba(45, 212, 191, 0.45)"
                      : "1px solid rgba(255, 255, 255, 0.15)",
                    color: active ? "#2dd4bf" : "rgba(255, 255, 255, 0.35)",
                  }}
                >
                  <Star size={13} fill={active ? "#2dd4bf" : "none"} />
                </button>
              );
            })}
          </div>
        </div>
        <FloatingField
          id="b17-feedback"
          label="Optional feedback"
          placeholder="Smooth session…"
          value={feedback}
          onChange={setFeedback}
          className="flex-1 min-w-[180px]"
        />
        {submitEnabled && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <FloatingButton
              type="submit"
              variant="primary"
              data-name="SessionCompletionSubmit"
              style={{
                background: "rgba(45, 212, 191, 0.22)",
                border: "1px solid #2dd4bf",
                color: "#2dd4bf",
                boxShadow: "0 0 18px rgba(45, 212, 191, 0.45)",
                fontFamily: "'Space Grotesk', sans-serif",
                fontSize: 13,
                fontWeight: 600,
              }}
            >
              Submit
            </FloatingButton>
          </motion.div>
        )}
      </div>
    </motion.form>
  );
}
