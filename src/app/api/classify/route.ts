/**
 * POST /api/classify — devpost/spec.md > Components > /api/classify
 *
 * Receives a base64 photo (plus an optional typed description) and asks Groq's vision
 * model to classify it into one of CivicFix's three supported categories, or "uncertain"
 * when it can't confidently tell. This is slice 2 of devpost/checklist.md: the first real
 * piece of the AI pipeline, wired to the real Groq call proven in slice 1.
 */

import { NextRequest, NextResponse } from "next/server";
import { getGroqClient, GROQ_MODEL } from "@/lib/groq";
import type { ClassifyRequestBody, ClassifyResult, IssueCategory } from "@/lib/types";

const VALID_CATEGORIES: IssueCategory[] = ["pothole", "streetlight", "water", "uncertain"];

export async function POST(request: NextRequest) {
  let body: ClassifyRequestBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  const { imageBase64, imageMimeType, description } = body;

  if (!imageBase64) {
    return NextResponse.json({ error: "No photo was provided." }, { status: 400 });
  }

  const mimeType = imageMimeType || "image/jpeg";

  const prompt = `You are the vision classifier for CivicFix, an app that routes Indian civic complaints to the right government authority.

Look at the attached photo${description ? ` (the person reporting it also typed this description: "${description}")` : ""} and classify it into exactly one of these categories:
- "pothole" — road damage, potholes, cracked or broken road surface
- "streetlight" — broken, dark, or malfunctioning street lighting
- "water" — water leakage, broken pipes, drainage or sewerage issues
- "uncertain" — it's plausibly some kind of civic/municipal problem, but you can't tell which of the above three it is

Separately, decide isCivicIssue: is this photo actually showing a real civic/municipal infrastructure problem — something a city government would fix — at all? Set isCivicIssue to false for anything that isn't that: a person, a face, an animal, a document, food, an unrelated object or scene, etc. This matters a lot: a complaint must never be auto-drafted from an irrelevant photo, so be strict here.

Respond with ONLY a JSON object, no other text, markdown, or code fences, in exactly this shape:
{"category": "pothole" | "streetlight" | "water" | "uncertain", "confidence": <number between 0 and 1>, "isCivicIssue": true | false, "reasoning": "<one short sentence explaining the call>"}`;

  try {
    const client = getGroqClient();

    const completion = await client.chat.completions.create({
      model: GROQ_MODEL,
      temperature: 0.2,
      // Groq's free tier caps output at 1000 tokens/minute (OTPM). This model can
      // silently spend hundreds of tokens on hidden chain-of-thought before ever
      // writing the JSON answer, which is what tripped a real 429 in production —
      // reasoning_effort: "none" turns that reasoning off entirely (not just hidden
      // via reasoning_format), and max_completion_tokens is a hard backstop sized
      // for the short JSON object this route actually needs.
      reasoning_effort: "none",
      max_completion_tokens: 300,
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            { type: "image_url", image_url: { url: `data:${mimeType};base64,${imageBase64}` } },
          ],
        },
      ],
    });

    const raw = completion.choices[0]?.message?.content ?? "";
    const jsonMatch = raw.match(/\{[\s\S]*\}/);

    if (!jsonMatch) {
      console.error("[/api/classify] no JSON found in model response:", raw);
      return NextResponse.json(
        { error: "The model's response couldn't be understood as a classification. Try again." },
        { status: 502 },
      );
    }

    let parsed: ClassifyResult;
    try {
      parsed = JSON.parse(jsonMatch[0]);
    } catch {
      console.error("[/api/classify] malformed JSON from model:", jsonMatch[0]);
      return NextResponse.json(
        { error: "The model's response couldn't be understood as a classification. Try again." },
        { status: 502 },
      );
    }

    if (!VALID_CATEGORIES.includes(parsed.category)) {
      parsed.category = "uncertain";
    }
    if (typeof parsed.confidence !== "number" || Number.isNaN(parsed.confidence)) {
      parsed.confidence = 0;
    }
    parsed.confidence = Math.max(0, Math.min(1, parsed.confidence));

    // Safety net if the model omits isCivicIssue or returns something unparseable:
    // only treat it as a real civic photo when the model confidently named one of
    // the three actual categories. A bare "uncertain" with no clear signal is
    // treated as NOT a civic issue, so the pipeline stops and asks rather than
    // silently drafting a complaint from an irrelevant photo.
    if (typeof parsed.isCivicIssue !== "boolean") {
      parsed.isCivicIssue = parsed.category !== "uncertain";
    }

    return NextResponse.json(parsed);
  } catch (err) {
    console.error("[/api/classify] request failed:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Classification failed. Please try again." },
      { status: 500 },
    );
  }
}
