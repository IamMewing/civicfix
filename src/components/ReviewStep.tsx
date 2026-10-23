/**
 * ReviewStep — devpost/spec.md > Components > ReviewStep
 *
 * Slice 6 of devpost/checklist.md: every drafted field as an editable input, with a
 * manual category override for when the AI's confidence was low (or "uncertain").
 * Changing the category here isn't just a relabel — the parent (CaptureStep) re-runs
 * /api/research and /api/draft for the corrected category, so a manual override
 * actually re-routes to the correct authority, the same way getting it right on the
 * first try would have.
 */

"use client";

import type { IssueCategory } from "@/lib/types";

const CATEGORY_OPTIONS: { value: IssueCategory; label: string }[] = [
  { value: "pothole", label: "Pothole / road damage" },
  { value: "streetlight", label: "Broken streetlight" },
  { value: "water", label: "Water leakage / drainage" },
];

interface ReviewStepProps {
  category: IssueCategory;
  onCategoryChange: (category: IssueCategory) => void;
  description: string;
  onDescriptionChange: (value: string) => void;
  locationText: string;
  authorityName: string;
  complaintText: string;
  onComplaintTextChange: (value: string) => void;
  updating: boolean;
  canContinue: boolean;
  onContinue: () => void;
  onBack: () => void;
}

export default function ReviewStep({
  category,
  onCategoryChange,
  description,
  onDescriptionChange,
  locationText,
  authorityName,
  complaintText,
  onComplaintTextChange,
  updating,
  canContinue,
  onContinue,
  onBack,
}: ReviewStepProps) {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col gap-5 px-5 py-10 lg:max-w-2xl lg:px-10 lg:py-16">
      <header>
        <button type="button" onClick={onBack} className="text-sm font-medium text-ink/50 transition hover:text-ink/80">
          ← Back
        </button>
        <h1 className="font-display mt-3 text-3xl font-black tracking-tight lg:text-4xl">Review</h1>
        <p className="mt-1.5 text-sm text-slate lg:text-base">
          Fix anything that looks wrong before you file this for real.
        </p>
      </header>

      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-bold uppercase tracking-wide text-ink/40">Category</label>
        <select
          value={category === "uncertain" ? "" : category}
          onChange={(e) => onCategoryChange(e.target.value as IssueCategory)}
          className="rounded-2xl border-2 border-line bg-transparent px-4 py-3 text-sm font-medium"
        >
          {category === "uncertain" && <option value="">Choose the correct category…</option>}
          {CATEGORY_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        {category === "uncertain" && (
          <p className="mt-1 text-xs font-medium text-gold">
            The AI wasn&rsquo;t confident — pick the correct category to route this properly.
          </p>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-bold uppercase tracking-wide text-ink/40">Description</label>
        <textarea
          value={description}
          onChange={(e) => onDescriptionChange(e.target.value)}
          rows={3}
          className="rounded-2xl border-2 border-line bg-transparent px-4 py-3 text-sm"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-bold uppercase tracking-wide text-ink/40">Location</label>
        <div className="rounded-2xl border-2 border-line px-4 py-3 text-sm text-slate">{locationText}</div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-bold uppercase tracking-wide text-ink/40">Responsible authority</label>
        <div className="rounded-2xl border-2 border-verified/25 bg-verified-soft px-4 py-3 text-sm font-bold text-verified">
          {updating ? "Updating…" : authorityName}
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-bold uppercase tracking-wide text-ink/40">Complaint text</label>
        <textarea
          value={complaintText}
          onChange={(e) => onComplaintTextChange(e.target.value)}
          rows={8}
          className="rounded-2xl border-2 border-line bg-transparent px-4 py-3 text-sm leading-relaxed"
        />
      </div>

      <button
        type="button"
        onClick={onContinue}
        disabled={!canContinue}
        className="rounded-full bg-signal px-4 py-4 text-base font-bold text-paper transition hover:-translate-y-0.5 hover:shadow-lg hover:shadow-signal/30 disabled:translate-y-0 disabled:cursor-not-allowed disabled:bg-ink/15 disabled:text-ink/40 disabled:shadow-none"
      >
        {updating ? "Updating…" : "Looks good — continue"}
      </button>
    </main>
  );
}