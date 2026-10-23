/**
 * Slice 1 verification script — devpost/checklist.md
 *
 * Proves two things the rest of the build depends on:
 *   1. The Groq API key + SDK work for a real vision call (sending a photo, getting a real answer back).
 *   2. Groq can reason over our verified `authorities.json` data and produce a correctly
 *      cited authority recommendation.
 *
 * This replaces the earlier `test-gemini.ts`. The provider changed from Google Gemini to Groq
 * because Gemini's free tier hit a persistent, unresolved `429 quota exceeded` error on this
 * project (a known, documented Google-side provisioning bug — not something our code or
 * waiting could fix). Groq's free tier needs no credit card and has far more generous limits.
 * See devpost/checklist.md > Revisions for the full reasoning.
 *
 * This is NOT the app — it's a standalone script to settle the open uncertainty before any
 * UI gets built on top of assumptions about the API.
 *
 * Run with:  npm run test:groq
 * (needs GROQ_API_KEY set in .env.local — see devpost/spec.md > Where It Runs)
 */

import Groq from "groq-sdk";
import * as dotenv from "dotenv";
import { readFileSync } from "fs";
import { deflateSync } from "zlib";

dotenv.config({ path: ".env.local" });

// --- Build a real, guaranteed-valid PNG at runtime (no hand-typed base64 to get wrong) ---

function crc32(buf: Buffer): number {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc ^= buf[i];
    for (let j = 0; j < 8; j++) {
      crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function pngChunk(type: string, data: Buffer): Buffer {
  const typeBuf = Buffer.from(type, "ascii");
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([length, typeBuf, data, crcBuf]);
}

function makeTestPng(width: number, height: number): Buffer {
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8;
  ihdrData[9] = 2;
  ihdrData[10] = 0;
  ihdrData[11] = 0;
  ihdrData[12] = 0;
  const ihdr = pngChunk("IHDR", ihdrData);

  const rowSize = 1 + width * 3;
  const raw = Buffer.alloc(rowSize * height);
  for (let y = 0; y < height; y++) {
    const rowStart = y * rowSize;
    raw[rowStart] = 0;
    for (let x = 0; x < width; x++) {
      const px = rowStart + 1 + x * 3;
      raw[px] = 194;
      raw[px + 1] = 65;
      raw[px + 2] = 12;
    }
  }
  const idat = pngChunk("IDAT", deflateSync(raw));
  const iend = pngChunk("IEND", Buffer.alloc(0));

  return Buffer.concat([signature, ihdr, idat, iend]);
}

// Groq's vision model requires at least 32x32 pixels per image, so this is 64x64 to be safely clear of that floor.
const TEST_IMAGE_BASE64 = makeTestPng(64, 64).toString("base64");

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Groq's one vision-capable model as of this build. Free tier (Developer plan base limits,
// no credit card required): 30 requests/min, 1,000 requests/day, 8K tokens/min, 200K tokens/day.
const VISION_MODEL = "qwen/qwen3.8-27b";

async function main() {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    console.error(
      "❌ GROQ_API_KEY is not set. Copy .env.example to .env.local and add your free key from https://console.groq.com/keys",
    );
    process.exit(1);
  }

  const client = new Groq({ apiKey });

  console.log(`Using model: ${VISION_MODEL}\n`);

  // --- Test 1: vision call ---
  console.log("--- Test 1: Vision (sending a real, generated test image) ---");
  try {
    const visionResult = await client.chat.completions.create({
      model: VISION_MODEL,
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: "In one short sentence, what color is this image?" },
            {
              type: "image_url",
              image_url: { url: `data:image/png;base64,${TEST_IMAGE_BASE64}` },
            },
          ],
        },
      ],
    });
    console.log("✅ Vision call succeeded. Response:");
    console.log(visionResult.choices[0].message.content);
  } catch (err) {
    console.error("❌ Vision call failed:", err instanceof Error ? err.message : err);
  }

  console.log("\nWaiting 5 seconds before the second call...");
  await sleep(5000);

  // --- Test 2: reasoning over our verified authorities.json ---
  console.log("\n--- Test 2: Reasoning over verified authorities.json ---");
  try {
    const authoritiesData = JSON.parse(readFileSync("src/data/authorities.json", "utf-8"));
    const hyderabadAuthorities = authoritiesData.cities.hyderabad;
    const prompt = `You are a civic complaint assistant for Hyderabad, India. A resident reported: "There's a large, dangerous pothole on my street that cars keep swerving around."

Here is verified data about which Hyderabad authority handles which issue type:
${JSON.stringify(hyderabadAuthorities, null, 2)}

Based ONLY on this verified data, identify which category this report falls under and name the correct responsible authority. Cite the reportingChannel URL from the data. Answer in 2-3 sentences.`;

    const reasoningResult = await client.chat.completions.create({
      model: VISION_MODEL,
      messages: [{ role: "user", content: prompt }],
    });
    console.log("✅ Reasoning call succeeded. Response:");
    console.log(reasoningResult.choices[0].message.content);
  } catch (err) {
    console.error("❌ Reasoning call failed:", err instanceof Error ? err.message : err);
  }

  console.log(
    "\nIf both tests printed real, sensible answers above (not errors), slice 1 is verified — the rest of the pipeline can be built on this.",
  );
}

main();
