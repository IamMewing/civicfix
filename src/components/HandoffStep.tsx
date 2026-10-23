/**
 * HandoffStep — devpost/spec.md > Components > HandoffStep
 *
 * Slice 7 of devpost/checklist.md: the actual proof-of-concept finish line
 * (scope.md > What "Working" Looks Like). No fake "submitted to government"
 * state — this hands off to the real official reporting channel (or the
 * general fallback) in a new tab, with the finished complaint text ready to
 * copy into that real form.
 *
 * Slice 11: real government portals turned out to be genuinely confusing to
 * navigate on their own (phone-OTP logins, multi-step menus, unfamiliar
 * field names) — see checklist.md. filingSteps, helplinePhone, and
 * tutorialVideoUrl are all live-verified, not guessed: steps come from
 * Claude actually clicking through each real portal, and the video comes
 * from navigating directly to youtube.com and picking a genuine relevant
 * result (plain web search couldn't surface these). All three are optional
 * since one legacy entry predates that pass.
 */

"use client";

import { useState } from "react";

interface HandoffStepProps {
  authorityName: string;
  reportingChannel: string;
  reportingChannelLabel: string;
  complaintText: string;
  filingSteps?: string[];
  helplinePhone?: string | null;
  tutorialVideoUrl?: string;
  tutorialVideoLabel?: string;
  onBack: () => void;
  onStartOver: () => void;
}

export default function HandoffStep({
  authorityName,
  reportingChannel,
  reportingChannelLabel,
  complaintText,
  filingSteps,
  helplinePhone,
  tutorialVideoUrl,
  tutorialVideoLabel,
  onBack,
  onStartOver,
}: HandoffStepProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(complaintText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API can fail (e.g. no permission) — the text is still visible to copy by hand.
    }
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col gap-5 px-5 py-10 lg:max-w-2xl lg:px-10 lg:py-16">
      <header>
        <button type="button" onClick={onBack} className="text-sm font-medium text-ink/50 transition hover:text-ink/80">
          ← Back to review
        </button>
        <h1 className="font-display mt-3 text-3xl font-black tracking-tight lg:text-4xl">File it for real</h1>
        <p className="mt-1.5 text-sm text-slate lg:text-base">
          This opens {authorityName}&rsquo;s real official reporting channel in a new tab. Copy the
          complaint text below and paste it into their form to actually submit it.
        </p>
      </header>

      <div className="rounded-2xl border-2 border-signal/25 bg-signal-soft px-4 py-4">
        <pre className="whitespace-pre-wrap rounded-xl bg-paper px-3 py-3 font-sans text-sm leading-relaxed">
          {complaintText}
        </pre>
        <button
          type="button"
          onClick={handleCopy}
          className="mt-3 rounded-full bg-signal px-4 py-2.5 text-sm font-bold text-paper transition hover:-translate-y-0.5"
        >
          {copied ? "Copied!" : "Copy complaint text"}
        </button>
      </div>

      <a
        href={reportingChannel}
        target="_blank"
        rel="noopener noreferrer"
        className="rounded-full bg-verified px-4 py-4 text-center text-base font-bold text-paper transition hover:-translate-y-0.5 hover:shadow-lg hover:shadow-verified/30"
      >
        Open {reportingChannelLabel} ↗
      </a>
      <p className="-mt-2 text-xs leading-relaxed text-ink/50">
        Government sites can be slow, down, or confusing to navigate once you&rsquo;re there — this is
        a real limitation of the portals themselves, not something CivicFix can fix. If it doesn&rsquo;t
        load, try again shortly, or search &ldquo;{authorityName} grievance&rdquo; for an alternative
        way to reach them.
      </p>

      {filingSteps && filingSteps.length > 0 && (
        <div className="rounded-2xl border-2 border-line px-4 py-4">
          <h2 className="font-display text-base font-black">What to click, step by step</h2>
          <p className="mt-1 text-xs leading-relaxed text-ink/50">
            Written from actually using this exact portal — not a guess at how it probably works.
          </p>
          <ol className="mt-3 flex flex-col gap-2.5">
            {filingSteps.map((step, i) => (
              <li key={i} className="flex gap-3 text-sm leading-relaxed text-ink/80">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-ink/10 text-xs font-bold text-ink/60">
                  {i + 1}
                </span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
          {helplinePhone && (
            <p className="mt-3 border-t border-ink/10 pt-3 text-xs leading-relaxed text-ink/60">
              Portal slow or confusing? Call/message{" "}
              <span className="font-bold text-ink/80">{helplinePhone}</span> instead.
            </p>
          )}
        </div>
      )}

      {tutorialVideoUrl && (
        <a
          href={tutorialVideoUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 rounded-2xl border-2 border-line px-4 py-3.5 transition hover:bg-ink/5"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-rust/10 text-rust">
            ▶
          </span>
          <span className="min-w-0">
            <span className="block text-xs font-bold uppercase tracking-wide text-ink/40">Watch a real walkthrough</span>
            <span className="block truncate text-sm font-semibold text-ink/80">
              {tutorialVideoLabel ?? "Open video"}
            </span>
          </span>
        </a>
      )}

      <button
        type="button"
        onClick={onStartOver}
        className="rounded-full border-2 border-line px-4 py-3 text-sm font-bold text-slate transition hover:bg-ink/5"
      >
        Report another problem
      </button>
    </main>
  );
}
