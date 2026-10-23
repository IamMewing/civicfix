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

export async function POST(request: NextRequest) {
  let body: DraftRequestBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  const { category, description, location, authority } = body;
  if (!category || !authority) {
    return NextResponse.json({ error: "Missing category or authority." }, { status: 400 });
  }

  const locationText = location
    ? location.placeName
      ? `${location.placeName} (coordinates: ${location.lat.toFixed(6)}, ${location.lng.toFixed(6)})`
      : `Latitude ${location.lat.toFixed(6)}, Longitude ${location.lng.toFixed(6)}`
    : "Location not provided";

  const prompt = `You are drafting a civic complaint for CivicFix, to be filed with an Indian government authority.

Details:
- Category: ${category}
- Description from the reporter: ${description || "(none provided — infer a reasonable one-line description from the category alone)"}
- Location: ${locationText}
- Responsible authority: ${authority.authorityName}

Write a short, clear, polite, properly formatted civic complaint, ready to paste into an official grievance form. Structure it with exactly these labeled lines, each on its own line:
Subject: <one-line subject>
Issue: <2-3 sentence description of the problem, professional tone>
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
