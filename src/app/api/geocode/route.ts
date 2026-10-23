/**
 * POST /api/geocode
 *
 * Reverse-geocodes the browser's raw lat/lng into a human-readable area name (e.g.
 * "Madhapur, Hyderabad") instead of showing coordinates everywhere in the UI and
 * the drafted complaint. Uses OpenStreetMap's free Nominatim service — no API key,
 * no billing, consistent with the project's no-cost constraint (see
 * devpost/checklist.md > Revisions). A required, identifying User-Agent header is
 * sent per Nominatim's usage policy; browsers won't let client code set that header
 * on its own fetch, which is also why this runs server-side rather than straight
 * from CaptureStep.
 *
 * Also resolves a normalized `citySlug` (e.g. "hyderabad", "bengaluru") so
 * /api/research can pick the right city's verified authority data out of
 * src/data/authorities.json. CITY_ALIASES below maps the various ways Nominatim
 * (and everyday speech) spell each of CivicFix's specifically-verified metros onto
 * one slug each. A city outside that list — anywhere else in India, or the world —
 * resolves to citySlug: null, which /api/research treats as "route to CPGRAMS, the
 * national fallback" rather than silently guessing a local authority.
 *
 * Never a hard failure for the caller: if Nominatim is slow, down, or returns
 * nothing usable, this responds 200 with nulls and the UI falls back to showing raw
 * coordinates — location is a nice-to-have label, not something that should block
 * reporting a problem.
 */

import { NextRequest, NextResponse } from "next/server";
import type { GeocodeRequestBody, GeocodeResult } from "@/lib/types";

// Keys are lowercased Nominatim city/town names (and common everyday spellings);
// values are the city slugs used as keys under authorities.json > cities.
const CITY_ALIASES: Record<string, string> = {
  hyderabad: "hyderabad",
  secunderabad: "hyderabad",

  bengaluru: "bengaluru",
  bangalore: "bengaluru",

  mumbai: "mumbai",
  "greater mumbai": "mumbai",
  bombay: "mumbai",

  delhi: "delhi",
  "new delhi": "delhi",
  "nct of delhi": "delhi",

  chennai: "chennai",
  madras: "chennai",

  kolkata: "kolkata",
  calcutta: "kolkata",

  pune: "pune",
  poona: "pune",

  ahmedabad: "ahmedabad",
  amdavad: "ahmedabad",
};

function resolveCitySlug(addr: Record<string, string | undefined>): string | null {
  const candidates = [addr.city, addr.town, addr.municipality, addr.state_district, addr.county];
  for (const candidate of candidates) {
    if (!candidate) continue;
    const slug = CITY_ALIASES[candidate.trim().toLowerCase()];
    if (slug) return slug;
  }
  return null;
}

export async function POST(request: NextRequest) {
  let body: GeocodeRequestBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  const { lat, lng } = body;
  if (typeof lat !== "number" || typeof lng !== "number" || Number.isNaN(lat) || Number.isNaN(lng)) {
    return NextResponse.json({ error: "A numeric lat and lng are required." }, { status: 400 });
  }

  const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&zoom=16&addressdetails=1&accept-language=en`;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const res = await fetch(url, {
      headers: {
        // Nominatim's usage policy requires a real identifying User-Agent.
        "User-Agent": "CivicFix/1.0 (India civic-reporting hackathon project)",
      },
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!res.ok) {
      return NextResponse.json({ placeName: null, citySlug: null } satisfies GeocodeResult);
    }

    const data = await res.json();
    const addr = data?.address ?? {};

    // Most specific usable name first; fall back toward broader area names.
    const place: string | undefined =
      addr.suburb || addr.neighbourhood || addr.quarter || addr.residential || addr.city_district || addr.town || addr.village;

    const city: string | undefined = addr.city || addr.town || addr.state_district;

    const placeName = place && city ? `${place}, ${city}` : place || city || null;
    const citySlug = resolveCitySlug(addr);

    return NextResponse.json({ placeName, citySlug } satisfies GeocodeResult);
  } catch (err) {
    console.error("[/api/geocode] reverse geocode failed:", err);
    // Degrade gracefully — the caller falls back to raw coordinates.
    return NextResponse.json({ placeName: null, citySlug: null } satisfies GeocodeResult);
  }
}
