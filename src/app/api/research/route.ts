/**
 * POST /api/research — devpost/spec.md > Components > /api/research
 *
 * This is the project's actual unique kernel (scope.md > The Unique Kernel): given the
 * classified category and the reporter's city, identify the correct authority and cite
 * its verified source. The model reasons over `src/data/authorities.json` (real, pre-
 * verified research — see checklist.md > Revisions for why this isn't live web search),
 * scoped to the reporter's own city once CivicFix expanded past Hyderabad (see the
 * "India-wide (8 metros)" Revisions entry).
 *
 * Two kinds of fallback, both to a REAL verified channel, never a guess:
 * - Within a recognized city: low confidence / uncertain category -> that city's own
 *   general_fallback entry (e.g. GHMC's general citizen services for Hyderabad).
 * - City not recognized at all (outside the verified metro list, or no location given):
 *   -> `national_fallback`, CPGRAMS, the Government of India's real nationwide
 *   grievance portal. This is still a genuine, correct channel — just less specific
 *   than a verified local authority — rather than ever inventing one.
 *
 * A safety net after the model call verifies the returned URL actually matches one of
 * the verified entries offered to it, so a model slip can't hand back an invented or
 * mismatched government URL — the project explicitly avoids ever presenting a guessed
 * or hallucinated official source.
 */

import { readFileSync } from "fs";
import path from "path";
import { NextRequest, NextResponse } from "next/server";
import { getGroqClient, GROQ_MODEL } from "@/lib/groq";
import type { AuthorityEntry, ResearchRequestBody, ResearchResult } from "@/lib/types";

interface AuthoritiesData {
  national_fallback: AuthorityEntry;
  cities: Record<string, Record<string, AuthorityEntry>>;
}

let authoritiesCache: AuthoritiesData | null = null;

function loadAuthorities(): AuthoritiesData {
  if (!authoritiesCache) {
    const filePath = path.join(process.cwd(), "src", "data", "authorities.json");
    const raw = readFileSync(filePath, "utf-8");
    const parsed = JSON.parse(raw);
    delete parsed._meta;
    authoritiesCache = parsed as AuthoritiesData;
  }
  return authoritiesCache!;
}

export async function POST(request: NextRequest) {
  let body: ResearchRequestBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  const { category, confidence, citySlug } = body;
  if (!category) {
    return NextResponse.json({ error: "No category was provided." }, { status: 400 });
  }

  const data = loadAuthorities();
  const cityKey = citySlug && data.cities[citySlug] ? citySlug : null;

  // Location fell outside CivicFix's specifically-verified metros (or wasn't available
  // at all). Route straight to CPGRAMS — a real, correct, nationwide channel — with no
  // model call needed, since there's no city-specific data to reason over.
  if (!cityKey) {
    const result: ResearchResult = { ...data.national_fallback, usedFallback: true, cityRecognized: false };
    return NextResponse.json(result);
  }

  const authorities = data.cities[cityKey];
  const lowConfidence = typeof confidence === "number" && confidence < 0.5;
  const isUncertain = category === "uncertain" || lowConfidence || !authorities[category];

  const relevantEntries: Record<string, AuthorityEntry> = isUncertain
    ? { general_fallback: authorities.general_fallback }
    : { [category]: authorities[category], general_fallback: authorities.general_fallback };

  const prompt = `You are the authority-research step for CivicFix, an app that routes Indian civic complaints to the correct government authority.

The issue has been classified as: "${category}"${lowConfidence ? " (low confidence classification)" : ""}, reported in the city identified as "${cityKey}".

Here is verified data about which authority in that city handles this kind of issue:
${JSON.stringify(relevantEntries, null, 2)}

Based ONLY on this verified data, identify the single correct responsible authority entry to use. If the classification is "uncertain" or low confidence, use the general_fallback entry instead of guessing a specific one.

Respond with ONLY a JSON object, no other text, markdown, or code fences, in exactly this shape:
{"authorityName": "...", "officialDomain": "...", "reportingChannel": "...", "reportingChannelLabel": "...", "sourceNote": "...", "usedFallback": true or false}

Copy every field's value EXACTLY from the verified data above — never invent or alter a name or URL.`;

  try {
    const client = getGroqClient();
    const completion = await client.chat.completions.create({
      model: GROQ_MODEL,
      temperature: 0,
      messages: [{ role: "user", content: prompt }],
    });

    const raw = completion.choices[0]?.message?.content ?? "";
    const jsonMatch = raw.match(/\{[\s\S]*\}/);

    if (!jsonMatch) {
      console.error("[/api/research] no JSON found in model response:", raw);
      return fallbackResponse(authorities, "The model's response couldn't be understood.");
    }

    let parsed: ResearchResult;
    try {
      parsed = JSON.parse(jsonMatch[0]);
    } catch {
      console.error("[/api/research] malformed JSON from model:", jsonMatch[0]);
      return fallbackResponse(authorities, "The model's response couldn't be understood.");
    }

    // Safety net: the returned reportingChannel must exactly match one of the entries
    // actually offered to the model for this city/category. If it doesn't, something
    // went wrong in the model's response — fall back to this city's general grievance
    // entry rather than ever showing an unverified URL.
    const matchedEntry = Object.values(relevantEntries).find((a) => a.reportingChannel === parsed.reportingChannel);
    if (!matchedEntry) {
      console.error("[/api/research] model returned an unverified URL:", parsed.reportingChannel);
      return fallbackResponse(authorities, "Could not verify the suggested source.");
    }

    // Build the result from matchedEntry (the verified data) rather than the model's
    // own echoed JSON. The prompt only asks the model to echo back five scalar fields
    // for brevity, so matchedEntry is also what actually carries filingSteps,
    // helplinePhone, and tutorialVideoUrl/Label through to the UI — relying on the
    // model to faithfully retype an array of strings would be both wasteful and
    // fragile.
    const result: ResearchResult = { ...matchedEntry, usedFallback: parsed.usedFallback ?? false, cityRecognized: true };
    return NextResponse.json(result);
  } catch (err) {
    console.error("[/api/research] request failed:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Authority research failed. Please try again." },
      { status: 500 },
    );
  }
}

function fallbackResponse(authorities: Record<string, AuthorityEntry>, reason: string) {
  const fallback = authorities.general_fallback;
  const result: ResearchResult = { ...fallback, usedFallback: true, cityRecognized: true };
  console.warn(`[/api/research] falling back to this city's general_fallback: ${reason}`);
  return NextResponse.json(result);
}
