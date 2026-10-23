# CivicFix

Photograph a civic problem anywhere in India — a pothole, a broken streetlight, a water leak — and CivicFix identifies the government authority actually responsible for it, with a verified source, drafts a complaint, and hands you off to the real official reporting channel to file it yourself.

Built solo for Devpost's **Build With AI: BASICS** hackathon.

## What it does

1. **Capture** — take or upload a photo of the problem, add a short description, share your location.
2. **Classify** — an AI vision call identifies the issue: pothole, streetlight, or water leak.
3. **Research** — the real unique part of this project. The AI reasons over a small, hand-verified dataset of real government authorities (`src/data/authorities.json`) — never a live guess — and identifies the correct responsible authority for your city, with a cited source. Covers 8 major Indian metros (Hyderabad, Bengaluru, Mumbai, Delhi, Chennai, Kolkata, Pune, Ahmedabad) in depth; anywhere else in India routes to CPGRAMS, the Government of India's real national grievance portal, rather than guessing.
4. **Draft** — a complete, properly formatted complaint is written from everything gathered so far.
5. **Review** — every field is editable, including a full manual category override.
6. **Hand off** — opens the real government portal in a new tab with the complaint ready to copy in, plus a numbered step-by-step walkthrough of that exact portal, a confirmed helpline, and a real tutorial video — all live-verified by actually clicking through each of the 13 real portals, not guessed from a URL.

No fake "submitted" state. CivicFix never pretends to file anything on your behalf — there's no public API for any of these government systems, and faking one would be dishonest. The honest finish line is a correct, working hand-off to the real site.

## Why

Built by someone who commutes daily in Hyderabad and has personally hit potholes — aware that pothole-related accidents have killed people in the city. Most people don't report civic problems because they don't know which of several confusing, overlapping government bodies actually handles it, or give up navigating the portal once they find it.

## Stack

- **Next.js (App Router) + React + TypeScript** — one project serves both the UI and the backend API routes.
- **Tailwind CSS** + **Framer Motion** for the visual design and the animated pipeline.
- **Groq** (`groq-sdk`, model `qwen/qwen3.8-27b`) for all three AI steps — free tier, no credit card.
- **OpenStreetMap Nominatim** for free reverse geocoding (no key required).
- No database, no login — each report is a single, self-contained session.

See `devpost/spec.md` for the full technical breakdown and `devpost/scope.md` for the product scope and boundaries.

## Running it locally

```bash
npm install
cp .env.example .env.local   # then add your own GROQ_API_KEY (console.groq.com)
npm run dev
```

Open `http://localhost:3000` on your phone (same network) or use your browser's device-emulation mode to test the mobile flow.

## Project docs

The full build process — decisions, revisions, and why — is documented in `devpost/`:

- `scope.md` — what this is and isn't
- `prd.md` — product requirements
- `spec.md` — technical spec and architecture decisions
- `checklist.md` — the real build log, slice by slice, including every pivot and fix
- `app-map.html` — a guided code tour of the finished project (open in a browser)

## License

MIT — see `LICENSE`.
