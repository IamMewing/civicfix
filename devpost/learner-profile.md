---
doc: learner-profile
---

# Learner Profile

## Initial Idea
**CivicFix** — a mobile-first web app. User takes a photo (and optionally a voice description) of a civic problem, starting with potholes. The AI identifies the issue, researches and cites the correct responsible authority for Hyderabad (e.g. GHMC for roads, TGSPDCL/TSSPDCL for electrical, HMWSSB for water/drainage) from verified official sources, and drafts a complete, properly formatted complaint. The app hands the user off to the real official reporting channel to file it themselves — it does not fake submission or live status tracking, since no public API exists for that and the hackathon rules require the project to function as depicted.

Core differentiator agreed on: it's a bureaucracy-navigation research agent ("I don't know who handles this" → "I researched it, here's who does, why, and where to report it"), not a chatbot that explains a photo.

## Demonstrated Technical and Agent Experience
Self-reported: "good knowledge" of coding. Did not elaborate on specific languages/frameworks or prior AI-coding-agent tooling beyond this conversation.

## Planning-Workflow Experience
New. Direct quote: "plan-first/spec driven workflow i dont know about this." Plan-first concepts should be explained as we go, not assumed.

## Desired Learning Outcome
In their words: "Understanding how to design a multi-step AI agent pipeline, and getting something working end to end."

## Learning Moments
(none yet — to be filled in during `5-build`)

## Interests, Inspirations, and Goals
Interests: video games, gym workouts, running, meditation, reading novels, sci-fi movies.

Goals and motivation: wants CivicFix to be genuinely usable by other people in Hyderabad, not just a personal tool — framed as "more of an experiment." Strong personal motivation behind the idea: they travel daily in Hyderabad and regularly encounter potholes themselves, and are aware that people have died from pothole-related accidents in the city. This is real, serious, first-hand motivation — worth carrying into the PRD's framing of why the project matters and into the demo video's opening.

## Vocabulary and Concepts Likely to Need Explanation
Plan-first / spec-driven development — explicitly unfamiliar, explain concepts plainly as they come up rather than assuming familiarity.

## Collaboration and Communication Preferences
Not established. Default: guided, one question at a time (per skill default).

## Areas Where the Learner Wants Ownership
Not established.

## Likely Support Needs
Will likely need plain-language explanations of planning/spec-driven concepts (scope vs. PRD vs. spec, why we plan before coding) as each skill introduces them.

## Review Format

html

## Notes and Open Questions
- Scope already substantially discussed before this profile was written: the "fake submission" idea was explicitly rejected in favor of an honest hand-off to the real official channel. The routing approach should be a hybrid — the agent performs a live, grounded search/cites sources (so it's genuinely researching, not a static lookup), backed by a small set of pre-verified official sources for the issue categories supported (pothole/road, streetlight, water/drainage) so the demo can't fail or hallucinate live.
- Platform decided: mobile-first responsive web app / PWA, not a native app. Browser geolocation (`navigator.geolocation`) and camera capture (`<input type="file" capture="environment">`) cover the needed device access over HTTPS with user permission — no native app required.
- Solo entrant, submission deadline Oct 26, 2026 5pm ET; current date Oct 8, 2026.
