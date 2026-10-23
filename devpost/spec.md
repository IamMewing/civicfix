---
doc: spec
status: approved
---

# CivicFix — Technical Spec

## How This Works, In Plain Language

CivicFix is a website you open on your phone's browser — no app install, no login. You take or upload a photo of a civic problem. That photo, plus whatever you typed and your location, gets sent to the site's own backend (a few small server functions that live in the same project as the website). The backend calls Groq's AI three times in a row: once to look at the photo and say what kind of problem it is, once to reason over a small file of real, pre-verified official sources (which authority handles which kind of problem, and why) and pick the right one, and once to turn all of that into a properly written complaint. Each of those three calls happens for real, one after another, and the screen's pipeline animation is tied directly to them finishing — it's not a fake loading bar. You then see the finished complaint, can edit anything that looks wrong, and tap a button that opens the real government website so you can file it yourself.

Nothing is saved anywhere — no database, no account. Each visit is its own self-contained report. The "research" the agent does isn't a live web search at the moment you use it — it's real research done once, carefully, during the build, verified against each authority's actual official site, and stored in a small file the AI reasons over every time you use the app. (Google's own live-search tool for Gemini turned out to require a paid billing account even on an otherwise free-tier plan, and separately Gemini's free tier hit a persistent, unresolved quota bug on this project — see the Decisions section below for the full story on both, and why the provider is now Groq.)

## The Core Journey Through the System

Traces `prd.md > The Core Journey`:

1. User opens the site on their phone → `src/app/page.tsx` renders the **Capture** step.
2. They take/upload a photo, optionally type a description, and the browser asks for location permission (`navigator.geolocation`). All of this stays in the browser as React state — nothing is sent yet.
3. User taps "Analyze" → the UI switches to the **Pipeline** step (`PipelineAnimation` component) and three calls fire in sequence:
   - `POST /api/classify` — sends the photo → the model identifies the issue category and a confidence score.
   - `POST /api/research` — sends the category → the model reasons over the verified data in `src/data/authorities.json` (passed directly in the prompt) and returns the matching authority, its verified source, and whether the low-confidence fallback was used.
   - `POST /api/draft` — sends everything gathered so far → the model writes the complaint text.
   Each step's icon on screen updates to "done" the moment its real network call resolves.
4. The result lands in the **Review** step: every field (category, location, description, authority, filer name/contact) is shown in editable inputs, pre-filled from what the pipeline produced.
5. User taps "Open Official Reporting Channel" → the **Hand-off** step opens the real government portal URL in a new tab and shows the finished complaint text in a copy-friendly block, so the user can paste it into the official form and submit it themselves.
6. Nothing is written back to CivicFix — refreshing the page starts a new, empty report.

## Stack

- **Next.js 14 (App Router) + React + TypeScript** — [nextjs.org/docs](https://nextjs.org/docs). One project serves both the phone-facing pages and the backend API routes, so the AI API key never reaches the browser. Chosen because it avoids standing up and hosting a separate backend for a solo 18-day build.
- **Tailwind CSS** — [tailwindcss.com/docs](https://tailwindcss.com/docs) for styling. Fast to build a polished, animated mobile UI without writing a design system from scratch.
- **Framer Motion** — [motion.dev](https://motion.dev) for the pipeline animation and screen transitions. Chosen specifically because "cool animations, premium feel" was a stated requirement.
- **Groq** via the Groq API (`groq-sdk`, model `qwen/qwen3.8-27b`) — [console.groq.com/docs](https://console.groq.com/docs). Free tier, no credit card. Used for all three AI steps (classify, research-by-reasoning, draft) so there's only one external AI provider to manage.
  - **Resolved during slice 1 (was flagged as unverified):** the originally planned `gemini-2.5-flash` returned a real `404` — Gemini confirmed via live test call that it's no longer available to new users, and pointed directly to `gemini-3.8-flash`. Swapped in response to real evidence.
  - **Resolved during slice 1 (consequential change):** Google Search grounding was the original plan for the research step, but a real test call returned a persistent `429` quota error. Investigation of Google's own pricing page confirmed grounding requires an active paid billing tier on `gemini-3.8-flash` — not available free, even though the first 5,000 requests/month would then be free. This conflicted with the learner's no-cost constraint, so **grounding was dropped from the architecture.** See "No live grounding" below and `checklist.md > Revisions`.
  - **Resolved during slice 1 (provider change):** even without grounding, plain vision and reasoning calls to `gemini-3.8-flash` kept returning a persistent `429 quota exceeded` on a fresh project with very few total requests — a documented, unresolved Google-side provisioning bug, not a real rate limit and not fixable from our side. AWS and Google Cloud Run were both considered and ruled out (each requires a card at account signup regardless of which specific service is used, so neither solves the no-cost constraint). **Switched the entire AI provider to Groq**, which needs no credit card and has generous free-tier limits (30 requests/min, 1,000/day for the model used here). See `checklist.md > Revisions`.
- **No live Google Search grounding.** Authority research is done once, for real, during the build (genuine web research, verified against each authority's actual site) and stored in `src/data/authorities.json`. At runtime, the model reasons over this verified data rather than searching the live web. No billing account needed anywhere in the stack.
- **No database.** Each report is a single, self-contained session — captured, processed, reviewed, handed off, done. Nothing needs to persist between visits.
- **No login system.**
- **Leaflet + OpenStreetMap raster tiles** — [leafletjs.com](https://leafletjs.com) for `LocationPicker`, the full-screen map-based location confirmation screen (added after launch — see `checklist.md`). Free, no API key, no billing, same OSM ecosystem the app already uses for Nominatim geocoding — chosen specifically to avoid introducing a billed mapping provider (Google Maps, Mapbox) that would break the no-cost constraint.
- **Deploy to Vercel** (free, close to zero-config) in addition to running locally, once the app works locally.

## Where It Runs and How Someone Tries It

- **Runtime:** Node.js (v20+) locally during development; the same Next.js app can later deploy to Vercel.
- **Environment:** one environment variable, `GROQ_API_KEY`, set in a local `.env.local` file (never committed — see `.gitignore`). `.env.example` in the repo shows the variable name without a real value.
- **Start command (local):** `npm install`, then `npm run dev`, then open `http://localhost:3000` on a phone on the same network (or use the browser's device-emulation mode) to test the mobile flow.
- **Testing locally:** the learner runs and tests this using Antigravity on their own computer.
- **Demo recording:** record the phone-sized browser window walking through Capture → Pipeline → Review → Hand-off, ending with the real government portal opening.
- **Deployment (after it works locally):** deploy to Vercel — [vercel.com/docs](https://vercel.com/docs). Push the project to GitHub, import it in Vercel, add `GROQ_API_KEY` as a Vercel environment variable, deploy.

## Look and Feel

Approachable, friendly, and reliable, with a premium feel and genuinely cool animations:

- **Palette:** warm neutral background, amber/orange as the primary "civic alert" accent, a clear green for "verified source" moments, blue reserved for primary action buttons. Avoid cold, sterile government-site blues/grays as the dominant palette.
- **Typography:** clean, modern sans-serif (system font stack — fast, no extra load time), confident and legible at small mobile sizes.
- **Motion:** the Pipeline step is the signature moment — each of the three agent steps animates in with a distinct, satisfying transition as its real network call resolves. Screen-to-screen transitions should feel like one continuous flow.
- **Tone of copy:** plain language, first person where natural ("I found the authority that handles this"), never bureaucratic jargon.
- **Density:** spacious, mobile-first, one clear action per screen.

## Components

### `CaptureStep`
Photo capture/upload, description textarea, location permission request. Holds local form state until the user taps "Analyze."
PRD ref: `prd.md > Capture`.

### `PipelineAnimation`
Fires the three sequential API calls and animates each step's state (pending → in progress → done/error) as its real `fetch` resolves. Passes the accumulated result forward once all three succeed.
PRD ref: `prd.md > Pipeline animation`.

### `ReviewStep`
Renders the draft complaint as editable fields (category, location, description, authority name, cited source, filer name/contact). Category defaults to the AI's pick, or is left blank if confidence was low.
PRD ref: `prd.md > Complaint drafting and review`.

### `HandoffStep`
Shows the finished complaint text in a copyable block and a button that opens the authority's real reporting URL — the city's own verified authority, that city's general fallback, or CPGRAMS (India's national grievance portal) when the location isn't one of the verified metros — in a new tab.
PRD ref: `prd.md > Hand-off`.

### `/api/classify` (route handler)
Receives a base64 image. Calls Groq (`qwen/qwen3.8-27b`) with the image and a prompt constrained to the three supported categories (pothole/road damage, streetlight, water/drainage) plus "uncertain." Returns `{ category, confidence }`.
PRD ref: `prd.md > Vision classification`.

### `/api/geocode` (route handler)
Receives `{ lat, lng }`. Reverse-geocodes via OpenStreetMap's free Nominatim service (no API key/billing) into a human-readable place name, and separately resolves a normalized `citySlug` (e.g. `"hyderabad"`) by matching Nominatim's city/town field against `CITY_ALIASES` — the 8 metros verified in `authorities.json`, or `null` if the location is elsewhere. Returns `{ placeName, citySlug }`, both nullable; never a hard failure — the UI falls back to raw coordinates and routes to the national fallback.
PRD ref: `prd.md > Location`.

### `/api/research` (route handler)
Receives `{ category, confidence, citySlug }`. When `citySlug` matches one of the 8 verified metros, passes that city's slice of `src/data/authorities.json` into the prompt and asks Groq to identify the matching authority and cite its verified source — using that city's own `general_fallback` entry when confidence was low or the category is "uncertain." When `citySlug` doesn't match (unrecognized city, or no location) it returns the `national_fallback` entry — CPGRAMS, India's real nationwide grievance portal — directly, with no model call, since there's no city-specific data to reason over. Returns `{ authorityName, officialDomain, reportingChannel, reportingChannelLabel, sourceNote, usedFallback, cityRecognized }`.
PRD ref: `prd.md > Authority research`.

### `/api/draft` (route handler)
Receives everything gathered so far (category, authority, location, description). Calls Groq to write the complaint text in the correct structure. Returns the draft complaint fields.
PRD ref: `prd.md > Complaint drafting and review`.

### `src/data/authorities.json`
Real, verified official sources for the 3 supported categories, nested by city under `cities.<slug>` for 8 Indian metros (Hyderabad, Bengaluru, Mumbai, Delhi, Chennai, Kolkata, Pune, Ahmedabad), each with its own `general_fallback`, plus a top-level `national_fallback` (CPGRAMS) used when the location isn't one of those 8. Populated with real research during slice 1 (Hyderabad) and slice 10 (the other 7 metros + CPGRAMS) — not fabricated placeholders. Each entry's `officialDomain` is a stable fallback if a deep link changes; a few metros' entries point to `officialDomain` directly as `reportingChannel` because a more specific complaint sub-page couldn't be confidently confirmed (see `checklist.md > Revisions`).

## Data Model

No database. All state is in-memory React state on a single page, shaped roughly as:

```ts
type Category = "pothole" | "streetlight" | "water" | "uncertain";

type ReportState = {
  step: "capture" | "pipeline" | "review" | "handoff";
  photo: { dataUrl: string; file: File } | null;
  description: string;
  location: { lat: number; lng: number } | null; // null if permission denied
  classification: { category: Category; confidence: number } | null;
  authority: { name: string; sourceUrl: string; sourceNote: string; usedFallback: boolean } | null;
  draft: {
    category: Category;
    locationText: string;
    description: string;
    authorityName: string;
    sourceUrl: string;
    filerName: string;
    filerContact: string;
  } | null;
};
```

- **Where it lives:** React `useState` in `src/app/page.tsx`, passed down to each step component.
- **How it's updated:** each step's completion updates the relevant slice and advances `step`.
- **What happens on leave/return:** nothing persists — reloading the page resets to a fresh `capture` state.

## File Structure

```
civicfix/
├── devpost/                     # Devpost Learn planning docs (scope, prd, spec + html companions)
├── public/
│   └── icons/                   # app icons (manifest, favicon)
├── src/
│   ├── app/
│   │   ├── page.tsx              # single-flow app shell: holds ReportState, renders the active step
│   │   ├── layout.tsx            # root layout, fonts, metadata
│   │   ├── globals.css           # Tailwind base + custom CSS variables for the palette
│   │   └── api/
│   │       ├── classify/route.ts # POST — photo → category + confidence
│   │       ├── geocode/route.ts  # POST — lat/lng → place name + normalized city slug (Nominatim)
│   │       ├── research/route.ts # POST — category + city slug → authority + source (or CPGRAMS)
│   │       └── draft/route.ts    # POST — gathered data → drafted complaint text
│   ├── components/
│   │   ├── CaptureStep.tsx
│   │   ├── PipelineAnimation.tsx
│   │   ├── ReviewStep.tsx
│   │   └── HandoffStep.tsx
│   ├── lib/
│   │   ├── groq.ts                # Groq client setup, shared call helpers
│   │   └── types.ts               # ReportState and related shared types
│   └── data/
│       └── authorities.json       # real, verified authority sources for 8 metros + CPGRAMS national fallback
├── scripts/
│   └── test-groq.ts               # slice 1 standalone verification script
├── .env.example                   # GROQ_API_KEY=
├── .gitignore
├── next.config.js
├── package.json
├── tailwind.config.ts
└── README.md
```

## External Services and Dependencies

### Groq API (model: `qwen/qwen3.8-27b`)
- Docs: [console.groq.com/docs](https://console.groq.com/docs)
- Auth: API key from the Groq console, set as `GROQ_API_KEY`, used server-side only. No credit card required for the free tier.
- Calls needed: (1) an OpenAI-compatible `chat.completions.create` call with an `image_url` (base64 data URL) content part + text prompt, for classification; (2) a plain text chat-completions call with `authorities.json`'s contents embedded in the prompt, for authority reasoning — **no live search tool, no billing account needed**; (3) plain text chat-completions call, for drafting.
- Free-tier limits for this model: 30 requests/min, 1,000 requests/day, 8K tokens/min, 200K tokens/day — comfortably enough for building and demoing.
- Cost: $0. No billing account linked anywhere in this stack.

### Vercel (optional deploy target)
- Docs: [vercel.com/docs](https://vercel.com/docs)
- Free tier sufficient for this project's traffic. Requires the GitHub repo to be pushed first.

## Important Failure Modes

- **A Groq call is slow or fails** → the Pipeline step shows a plain "that step is taking longer than expected" message with a retry button, instead of hanging silently.
- **Low-confidence or failed classification** → the Review step's category field is left blank for the user to pick themselves, instead of showing a wrong or fake-confident answer.
- **Classification is "uncertain" or doesn't match a known category** → the research step uses the recognized city's `general_fallback` entry from `authorities.json`, clearly labeled on screen as a general fallback rather than a confident match.
- **Location isn't one of the 8 verified metros, or permission was denied** → the flow continues; research routes to CPGRAMS (the national fallback), clearly labeled as nationwide rather than a named local authority, and the draft complaint notes "location not provided" when there's no location at all instead of blocking the user.

## What Was Simplified and Why

- **No database** instead of persisted complaint history — the POC only needs to prove one report, end to end, for the demo.
- **No authentication** instead of real accounts — not needed to prove the kernel, and would add real build time for zero demo value.
- **Reasoning over a verified `authorities.json` file** instead of live Google Search grounding — the live grounding tool required a paid billing account (confirmed against Google's own pricing page during slice 1), which conflicted with the project's zero-cost constraint. The research is still real (genuine web research, done once during the build and verified against each authority's actual site) — only *when* it happens moved from "live, per-request" to "once, during the build." This is a direct application of the "Paid or rate-limited API on the critical path" simplification pattern: seeded, verified real data with the live call avoided entirely rather than built behind a flag, since no billing account exists to flag toward.
- **Copy-paste hand-off to the real government portal** instead of automated submission — no public API exists, so building a fake "submitted" state would misrepresent what the project actually does.

## Decisions and Open Issues

- **Stack (Next.js + Groq, no DB, no auth)** — recommended by the agent given the learner's budget constraint (no existing API credits) and the complexity budget for a solo 18-day build; accepted by the learner.
- **Google Gemini over Anthropic's API, initially** — chosen specifically because it has a confirmed free tier with no credit card; this directly resolved the credit/budget blocker the learner raised. Later replaced by Groq (see below) after Gemini's free tier proved unworkable on this project.
- **Model swapped from `gemini-2.5-flash` to `gemini-3.8-flash`** — resolved during slice 1 via a real test call (`404`, deprecated for new keys). Not a learner decision; a mechanical correction based on evidence. (Superseded by the full provider switch to Groq below.)
- **Google Search grounding dropped; `authorities.json` promoted to primary source** — this is a genuine, consequential uncertainty from planning that the build actually hit (the flagged "verify free-tier limits early" item). Resolved during slice 1: a real grounding call returned a persistent `429`, and Google's own pricing page confirmed grounding needs a paid billing tier. Because this touches `scope.md > The Unique Kernel` (how the research step actually works), it was brought to the learner directly rather than silently patched. The learner chose to avoid linking any billing account and keep the project at zero cost, in favor of real-but-build-time-verified research reasoned over at runtime. See `scope.md > The Unique Kernel` and `checklist.md > Revisions` for the full history.
- **AI provider switched from Gemini to Groq** — even without grounding, plain Gemini vision and reasoning calls kept returning a persistent `429 quota exceeded` on a fresh project with very few total requests — a documented, unresolved Google-side account/project provisioning bug, not a real rate limit and not fixable from our side or by waiting. The learner asked whether AWS or Google Cloud Run could help; both were ruled out because each requires a card at account signup regardless of which specific service is used, so neither solves the no-cost constraint. The learner then confirmed Groq as the better fit: no credit card for its free tier, and more generous limits. Switched the SDK (`@google/genai` → `groq-sdk`) and the model (`gemini-3.8-flash` → `qwen/qwen3.8-27b`); the pipeline design (classify → research → draft, reasoning over `authorities.json`) is unchanged. See `checklist.md > Revisions`.
- **Deploy to Vercel after local testing succeeds** — learner's choice: test locally first with Antigravity, deploy once working.
- **Look and feel: approachable/friendly/reliable with premium animation** — learner's explicit direction.
- **Resolved:** the open question about Gemini's free-tier rate limits is moot now that the provider is Groq. Groq's published free-tier limits for `qwen/qwen3.8-27b` (30 RPM / 1,000 RPD / 8K TPM / 200K TPD) are generous enough that rate limits aren't expected to be a concern through the rest of the build or the demo.
