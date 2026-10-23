/**
 * PipelineAnimation — devpost/spec.md > Components > PipelineAnimation
 *
 * Slice 5 of devpost/checklist.md: a horizontal 3-step progress indicator
 * (Classify → Research → Draft) whose circles and connecting lines animate
 * between pending/active/done/error states. Every transition here is driven
 * by a real network call finishing in CaptureStep — nothing here is on a
 * fixed timer. This replaces the plain "Analyzing…/Researching…/Drafting…"
 * text from slices 2-4 with the actual "wow" moment for the demo video.
 */

"use client";

import { motion } from "framer-motion";

export type StepStatus = "pending" | "active" | "done" | "error";

export interface PipelineStepState {
  id: string;
  label: string;
  status: StepStatus;
}

function StepCircle({ status }: { status: StepStatus }) {
  const base = "flex items-center justify-center rounded-full text-sm font-bold h-9 w-9";

  if (status === "done") {
    return (
      <motion.div
        initial={{ scale: 0.4, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 420, damping: 24 }}
        className={`${base} bg-verified text-paper`}
      >
        ✓
      </motion.div>
    );
  }

  if (status === "error") {
    return (
      <motion.div
        initial={{ scale: 0.4, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 420, damping: 24 }}
        className={`${base} bg-rust text-paper`}
      >
        !
      </motion.div>
    );
  }

  if (status === "active") {
    return (
      <div className={`${base} border-2 border-amber-deep bg-amber/15`}>
        <motion.span
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 0.9, ease: "linear" }}
          className="block h-4 w-4 rounded-full border-2 border-amber-deep border-t-transparent"
        />
      </div>
    );
  }

  return <div className={`${base} border-2 border-line text-ink/25`}>•</div>;
}

export default function PipelineAnimation({ steps }: { steps: PipelineStepState[] }) {
  return (
    <div className="rounded-2xl border-2 border-line px-4 py-5">
      <div className="flex items-start">
        {steps.map((step, i) => (
          <div key={step.id} className="flex flex-1 items-center last:flex-none">
            <div className="flex flex-col items-center gap-2">
              <StepCircle status={step.status} />
              <span
                className={`text-center text-xs font-semibold ${
                  step.status === "pending" ? "text-ink/30" : step.status === "error" ? "text-rust" : "text-ink/70"
                }`}
              >
                {step.label}
              </span>
            </div>

            {i < steps.length - 1 && (
              <div className="relative mx-2 mt-[-20px] h-0.5 flex-1 overflow-hidden rounded-full bg-line">
                <motion.div
                  initial={false}
                  animate={{ width: step.status === "done" ? "100%" : "0%" }}
                  transition={{ duration: 0.4, ease: "easeOut" }}
                  className="absolute inset-y-0 left-0 bg-verified"
                />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
