<!--
Draft text for the actual Devpost submission form. Copy each section into its
matching field at devpost.com when you submit. Written from the real build
log in checklist.md, not a generic template — trim anything that runs long
for the field it's going into.
-->

# Elevator pitch

CivicFix turns a photo of a pothole, broken streetlight, or water leak into a researched, correctly-routed, ready-to-file complaint — it doesn't just describe the problem, it investigates the actual bureaucracy and tells you exactly who's responsible and where to file it, backed by a real verified source every time.

# Inspiration

I commute daily in Hyderabad and have personally hit potholes on the road — and I know pothole-related accidents have killed people in this city. The problem isn't that people don't care enough to report civic issues. It's that nobody knows which of several overlapping, confusing government bodies — GHMC? the water board? the power utility? — actually handles a given problem, and even once you find the right one, the portal itself is often unclear about what to click. I wanted an AI agent that does the one thing that actually unblocks people: investigate the bureaucracy for them, with a real, verifiable answer.

# What it does

Open CivicFix on your phone, take a photo of a civic problem, add a short description, and share your location. From there:

1. **Classify** — AI vision identifies the issue: pothole, streetlight, or water leak.
2. **Research** — the real core of the project. Instead of letting an AI guess or hallucinate a government authority, it reasons over a small, hand-verified dataset built during development — every authority, every URL, independently confirmed against that authority's own official site. It's scoped to your actual city: 8 major Indian metros (Hyderabad, Bengaluru, Mumbai, Delhi, Chennai, Kolkata, Pune, Ahmedabad) each have deeply-verified local authorities; anywhere else in India honestly routes to CPGRAMS, the Government of India's real national grievance portal, instead of pretending to know a local authority that was never actually checked.
3. **Draft** — a complete, properly formatted complaint is written from everything gathered.
4. **Review** — every field is editable before anything leaves the app, including a full manual category override if the AI got it wrong.
5. **Hand off** — opens the real government portal in a new tab with the complaint ready to copy in. This is where it goes further than a link: every one of the 13 real government portals behind the 8 cities was actually clicked through, live, to produce a numbered step-by-step guide for that exact portal's own quirks (phone-OTP logins, unfamiliar field names, multi-step menus), a confirmed helpline number, and a real, relevant tutorial video — not generated or guessed, all independently verified.

No fake "submitted" state anywhere. There's no public API for any of these government systems, and faking one would be dishonest — the honest finish line is a correct, working hand-off to the real site, with everything a first-time user needs to actually use it.

# How we built it

Next.js (App Router) + React + TypeScript, one project serving both the mobile-first UI and the backend API routes so the AI key never reaches the browser. Three sequential AI calls per report (classify → research → draft) via Groq (`qwen/qwen3.8-27b`, free tier, no credit card) — chosen after the originally-planned Google Gemini stack hit a wall (see Challenges). Tailwind CSS and Framer Motion for the premium feel and the animated pipeline, which is tied to the three real network calls resolving, never a fake timer. OpenStreetMap's free Nominatim service for reverse geocoding. No database, no login — each report is a single self-contained session, which is all a proof of concept needs to prove.

The actual research behind `authorities.json` — every government authority, URL, and reporting channel — was done for real: genuine research during the build, then independently re-verified by actually clicking through all 13 real government portals live in a browser, which caught several links that "looked" fine (returned a page) but were actually broken or led somewhere unhelpful once you tried to use them for real.

# Challenges we ran into

**The AI provider changed twice before the kernel even worked.** The original plan used Google Gemini with Search grounding so the agent could research authorities live. A real test call hit a persistent `429` quota error; investigating Google's own pricing page confirmed Search grounding requires an active paid billing tier even on an otherwise-free plan — which conflicted with a hard no-credit-card constraint for this build. Dropped live grounding entirely and moved to a verified-data architecture instead: research done once, for real, during the build, with the AI reasoning over that verified data at runtime rather than searching live. Even after that fix, plain (non-grounded) Gemini calls kept hitting the same `429` on a fresh project with barely any requests made — a documented, unresolved Google-side provisioning bug, not a real rate limit. Switched the entire AI provider to Groq, which needed no credit card and had generous free-tier limits.

**Government portals that "worked" didn't actually work.** Early verification confirmed every authority's URL loaded. Real testing told a different story: BWSSB's own water-board site timed out consistently; GHMC's own FAQ page linked a typo'd URL that didn't resolve, on GHMC's own site; a Chennai authority's previously-working redirect had since gone dead. The fix was treating "returns a page" and "is actually usable" as two different claims, and re-verifying all 13 real portals by actually clicking through each one live — which is also how the step-by-step filing guidance and confirmed helplines got built.

**Finding real tutorial videos without inventing them.** Plain web search returned zero real YouTube results across more than ten queries, even with explicit site filters. Rather than fabricate a plausible-looking video link — which would have broken the project's entire "never show an unverified source" principle — the fix was navigating directly to YouTube's own search inside a live browser, which worked immediately and surfaced genuine, relevant videos for all 13 portals.

# Accomplishments that we're proud of

Never once relaxing the "never hallucinate a government source" rule, even under real pressure to do so (AI provider failures, geographic scope pressure, time constraints). A safety net in the research API cross-checks the AI's chosen authority against the actual verified dataset before anything is shown to a user — if the model ever picks something unverified, the app falls back to a known-good entry rather than ever displaying an invented one. Expanding from one city to 8 deeply-verified metros plus an honest national fallback, instead of either stopping small or faking broad coverage. And going one step further than "a working link" to actually verifying, live, that a first-time user could use each of the 13 real portals — which is the difference between a demo that looks complete and a tool that's actually usable.

# What we learned

That "the link loads" and "a person can actually use this" are different claims, and the gap between them is exactly where most civic-tech tools quietly fail their users. Also: when a tool (web search, in this case) says something doesn't exist, that's sometimes a statement about the tool's own reach, not about reality — navigating directly to the source found real tutorial videos that search couldn't surface at all.

# What's next for CivicFix

More Indian cities, each verified with the same rigor as the current 8 — the architecture is designed to extend city by city without ever letting the model guess an unverified authority. Voice input as an alternative to typing a description. An "evidence sufficiency" check that asks for more detail when a photo or description seems incomplete. And, if a billed account is ever available, live web-search grounding as a drop-in replacement for the static verified dataset — without changing anything about the user-facing promise: a real, cited, correctly-routed authority, every time.

# Built With

nextjs, react, typescript, tailwindcss, framer-motion, groq, qwen, openstreetmap, nominatim, vercel, pwa
