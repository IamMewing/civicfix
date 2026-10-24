/**
 * Shared types for the CivicFix pipeline — devpost/spec.md > Data Model.
 * One source of truth so the API routes and the UI components agree on shape.
 */

export type IssueCategory = "pothole" | "streetlight" | "water" | "uncertain";

export interface ClassifyResult {
  category: IssueCategory;
  confidence: number; // 0 to 1
  reasoning: string;
  // False when the photo isn't actually a civic/municipal issue at all (a person, a
  // pet, a random object, a document...), as opposed to a real civic issue the model
  // just couldn't pin to one of the three categories. Keeps the pipeline from
  // auto-drafting a nonsense complaint for an irrelevant photo — see CaptureStep.
  isCivicIssue: boolean;
}

export interface ClassifyRequestBody {
  imageBase64: string;
  imageMimeType: string;
  description?: string;
}

export interface AuthorityEntry {
  authorityName: string;
  officialDomain: string;
  reportingChannel: string;
  reportingChannelLabel: string;
  sourceNote: string;
  // Ordered, concrete steps for actually using reportingChannel — written from
  // live-clicking through the real portal (devpost/checklist.md Slice 11), not
  // guessed from the URL. Optional because one entry (Hyderabad/HMWSSB water)
  // predates that pass.
  filingSteps?: string[];
  // A phone/toll-free/WhatsApp number confirmed on the authority's own site — the
  // most reliable fallback when the web portal itself is slow, down, or confusing.
  helplinePhone?: string | null;
  // A real video found by navigating directly to youtube.com and picking the most
  // relevant genuine result (WebSearch could not surface these — see checklist.md
  // Slice 11). Never a guessed or fabricated URL.
  tutorialVideoUrl?: string;
  tutorialVideoLabel?: string;
  // The date this specific entry's reportingChannel was actually live-verified by
  // clicking through the real portal (not just when the file was last touched).
  // Shown directly in the hand-off UI so the "we verified this" claim is something
  // the reporter can see, not just something true behind the scenes.
  verifiedDate?: string;
}

export interface ResearchResult extends AuthorityEntry {
  usedFallback: boolean;
  // False when the report's location fell outside the specifically-verified metro
  // list (src/data/authorities.json > cities) and was routed to CPGRAMS — India's
  // national grievance portal — instead of a researched local authority. Lets the
  // UI explain *why* it's showing a general channel rather than a named city body.
  cityRecognized: boolean;
}

export interface ResearchRequestBody {
  category: IssueCategory;
  confidence?: number;
  // Normalized city slug from /api/geocode (e.g. "hyderabad", "bengaluru"), or null/
  // undefined when location is missing or outside the verified metro list — see
  // CITY_ALIASES in /api/geocode/route.ts for the matching rules.
  citySlug?: string | null;
}

export interface GeoLocation {
  lat: number;
  lng: number;
  // Human-readable area name from reverse geocoding (e.g. "Madhapur, Hyderabad"),
  // filled in after the raw coordinates come back from the browser — see
  // /api/geocode. Undefined until that resolves, or if it fails; callers fall back
  // to the raw coordinates when it's missing.
  placeName?: string;
  // Normalized city slug (e.g. "hyderabad"), or null when the geocoded city isn't
  // one of the specifically-verified metros in src/data/authorities.json.
  citySlug?: string | null;
}

export interface GeocodeRequestBody {
  lat: number;
  lng: number;
}

export interface GeocodeResult {
  placeName: string | null;
  citySlug: string | null;
}

// One candidate result from /api/geocode/search — forward geocoding (address/place
// text -> coordinates), used by LocationPicker's search box so a reporter can type
// an address instead of only dropping a pin from GPS.
export interface PlaceSearchResult {
  label: string; // full display name, e.g. "Madhapur, Hyderabad, Telangana, India"
  lat: number;
  lng: number;
}

export interface DraftRequestBody {
  category: IssueCategory;
  description: string;
  location: GeoLocation | null;
  authority: ResearchResult;
  // The classify step's own one-sentence read of the actual photo (ClassifyResult.
  // reasoning) — e.g. "stagnant water and trash, indicating a drainage/sewage issue".
  // "water" (and "pothole"/"streetlight") is a coarse bucket covering several distinct
  // real problems (a drainage leak vs. a supply shortage are both "water"); without
  // this, draft had nothing but that bucket to go on whenever the reporter's own typed
  // description got dropped for conflicting with it (see /api/draft), and would guess
  // the wrong specific problem. Optional because a manually-overridden category has no
  // real photo reasoning behind it (see CaptureStep's manual-override path).
  photoReasoning?: string;
}

export interface DraftResult {
  category: IssueCategory;
  authorityName: string;
  sourceUrl: string;
  location: string;
  description: string;
  complaintText: string;
}
