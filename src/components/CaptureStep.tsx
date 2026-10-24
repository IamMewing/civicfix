/**
 * CaptureStep — devpost/spec.md > Components > CaptureStep
 *
 * The full journey (devpost/spec.md > The Core Journey Through the System):
 * Capture → Pipeline (classify → research → draft) → Review (editable, slice 6) →
 * Hand-off (slice 7, devpost/checklist.md). This component owns the whole pipeline
 * state and switches which screen is visible via `phase`, rather than being three
 * separate stateless screens, so the real AI results flow straight through without
 * re-fetching.
 *
 * A manual category override in Review isn't just a relabel: it re-runs
 * /api/research and /api/draft for the corrected category, so picking the right
 * category yourself actually re-routes to the correct authority too.
 *
 * Visual language (premium pass, see devpost/checklist.md > Revisions): flat
 * bordered blocks in the three category accent colors instead of soft generic
 * amber/emerald/blue cards, pill-shaped buttons matching the landing page at `/`.
 */

"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import PipelineAnimation, { type PipelineStepState, type StepStatus } from "@/components/PipelineAnimation";
import ReviewStep from "@/components/ReviewStep";
import HandoffStep from "@/components/HandoffStep";
import LocationPicker from "@/components/LocationPicker";
import { PotholeIcon, StreetlightIcon, WaterLeakIcon } from "@/components/icons/CategoryIcons";
import { CameraIcon, GalleryIcon } from "@/components/icons/CaptureIcons";
import type { ClassifyResult, DraftResult, GeoLocation, IssueCategory, ResearchResult } from "@/lib/types";

async function fileToBase64(file: File): Promise<{ base64: string; mimeType: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== "string") {
        reject(new Error("Could not read the selected file."));
        return;
      }
      const [header, base64] = result.split(",");
      const mimeMatch = header.match(/^data:(.*);base64$/);
      resolve({ base64, mimeType: mimeMatch?.[1] ?? file.type ?? "image/jpeg" });
    };
    reader.onerror = () => reject(new Error("Could not read the selected file."));
    reader.readAsDataURL(file);
  });
}

type LocationStatus = "idle" | "requesting" | "granted" | "denied";
type Phase = "capture" | "review" | "handoff";

const INITIAL_STEPS: PipelineStepState[] = [
  { id: "classify", label: "Classify", status: "pending" },
  { id: "research", label: "Research", status: "pending" },
  { id: "draft", label: "Draft", status: "pending" },
];

const CATEGORY_STYLE: Record<IssueCategory, { soft: string; text: string; border: string; Icon: typeof PotholeIcon | null }> = {
  pothole: { soft: "bg-rust-soft", text: "text-rust", border: "border-rust/25", Icon: PotholeIcon },
  streetlight: { soft: "bg-gold-soft", text: "text-gold", border: "border-gold/25", Icon: StreetlightIcon },
  water: { soft: "bg-signal-soft", text: "text-signal", border: "border-signal/25", Icon: WaterLeakIcon },
  uncertain: { soft: "bg-ink/5", text: "text-ink/70", border: "border-line", Icon: null },
};

const fadeUp = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
  transition: { duration: 0.35, ease: "easeOut" as const },
};

export default function CaptureStep() {
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const [phase, setPhase] = useState<Phase>("capture");

  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState<GeoLocation | null>(null);
  const [locationStatus, setLocationStatus] = useState<LocationStatus>("idle");
  const [placeStatus, setPlaceStatus] = useState<"idle" | "loading" | "done">("idle");
  const [pickerOpen, setPickerOpen] = useState(false);

  const [steps, setSteps] = useState<PipelineStepState[]>(INITIAL_STEPS);
  const [started, setStarted] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ClassifyResult | null>(null);
  const [researchError, setResearchError] = useState<string | null>(null);
  const [research, setResearch] = useState<ResearchResult | null>(null);
  const [draftError, setDraftError] = useState<string | null>(null);
  const [draft, setDraft] = useState<DraftResult | null>(null);
  const [editedComplaintText, setEditedComplaintText] = useState("");
  const [copied, setCopied] = useState(false);

  function setStepStatus(id: string, status: StepStatus) {
    setSteps((prev) => prev.map((s) => (s.id === id ? { ...s, status } : s)));
  }

  function handleFileSelected(file: File | undefined) {
    if (!file) return;
    setPendingFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    setStarted(false);
    setSteps(INITIAL_STEPS);
    setResult(null);
    setError(null);
    setResearch(null);
    setResearchError(null);
    setDraft(null);
    setDraftError(null);
    setEditedComplaintText("");
  }

  // Reverse-geocodes the raw coordinates into a readable area name (e.g. "Madhapur,
  // Hyderabad") via /api/geocode, so the UI and drafted complaint never have to show
  // bare latitude/longitude to the person. Best-effort: if it fails, `location`
  // simply keeps no placeName and every display falls back to the coordinates.
  async function resolvePlaceName(lat: number, lng: number) {
    setPlaceStatus("loading");
    try {
      const res = await fetch("/api/geocode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lat, lng }),
      });
      const data = await res.json();
      if (res.ok) {
        setLocation((prev) =>
          prev && prev.lat === lat && prev.lng === lng
            ? { ...prev, placeName: data.placeName ?? prev.placeName, citySlug: data.citySlug ?? null }
            : prev,
        );
      }
    } catch {
      // Swallow — the UI falls back to coordinates when placeName stays unset.
    } finally {
      setPlaceStatus("done");
    }
  }

  // Opens the full-screen map (LocationPicker) instead of silently trusting a raw
  // GPS fix — the picker does its own GPS request internally, plus lets the
  // reporter nudge the pin or search an address when GPS is off by enough to
  // matter (indoors, under a flyover, dense areas).
  function requestLocation() {
    setPickerOpen(true);
  }

  // LocationPicker hands back a confirmed {lat, lng} once the reporter accepts the
  // pin's position; this re-resolves it into a place name + city slug the same way
  // a raw GPS fix always has, so the rest of the pipeline doesn't need to know
  // whether the coordinates came from GPS, a drag, or a search result.
  function handleLocationConfirmed(loc: { lat: number; lng: number }) {
    setPickerOpen(false);
    setLocationStatus("granted");
    setLocation({ lat: loc.lat, lng: loc.lng });
    resolvePlaceName(loc.lat, loc.lng);
  }

  async function runDraft(classification: ClassifyResult, authority: ResearchResult) {
    setStepStatus("draft", "active");
    setDraftError(null);
    setCopied(false);
    try {
      const res = await fetch("/api/draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category: classification.category,
          description,
          location,
          authority,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Drafting the complaint failed.");
      }
      const draftResult = data as DraftResult;
      setDraft(draftResult);
      setEditedComplaintText(draftResult.complaintText);
      setStepStatus("draft", "done");
    } catch (err) {
      setDraftError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
      setStepStatus("draft", "error");
    }
  }

  async function runResearch(classification: ClassifyResult) {
    setStepStatus("research", "active");
    setResearchError(null);
    try {
      const res = await fetch("/api/research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category: classification.category,
          confidence: classification.confidence,
          citySlug: location?.citySlug ?? null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Authority research failed.");
      }
      const authority = data as ResearchResult;
      setResearch(authority);
      setStepStatus("research", "done");
      await runDraft(classification, authority);
    } catch (err) {
      setResearchError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
      setStepStatus("research", "error");
    }
  }

  async function handleAnalyze() {
    if (!pendingFile) {
      setError("Take or upload a photo first.");
      return;
    }
    setStarted(true);
    setSteps(INITIAL_STEPS);
    setStepStatus("classify", "active");
    setError(null);
    setResult(null);
    setResearch(null);
    setResearchError(null);
    setDraft(null);
    setDraftError(null);
    setEditedComplaintText("");
    try {
      const { base64, mimeType } = await fileToBase64(pendingFile);
      const res = await fetch("/api/classify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64: base64, imageMimeType: mimeType, description }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Classification failed.");
      }
      const classification = data as ClassifyResult;
      setResult(classification);
      setStepStatus("classify", "done");
      // Only chase authority research + a draft when this is actually a civic
      // issue — otherwise the pipeline stops here and the person is asked to pick
      // a category themselves if they believe it really is one. See
      // src/app/api/classify/route.ts for the isCivicIssue signal.
      if (classification.isCivicIssue) {
        await runResearch(classification);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
      setStepStatus("classify", "error");
    }
  }

  // A manual category override in Review re-runs research + draft for the corrected
  // category, so it actually re-routes to the right authority — not just a relabel.
  async function handleCategoryOverride(newCategory: IssueCategory) {
    if (!result || newCategory === result.category) return;
    const updated: ClassifyResult = {
      ...result,
      category: newCategory,
      confidence: 1,
      isCivicIssue: true,
      // The original reasoning explained the AI's own (now-overridden) call — often
      // the opposite of what was just picked (e.g. "this is a person's face, not a
      // civic issue"). Leaving it in place would show that sentence directly under
      // a card now labeled "Pothole," which reads as self-contradictory and broken.
      reasoning: "Category corrected manually by the reporter.",
    };
    setResult(updated);
    await runResearch(updated);
  }

  async function handleCopyDraft() {
    if (!draft) return;
    try {
      await navigator.clipboard.writeText(editedComplaintText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API can fail (e.g. no permission) — the text is still visible to copy by hand.
    }
  }

  function handleStartOver() {
    setPendingFile(null);
    setPreviewUrl(null);
    setDescription("");
    setLocation(null);
    setLocationStatus("idle");
    setPlaceStatus("idle");
    setStarted(false);
    setSteps(INITIAL_STEPS);
    setError(null);
    setResult(null);
    setResearchError(null);
    setResearch(null);
    setDraftError(null);
    setDraft(null);
    setEditedComplaintText("");
    setCopied(false);
    setPhase("capture");
  }

  const busy = steps.some((s) => s.status === "active");
  const locationText = location
    ? (location.placeName ?? `${location.lat.toFixed(6)}, ${location.lng.toFixed(6)}`)
    : "Not provided";

  let screen: React.ReactNode;

  if (phase === "review" && result && research) {
    screen = (
      <ReviewStep
        category={result.category}
        onCategoryChange={handleCategoryOverride}
        description={description}
        onDescriptionChange={setDescription}
        locationText={locationText}
        authorityName={research.authorityName}
        complaintText={editedComplaintText}
        onComplaintTextChange={setEditedComplaintText}
        updating={busy}
        canContinue={!!draft && result.category !== "uncertain" && !busy}
        onContinue={() => setPhase("handoff")}
        onBack={() => setPhase("capture")}
      />
    );
  } else if (phase === "handoff" && research) {
    screen = (
      <HandoffStep
        authorityName={research.authorityName}
        officialDomain={research.officialDomain}
        verifiedDate={research.verifiedDate}
        reportingChannel={research.reportingChannel}
        reportingChannelLabel={research.reportingChannelLabel}
        complaintText={editedComplaintText}
        filingSteps={research.filingSteps}
        helplinePhone={research.helplinePhone}
        tutorialVideoUrl={research.tutorialVideoUrl}
        tutorialVideoLabel={research.tutorialVideoLabel}
        onBack={() => setPhase("review")}
        onStartOver={handleStartOver}
      />
    );
  } else {
    const categoryStyle = result ? CATEGORY_STYLE[result.category] : null;
    const CategoryIcon = categoryStyle?.Icon ?? null;

    screen = (
      <main className="mx-auto w-full max-w-md px-5 py-10 lg:max-w-5xl lg:px-10 lg:py-16">
        <header className="lg:max-w-2xl">
          <Link href="/" className="text-sm font-medium text-ink/50 transition hover:text-ink/80">
            ← Back to site
          </Link>
          <h1 className="font-display mt-3 text-3xl font-black tracking-tight lg:text-4xl">CivicFix</h1>
          <p className="mt-1.5 text-sm text-slate lg:text-base">
            Photograph a civic problem anywhere in India — we&rsquo;ll find out who&rsquo;s actually
            responsible.
          </p>
        </header>

        <div className="mt-6 flex flex-col gap-5 lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-start lg:gap-10">
          <div className="flex flex-col gap-5">
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => handleFileSelected(e.target.files?.[0])}
            />
            <input
              ref={galleryInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => handleFileSelected(e.target.files?.[0])}
            />

            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => cameraInputRef.current?.click()}
                className="flex flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-amber-deep/50 bg-amber/10 px-4 py-5 text-sm font-bold text-amber-deep transition hover:bg-amber/20"
              >
                <CameraIcon className="h-7 w-7" />
                {previewUrl ? "Retake" : "Take a photo"}
              </button>
              <button
                type="button"
                onClick={() => galleryInputRef.current?.click()}
                className="flex flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-amber-deep/50 bg-amber/10 px-4 py-5 text-sm font-bold text-amber-deep transition hover:bg-amber/20"
              >
                <GalleryIcon className="h-7 w-7" />
                {previewUrl ? "Choose different" : "Choose from photos"}
              </button>
            </div>

            {previewUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={previewUrl}
                alt="Selected civic issue"
                className="w-full rounded-2xl border-2 border-line object-cover lg:max-h-80"
              />
            )}

            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe what's wrong (optional, but helps)"
              rows={3}
              className="w-full rounded-2xl border-2 border-line bg-transparent px-4 py-3 text-sm placeholder:text-ink/35 focus:border-signal focus:outline-none"
            />

            <button
              type="button"
              onClick={requestLocation}
              className={`rounded-2xl border-2 px-4 py-3.5 text-left text-sm font-semibold transition ${
                locationStatus === "granted"
                  ? "border-verified/40 bg-verified-soft text-verified"
                  : "border-line text-ink/70"
              }`}
            >
              {locationStatus === "granted" && location
                ? placeStatus === "loading"
                  ? "Finding your area…"
                  : `Location set (${location.placeName ?? `${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}`})`
                : locationStatus === "requesting"
                  ? "Getting your location…"
                  : locationStatus === "denied"
                    ? "Location unavailable — tap to retry"
                    : "Share my location"}
            </button>

            <button
              type="button"
              onClick={handleAnalyze}
              disabled={busy || !pendingFile}
              className="rounded-full bg-signal px-4 py-4 text-base font-bold text-paper transition hover:-translate-y-0.5 hover:shadow-lg hover:shadow-signal/30 disabled:translate-y-0 disabled:cursor-not-allowed disabled:bg-ink/15 disabled:text-ink/40 disabled:shadow-none"
            >
              {busy ? "Working…" : "Analyze"}
            </button>

            {error && (
              <div className="rounded-2xl border-2 border-rust/30 bg-rust-soft px-4 py-3 text-sm text-rust">
                {error}{" "}
                <button type="button" onClick={handleAnalyze} className="font-bold underline underline-offset-2">
                  Retry
                </button>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-5 lg:sticky lg:top-10">
            {started && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
            <PipelineAnimation steps={steps} />
          </motion.div>
        )}

        <AnimatePresence>
          {result && (
            <motion.div
              key="classify-result"
              {...fadeUp}
              className={`rounded-2xl border-2 ${categoryStyle?.border} ${categoryStyle?.soft} px-4 py-4`}
            >
              <div className="flex items-center gap-3">
                {CategoryIcon && <CategoryIcon className={`h-8 w-8 shrink-0 ${categoryStyle?.text}`} />}
                <div>
                  <div className={`font-display text-lg font-black capitalize ${categoryStyle?.text}`}>
                    {!result.isCivicIssue
                      ? "Doesn't look like a civic issue"
                      : result.category === "uncertain"
                        ? "Not sure — pick manually next"
                        : result.category}
                  </div>
                  <div className="text-sm text-slate">Confidence: {(result.confidence * 100).toFixed(0)}%</div>
                </div>
              </div>
              <div className="mt-2.5 text-sm leading-relaxed text-ink/80">{result.reasoning}</div>
              {(!result.isCivicIssue || result.category === "uncertain" || result.confidence < 0.5) && (
                <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-ink/10 pt-3">
                  <span className="text-xs font-semibold text-ink/50">
                    {!result.isCivicIssue
                      ? "Actually a pothole, streetlight, or water problem?"
                      : "Not confident — pick the right one yourself:"}
                  </span>
                  {(["pothole", "streetlight", "water"] as const).map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => handleCategoryOverride(c)}
                      className="rounded-full border-2 border-ink/15 px-3 py-1.5 text-xs font-bold capitalize transition hover:bg-ink/5"
                    >
                      {c}
                    </button>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {researchError && (
          <div className="rounded-2xl border-2 border-rust/30 bg-rust-soft px-4 py-3 text-sm text-rust">
            {researchError}{" "}
            {result && (
              <button
                type="button"
                onClick={() => runResearch(result)}
                className="font-bold underline underline-offset-2"
              >
                Retry
              </button>
            )}
          </div>
        )}

        <AnimatePresence>
          {research && (
            <motion.div
              key="research-result"
              {...fadeUp}
              className="rounded-2xl border-2 border-verified/25 bg-verified-soft px-4 py-4"
            >
              {!research.cityRecognized ? (
                <div className="mb-2 inline-block rounded-full bg-verified/15 px-2.5 py-0.5 text-xs font-bold text-verified">
                  Nationwide — CPGRAMS
                </div>
              ) : research.usedFallback ? (
                <div className="mb-2 inline-block rounded-full bg-verified/15 px-2.5 py-0.5 text-xs font-bold text-verified">
                  General fallback
                </div>
              ) : null}
              {!research.cityRecognized && (
                <div className="mb-2 text-xs leading-relaxed text-ink/60">
                  Your area isn&apos;t one of CivicFix&apos;s specifically-verified cities yet, so this routes to India&apos;s
                  national grievance portal instead of a named local authority.
                </div>
              )}
              <div className="font-display text-lg font-black text-verified">{research.authorityName}</div>
              <div className="mt-1 text-sm leading-relaxed text-ink/80">{research.sourceNote}</div>
              {research.verifiedDate && (
                <div className="mt-2 text-xs font-bold text-verified/80">
                  ✓ Verified{" "}
                  {new Date(`${research.verifiedDate}T00:00:00Z`).toLocaleDateString("en-IN", {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                    timeZone: "UTC",
                  })}
                  {research.officialDomain && ` · ${research.officialDomain.replace(/^https?:\/\//, "")}`}
                </div>
              )}
              <a
                href={research.reportingChannel}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-block text-sm font-bold text-verified underline underline-offset-2"
              >
                {research.reportingChannelLabel} ↗
              </a>
            </motion.div>
          )}
        </AnimatePresence>

        {draftError && (
          <div className="rounded-2xl border-2 border-rust/30 bg-rust-soft px-4 py-3 text-sm text-rust">
            {draftError}{" "}
            {result && research && (
              <button
                type="button"
                onClick={() => runDraft(result, research)}
                className="font-bold underline underline-offset-2"
              >
                Retry
              </button>
            )}
          </div>
        )}

        <AnimatePresence>
          {draft && (
            <motion.div
              key="draft-result"
              {...fadeUp}
              className="rounded-2xl border-2 border-signal/25 bg-signal-soft px-4 py-4"
            >
              <div className="font-display mb-2 text-lg font-black text-signal">Drafted complaint</div>
              <pre className="whitespace-pre-wrap rounded-xl bg-paper px-3 py-3 font-sans text-sm leading-relaxed">
                {editedComplaintText}
              </pre>
              <button
                type="button"
                onClick={handleCopyDraft}
                className="mt-3 rounded-full bg-signal px-4 py-2.5 text-sm font-bold text-paper transition hover:-translate-y-0.5"
              >
                {copied ? "Copied!" : "Copy complaint text"}
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {draft && !busy && (
          <motion.button
            {...fadeUp}
            type="button"
            onClick={() => setPhase("review")}
            className="rounded-full bg-verified px-4 py-4 text-base font-bold text-paper transition hover:-translate-y-0.5 hover:shadow-lg hover:shadow-verified/30"
          >
            Review &amp; file this complaint
          </motion.button>
        )}
          </div>
        </div>
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-paper">
      <AnimatePresence mode="wait">
        <motion.div
          key={phase}
          initial={{ opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -16 }}
          transition={{ duration: 0.25, ease: "easeInOut" }}
        >
          {screen}
        </motion.div>
      </AnimatePresence>

      {pickerOpen && (
        <LocationPicker
          initialLocation={location ? { lat: location.lat, lng: location.lng } : null}
          onConfirm={handleLocationConfirmed}
          onCancel={() => setPickerOpen(false)}
        />
      )}
    </div>
  );
}
