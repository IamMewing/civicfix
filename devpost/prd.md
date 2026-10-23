---
doc: prd
status: approved
---

# CivicFix — Product Requirements

Reconstructed from `scope.md`, `spec.md`, and `checklist.md` (every slice cites a `prd.md` section; this restores the file those citations point to, written to match what was actually built — not a theoretical plan ahead of it).

## The Core Journey

One continuous flow, no account, no save-for-later:

1. **Capture** a photo of a real civic problem and optionally describe it.
2. The pipeline runs three real steps in sequence — **classify**, **research**, **draft** — each visibly resolving on screen as its own network call finishes, never a fake timed progress bar.
3. **Review** the result: category, location, description, and the drafted complaint are all editable before anything leaves the app.
4. **Hand off** to the real, correct government reporting channel, with the complaint text ready to paste in and enough guidance to actually use that specific portal.

Traced into implementation detail in `spec.md > The Core Journey Through the System`.

## Capture

- A photo is required; typed description is optional but encouraged ("helps" — not blocking).
- Location is never required to proceed — a person who declines or skips it still gets routed to CPGRAMS rather than being blocked.
- Location is confirmed through a full-screen map (the "confirm your delivery address" pattern from taxi/delivery apps): a fixed center pin the reporter pans the map under, or an address search box, rather than silently trusting a raw GPS fix — GPS accuracy indoors or under a flyover is often off by enough to put a report in the wrong ward. GPS is still the default starting point; the map is how it gets corrected when it's wrong.
- The confirmed location is reverse-geocoded to a readable place name (never raw latitude/longitude shown to the user) and matched to one of the 8 verified city slugs when possible.
- Must work from a phone browser with no install step — camera capture via `<input capture="environment">`, not a native app. The map likewise must be free and keyless (no billed mapping API), consistent with the project's no-cost constraint.

## Vision classification

- Given the photo (and description, if provided), the AI identifies which of three categories the issue is: pothole/road damage, broken streetlight, or water leak/drainage.
- Returns a confidence score, not just a label — low confidence is a real signal the rest of the pipeline has to act on (see Low-confidence classification).
- Distinguishes a genuinely ambiguous civic photo from a photo that isn't a civic issue at all (a person, a pet, a random object). The second case must not silently draft a nonsense complaint — it stops and asks the reporter to confirm a category themselves.
- Never fabricates a category it isn't looking at; "I can't tell" is an acceptable, honest output.

## Authority research

- This is the kernel of the project, not a side feature: given the classified category and the reporter's city, identify the one government authority actually responsible, and cite where that was verified.
- The cited source must be real. Never invent, guess, or hallucinate a government URL or authority name under any circumstance — a wrong or fabricated civic authority is worse than no answer at all.
- Scoped to the reporter's own city: each of the 8 deeply-verified metros (Hyderabad, Bengaluru, Mumbai, Delhi, Chennai, Kolkata, Pune, Ahmedabad) has its own real, independently-verified authority per category.
- A location outside those 8 metros (or no location at all) routes to CPGRAMS — the Government of India's real national grievance portal — rather than guessing at a local authority that was never actually verified. This must read as an honest "going wider" moment to the user, not a silent degradation.
- A low-confidence or "uncertain" classification routes to that city's own general-citizen-grievance fallback rather than a specific authority that might be wrong.
- Every verified authority entry must also leave the user able to actually use it: a working link is not sufficient on its own if the real portal turns out to be confusing (phone-OTP logins, unfamiliar government terminology, multi-step menus). Where feasible, include real step-by-step guidance for that exact portal, a confirmed helpline/alternate contact, and a genuine tutorial video — never fabricated or guessed, only included where actually found and verified.

## Complaint drafting and review

- Produces one complete, properly formatted complaint per report: category, location, description, evidence (the photo), and the cited authority.
- The reporter can edit every field before anything is finalized — category (including a full manual override that re-runs research/drafting for the corrected category), description, and the complaint text itself.
- A manually corrected category must behave like a real correction, not a cosmetic relabel: it re-triggers research and drafting so the complaint actually routes to the right authority, and any AI reasoning text that contradicted the new category must not linger on screen.

## Pipeline animation

- The three real steps (classify, research, draft) are shown as a visible, animated sequence — the single most visible "this is actually working" moment in the product.
- Each step's on-screen state change is tied to its real network call resolving, never a fixed timer standing in for real work.
- Should read as premium and alive, not a generic spinner — this is a stated identity requirement, not just a technical one (see Look and Feel).

## Low-confidence classification

- A classification the model itself isn't confident about must not be silently treated as a confident one.
- Below a confidence threshold, the reporter is given a clear way to pick the correct category themselves rather than receiving a complaint built on a guess.
- The distinction between "ambiguous but a real civic issue" and "not a civic issue at all" must be visible and handled differently — the first still auto-routes to a general fallback; the second stops and asks.

## Hand-off

- The actual proof-of-concept finish line: the reporter lands on the real official government reporting channel for the identified authority, in a new tab, with the finished complaint text available to copy.
- No fake "submitted" state, no fake live status tracking — neither is backed by a real public API for these authorities, and faking either would violate the hackathon's "must function as depicted" rule.
- The honest finish line is a correct, working hand-off to the real portal — not CivicFix (or its demo video) performing the actual government filing on the reporter's behalf.
- Where a real government portal turns out to be genuinely hard to use on first contact, Hand-off should reduce that friction with real, verified guidance (step-by-step instructions, a helpline, a real tutorial video) rather than leaving the reporter stranded on an unfamiliar site — but never at the cost of showing anything unverified.

## Look and Feel

- Approachable, friendly, reliable — with a premium, polished feel and genuinely cool animations. Explicitly not sterile-government, and explicitly not cutesy.
- Palette: warm neutral background, amber/orange as the primary "civic alert" accent, a clear green reserved for "verified source" moments, blue reserved for primary actions. Avoid cold, sterile government blues/grays as the dominant palette.
- Typography: clean, modern, confident, legible at small mobile sizes.
- Motion: the Pipeline step is the signature moment; screen-to-screen transitions should feel like one continuous flow, not separate disconnected pages.
- Copy: plain language, first person where natural, never bureaucratic jargon — the product's whole point is translating bureaucracy into something a person can actually act on.
- Mobile-first, one clear action per screen, spacious rather than cramped.
