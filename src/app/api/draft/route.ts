/**
 * POST /api/draft — devpost/spec.md > Components > /api/draft
 *
 * Slice 4 of devpost/checklist.md: the last step of the core AI pipeline. Takes
 * everything gathered so far (category, authority, location, description) and has
 * the model write a complete, properly structured complaint, ready to paste into
 * the official government portal's form. Deliberately leaves out any invented
 * filer name/contact/address — the person adds their own on the real portal — and
 * never invents a law or code section (scope.md > Explicitly Cut flags this as a
 * real hallucination risk).
 */

import { NextRequest, NextResponse } from "next/server";
import { getGroqClient, GROQ_MODEL } from "@/lib/groq";
import type { DraftRequestBody, DraftResult } from "@/lib/types";

// Real bug found during demo testing: asking the model to "trust the category over a
// conflicting description" in the prompt wasn't reliable — with reasoning disabled (see
// the max_completion_tokens comment below), the model sometimes echoed whatever subject
// matter the reporter typed, even when it named a different problem than the photo was
// actually classified as (e.g. category="water" but description="potholes" produced a
// pothole-themed Issue line under a "Category: water" label). Asking the model to resolve
// a conflict isn't reliable, so this resolves it in code instead, the same way
// /api/research cross-checks the model's answer against verified data rather than trusting
// it blindly: if the typed description contains words for a category other than the one
// the photo was classified as, that description is never sent to the model at all.
const CATEGORY_CONFLICT_KEYWORDS: Record<string, string[]> = {
  pothole: ["pothole", "potholes", "road damage", "crater", "broken road", "cracked road", "road surface"],
  streetlight: ["streetlight", "street light", "streetlights", "street lamp", "lamp post", "no light", "dark street", "bulb", "lighting"],
  water: ["water leak", "waterlog", "drainage", "sewage", "sewer", "leaking pipe", "stagnant water", "flooding", "pipe burst", "pipeline"],
};

function descriptionConflictsWithCategory(description: string, category: string): boolean {
  const lower = description.toLowerCase();
  return Object.entries(CATEGORY_CONFLICT_KEYWORDS).some(
    ([otherCategory, words]) => otherCategory !== category && words.some((word) => lower.includes(word)),
  );
}

export async function POST(request: NextRequest) {
  let body: DraftRequestBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  const { category, description, location, authority, photoReasoning } = body;
  if (!category || !authority) {
    return NextResponse.json({ error: "Missing category or authority." }, { status: 400 });
  }

  // A plain Google Maps link built straight from the coordinates — no API key needed,
  // nothing for the model to invent (this is string templating, not an AI call), and it
  // flows into the drafted complaint via the "Location: <verbatim>" instruction below.
  // Officials can open it directly, and CivicFix's own UI renders it as a real clickable
  // link wherever the complaint text is shown (see src/lib/linkify.tsx).
  const mapLink = location ? `https://www.google.com/maps?q=${location.lat},${location.lng}` : null;

  const locationText = location
    ? location.placeName
      ? `${location.placeName} (coordinates: ${location.lat.toFixed(6)}, ${location.lng.toFixed(6)}) — Map: ${mapLink}`
      : `Latitude ${location.lat.toFixed(6)}, Longitude ${location.lng.toFixed(6)} — Map: ${mapLink}`
    : "Location not provided";

  // See CATEGORY_CONFLICT_KEYWORDS above: a description naming a different problem than
  // the photo-classified category is dropped entirely, never handed to the model.
  const descriptionConflicts = Boolean(description) && descriptionConflictsWithCategory(description, category);
  const descriptionForPrompt = descriptionConflicts
    ? `(the reporter's typed text described a different kind of problem than what the photo was actually classified as, so it's been left out — write the Issue from the verified "${category}" classification alone)`
    : description || "(none provided — infer a reasonable one-line description from the category alone)";

  const prompt = `You are drafting a civic complaint for CivicFix, to be filed with an Indian government authority.

Details:
- Category (determined by AI photo analysis of the actual uploaded image): ${category}
${photoReasoning ? `- What the photo actually shows (from that same photo analysis — this is the most specific, reliable detail available, more specific than the category bucket alone; "${category}" can cover several distinct real problems, e.g. a drainage leak vs. a water-supply shortage are both "water"): ${photoReasoning}` : ""}
- Description typed by the reporter: ${descriptionForPrompt}
- Location: ${locationText}
- Responsible authority: ${authority.authorityName}

Write a short, clear, polite, properly formatted civic complaint, ready to paste into an official grievance form. The complaint — including the "Issue" line — must describe the specific "${category}" problem detailed above${photoReasoning ? " in \"What the photo actually shows\"" : ""}, because that's what the photo shows and what "${authority.authorityName}" will be asked to fix. Do not default to a generic or merely "typical" version of a "${category}" problem — ground the Issue in the actual specifics given, not an assumption.

Structure it with exactly these labeled lines, each on its own line:
Subject: <one-line subject, about a "${category}" problem>
Issue: <2-3 sentence description of the "${category}" problem, professional tone>
Location: <the location given above, verbatim>
Category: <the category>
Requested Action: <one sentence requesting the authority inspect/repair/resolve this>

Rules:
- Do NOT invent a filer name, phone number, or address — leave those out entirely; the reporter will add their own contact details directly on the government portal.
- Do NOT invent any specific law, municipal code section, or authority beyond "${authority.authorityName}".
- Respond with ONLY the complaint text in the structure above — no other commentary, no markdown formatting, no code fences.`;

  try {
    const client = getGroqClient();
    const completion = await client.chat.completions.create({
      model: GROQ_MODEL,
      temperature: 0.4,
      // See the matching comment in /api/classify: reasoning_effort: "none" stops
      // this model from quietly burning hidden chain-of-thought tokens against
      // Groq's free-tier 1000-tokens/minute output cap. 700 completion tokens is
      // comfortably enough for the few-hundred-word complaint this route writes.
      reasoning_effort: "none",
      max_completion_tokens: 700,
      messages: [{ role: "user", content: prompt }],
    });

    const complaintText = completion.choices[0]?.message?.content?.trim();
    if (!complaintText) {
      return NextResponse.json(
        { error: "The model did not return a draft. Please try again." },
        { status: 502 },
      );
    }

    const result: DraftResult = {
      category,
      authorityName: authority.authorityName,
      sourceUrl: authority.reportingChannel,
      location: locationText,
      description: description || "",
      complaintText,
    };

    return NextResponse.json(result);
  } catch (err) {
    console.error("[/api/draft] request failed:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Drafting the complaint failed. Please try again." },
      { status: 500 },
    );
  }
}
