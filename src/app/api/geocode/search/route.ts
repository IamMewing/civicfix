/**
 * GET /api/geocode/search?q=...
 *
 * Forward geocoding for LocationPicker's search box — turns typed address text
 * (e.g. "Madhapur, Hyderabad" or "Connaught Place") into a short list of candidate
 * coordinates, the way the search bar in a delivery/taxi app works. Same free
 * OpenStreetMap Nominatim service as /api/geocode's reverse lookup, same reasoning
 * for running server-side (a real identifying User-Agent is required by Nominatim's
 * usage policy, and browsers won't let client code set that header), and the same
 * "always 200, degrade to an empty list" behavior — a flaky search shouldn't block
 * someone from just dragging the pin instead.
 *
 * Biased toward India (countrycodes=in) since that's the only place CivicFix's
 * authority data covers, and capped at 5 results — this is a quick disambiguation
 * list, not a full search results page.
 */

import { NextRequest, NextResponse } from "next/server";
import type { PlaceSearchResult } from "@/lib/types";

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q")?.trim();
  if (!q || q.length < 3) {
    return NextResponse.json({ results: [] as PlaceSearchResult[] });
  }

  const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&q=${encodeURIComponent(
    q,
  )}&countrycodes=in&addressdetails=0&limit=5&accept-language=en`;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const res = await fetch(url, {
      headers: {
        // Nominatim's usage policy requires a real identifying User-Agent — same
        // header as /api/geocode's reverse lookup.
        "User-Agent": "CivicFix/1.0 (India civic-reporting hackathon project)",
      },
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!res.ok) {
      return NextResponse.json({ results: [] as PlaceSearchResult[] });
    }

    const data = await res.json();
    const results: PlaceSearchResult[] = Array.isArray(data)
      ? data
          .map((item: { display_name?: string; lat?: string; lon?: string }) => {
            const lat = Number(item.lat);
            const lng = Number(item.lon);
            if (!item.display_name || Number.isNaN(lat) || Number.isNaN(lng)) return null;
            return { label: item.display_name, lat, lng };
          })
          .filter((r: PlaceSearchResult | null): r is PlaceSearchResult => r !== null)
      : [];

    return NextResponse.json({ results });
  } catch (err) {
    console.error("[/api/geocode/search] forward geocode failed:", err);
    // Degrade gracefully — the caller's search box just shows no results, and
    // dragging the pin manually still works.
    return NextResponse.json({ results: [] as PlaceSearchResult[] });
  }
}
