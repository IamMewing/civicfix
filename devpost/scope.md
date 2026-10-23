---
doc: scope
status: approved
---

# CivicFix

An AI agent that turns a photo of a real civic problem into a researched, correctly-routed, ready-to-file complaint for the right Indian authority.

## The Unique Kernel
It doesn't explain or summarize a problem — it investigates the actual bureaucracy. Given a photo of a pothole, broken streetlight, or water leak, it identifies which specific authority is responsible and produces a complaint that's actually ready to file, citing the verified official source for that authority. The shift it delivers: "I don't know who handles this" → "I researched it — here's who does, why, and where to file it." Delete the research-and-routing step and this is just a form generator; that step is the whole point.

*(Revised during the build: the authority research is backed by real, verified sources gathered through genuine research — not fabricated or guessed — and reasoned over by the AI at runtime. It is not fetched live from the web on each request, because Google's Search grounding tool turned out to require a paid billing account, which conflicts with this project's no-cost constraint. See `checklist.md > Revisions` for the full reasoning. The kernel's promise — "it researches the bureaucracy and cites a real source" — is unchanged; only when that research happens moved from "live, per-request" to "once, verified, during the build.")*

*(Revised again: scope expanded from Hyderabad-only to eight major Indian metros with deeply-verified local authorities, plus CPGRAMS — the Government of India's real national grievance portal — as the honest fallback for every other Indian location. See `checklist.md > Revisions` for the reasoning and why this doesn't weaken the "never guess a government URL" promise.)*

## Who It's For
The learner themselves, and people like them: Hyderabad residents who commute daily and regularly encounter civic hazards — potholes especially. They've personally hit potholes while traveling and are aware that pothole-related accidents in the city have killed people. Today, most people in this position either don't report problems at all (because they don't know whether GHMC, TGSPDCL/TSSPDCL, or HMWSSB handles it) or give up navigating multiple confusing government portals.

## The Core Loop
Open CivicFix on a phone browser → take a photo of a civic problem (or upload one) → add a short typed description → the app uses the phone's location → the agent classifies the issue, identifies the correct authority for the reporter's city with its verified source (or routes to CPGRAMS, India's national grievance portal, if the city isn't one of the specifically-verified metros), and drafts a complete, properly formatted complaint (issue, location, description, evidence, category, authority, sources) → user reviews it → taps through to the real official reporting channel for that authority and files it for real. They come back to it each time they spot a new problem worth reporting.

## Inspiration & Identity
Approachable, friendly, and reliable — with a premium, polished feel and genuinely cool animations (not sterile-government, not cutesy). See `prd.md > Look and Feel` and `spec.md > Look and Feel` for the full direction.

## Why This Matters to the Learner
In their words: they travel daily and have fallen into potholes themselves, and are aware that people have died falling into potholes in Hyderabad. This is personal safety and civic frustration, not an abstract prompt.

## What "Working" Looks Like
Open CivicFix on a phone → take a real photo of a civic problem → add a short description → within moments: the issue is identified (e.g. "Road pothole — severe"), the correct responsible authority for the reporter's city is named with its verified official source cited (e.g. GHMC for Hyderabad, BBMP for Bengaluru — or CPGRAMS, India's national grievance portal, for anywhere outside the 8 deeply-verified metros), and a complete complaint is drafted (location, description, evidence, category). Tap "Open Official Reporting Channel" → land on the real, correct government portal, with the drafted complaint ready to copy in, a numbered step-by-step walkthrough of that exact portal's own flow, a confirmed helpline number, and a real tutorial video — everything a first-time user needs to actually file it themselves. The "oh, that's cool" beat: watching the agent go from "I don't know who handles this" to a correctly-sourced, ready-to-file complaint in seconds, landing on the real site loading correctly. The demo video ends there, at the real portal opening — not with a complaint actually submitted on camera; that's a deliberate choice (see Revisions), since the app's honest finish line is a correct, working hand-off, not CivicFix (or the demo) filing complaints on the reporter's behalf.

## The POC Boundary
- Eight major Indian metros with deeply-verified local authorities: Hyderabad, Bengaluru, Mumbai, Delhi, Chennai, Kolkata, Pune, Ahmedabad. Any other Indian location routes to CPGRAMS — the Government of India's real national grievance portal — rather than guessing a local authority that hasn't been verified. (Revised from Hyderabad-only — see Revisions.)
- Three issue categories: potholes/road damage, broken streetlights, water leakage/drainage.
- Photo capture/upload required. Typed text description as the reliable input method.
- Browser geolocation (`navigator.geolocation`) for location, reverse-geocoded to a place name and a normalized city match; no native app.
- AI classifies the issue from the photo.
- Authority identification is backed by real, verified official sources gathered during the build (not a silent, unverified guess) — the AI reasons over this verified data at runtime and cites it, scoped to the reporter's own city. (Revised from live web search — see Revisions.)
- Produces one complete, properly formatted complaint per report.
- Hands off to the real official reporting channel (link / deep link). No fake in-app submission, no fake live status tracking — neither exists via public API, and faking either would violate the "must function as depicted" rule.
- Mobile-first responsive web app (PWA).

## Later
- More Indian cities, each deeply verified the same way as the current eight — the research/routing architecture is *designed to extend*, but only these eight have real, confirmed local authority data for the hackathon submission.
- Voice input via the browser's built-in speech recognition, as a polish layer once the typed-text core loop works end-to-end.
- An "evidence sufficiency" step where the agent flags if a photo/description seems incomplete and asks for more — valuable, but judgment-heavy and deferred past the core loop.
- A personal history/local tracker of problems the user has reported.
- Live web search grounding, if the learner later links a billed Google Cloud account — the architecture (verified-data-driven reasoning) can be swapped for live grounding without changing the user-facing behavior.

## Explicitly Cut
- **Automated submission to government systems via API.** No public API exists for GHMC/TGSPDCL/TSSPDCL/HMWSSB; faking a "submitted" state would be dishonest and risks violating the hackathon's functionality rule.
- **Live tracking of government response/resolution status.** Same reason — no public API to back it.
- **Citing specific municipal code or legal sections.** Real hallucination risk if the AI invents a code section. Replaced with "official reporting process + cited source" instead, which is defensible.
- **Native Android/iOS app.** Unneeded — browser geolocation and camera capture (`<input type="file" capture="environment">`) cover everything over HTTPS with user permission, and a PWA ships far faster solo.
- **Live Google Search grounding for authority research.** Confirmed during the build to require a paid Google Cloud billing account even within an otherwise-free-tier usage pattern — conflicts with the project's no-cost constraint. Replaced with AI reasoning over real, pre-verified sources (see Revisions in `checklist.md`).
