/**
 * Shared Groq client setup — devpost/spec.md > Stack.
 *
 * One place that creates the Groq client and names the model, so every API route
 * (`/api/classify`, `/api/research`, `/api/draft`) imports from here instead of
 * repeating the same setup. The API key stays server-side only — this file is only
 * ever imported from route handlers, never from a "use client" component.
 */

import Groq from "groq-sdk";

let client: Groq | null = null;

export function getGroqClient(): Groq {
  if (!client) {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      throw new Error(
        "GROQ_API_KEY is not set. Add it to .env.local (see .env.example) and restart the dev server.",
      );
    }
    client = new Groq({ apiKey });
  }
  return client;
}

// Groq's one vision-capable model, confirmed during slice 1. Free tier: 30 requests/min,
// 1,000/day, 8K tokens/min, 200K tokens/day — see devpost/spec.md > External Services.
export const GROQ_MODEL = "qwen/qwen3.8-27b";
