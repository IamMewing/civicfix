/**
 * LocationPicker — devpost/spec.md > Components > LocationPicker
 *
 * The "confirm your delivery address" screen, borrowed from how every taxi/delivery
 * app in India already does precise location — a fixed pin in the center of the
 * screen, and the *map* pans underneath it rather than a marker you drag. Opened
 * from CaptureStep's "Share my location" button instead of silently trusting raw
 * GPS, because GPS accuracy indoors/under flyovers/in dense areas is often off by
 * enough to matter for "which ward is this pothole actually in" — the reporter gets
 * a chance to nudge the pin onto the actual spot, or search an address directly.
 *
 * Built on Leaflet + OpenStreetMap tiles — free, no API key, no billing, consistent
 * with the rest of the stack's no-cost constraint (the project already uses OSM's
 * Nominatim for reverse/forward geocoding — see /api/geocode and
 * /api/geocode/search). Deliberately never renders a Leaflet marker (which would
 * need its default icon image assets configured through the bundler); the "pin" is
 * a plain CSS-positioned SVG overlay that always sits dead center of the map
 * viewport, which is also exactly how the pan-under-a-fixed-pin pattern is supposed
 * to look.
 *
 * Leaflet touches `window` at import time, so it's dynamically imported inside
 * useEffect rather than at module scope — this component still renders (as an empty
 * shell) during SSR, and the actual map mounts client-side only once a DOM node
 * exists to attach it to.
 */

"use client";

import "leaflet/dist/leaflet.css";
import { useEffect, useRef, useState, useCallback } from "react";
import type { Map as LeafletMap } from "leaflet";
import type { PlaceSearchResult } from "@/lib/types";

interface LocationPickerProps {
  // Center the map here on open if the caller already has a rough fix (e.g. a
  // previous GPS read) — otherwise this component requests GPS itself.
  initialLocation?: { lat: number; lng: number } | null;
  onConfirm: (location: { lat: number; lng: number }) => void;
  onCancel: () => void;
}

// Hyderabad — devpost/scope.md > Who It's For: the project's home city and the
// center of its most deeply-verified coverage, so it's the most useful default
// starting point when GPS isn't available yet (denied, slow, or not asked).
const DEFAULT_CENTER: [number, number] = [17.385, 78.4867];

export default function LocationPicker({ initialLocation, onConfirm, onCancel }: LocationPickerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const addressDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [center, setCenter] = useState<{ lat: number; lng: number }>(
    initialLocation ?? { lat: DEFAULT_CENTER[0], lng: DEFAULT_CENTER[1] },
  );
  const [addressLabel, setAddressLabel] = useState<string | null>(null);
  const [addressLoading, setAddressLoading] = useState(false);
  const [locating, setLocating] = useState(!initialLocation);
  const [gpsDenied, setGpsDenied] = useState(false);

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PlaceSearchResult[]>([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);

  // Live "what's under the pin" label — debounced so panning doesn't fire a lookup
  // on every frame, only once the map settles.
  const lookupAddress = useCallback((lat: number, lng: number) => {
    if (addressDebounceRef.current) clearTimeout(addressDebounceRef.current);
    addressDebounceRef.current = setTimeout(async () => {
      setAddressLoading(true);
      try {
        const res = await fetch("/api/geocode", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ lat, lng }),
        });
        const data = await res.json();
        setAddressLabel(res.ok ? (data.placeName ?? null) : null);
      } catch {
        setAddressLabel(null);
      } finally {
        setAddressLoading(false);
      }
    }, 450);
  }, []);

  function recenter(lat: number, lng: number, zoom = 16) {
    mapRef.current?.setView([lat, lng], zoom, { animate: true });
    setCenter({ lat, lng });
    lookupAddress(lat, lng);
  }

  function requestGps() {
    if (!("geolocation" in navigator)) {
      setGpsDenied(true);
      setLocating(false);
      return;
    }
    setLocating(true);
    setGpsDenied(false);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        recenter(pos.coords.latitude, pos.coords.longitude);
        setLocating(false);
      },
      () => {
        setGpsDenied(true);
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  // Mount the Leaflet map once, client-side only.
  useEffect(() => {
    let cancelled = false;
    let map: LeafletMap | null = null;

    (async () => {
      const L = (await import("leaflet")).default;
      if (cancelled || !containerRef.current) return;

      map = L.map(containerRef.current, {
        center: [center.lat, center.lng],
        zoom: 16,
        zoomControl: false,
        attributionControl: true,
      });
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
      }).addTo(map);
      L.control.zoom({ position: "bottomright" }).addTo(map);

      map.on("moveend", () => {
        if (!map) return;
        const c = map.getCenter();
        setCenter({ lat: c.lat, lng: c.lng });
        lookupAddress(c.lat, c.lng);
      });

      mapRef.current = map;

      // No pre-existing fix handed in — ask for GPS now that the map can actually
      // show the result.
      if (!initialLocation) {
        requestGps();
      } else {
        lookupAddress(initialLocation.lat, initialLocation.lng);
      }
    })();

    return () => {
      cancelled = true;
      map?.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Debounced address search-as-you-type.
  function handleSearchChange(value: string) {
    setQuery(value);
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    if (value.trim().length < 3) {
      setResults([]);
      setSearchOpen(false);
      return;
    }
    searchDebounceRef.current = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const res = await fetch(`/api/geocode/search?q=${encodeURIComponent(value)}`);
        const data = await res.json();
        setResults(data.results ?? []);
        setSearchOpen(true);
      } catch {
        setResults([]);
      } finally {
        setSearchLoading(false);
      }
    }, 400);
  }

  function handleSelectResult(r: PlaceSearchResult) {
    recenter(r.lat, r.lng);
    setQuery(r.label);
    setSearchOpen(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-paper">
      <header className="z-10 flex items-center gap-3 border-b-2 border-line bg-paper px-4 py-3.5">
        <button
          type="button"
          onClick={onCancel}
          aria-label="Cancel"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-ink/60 transition hover:bg-ink/5"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M19 12H5M11 18l-6-6 6-6" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <div className="min-w-0 flex-1">
          <h1 className="font-display text-base font-black text-ink">Confirm your location</h1>
          <p className="truncate text-xs text-ink/50">Drag the map, or search an address below</p>
        </div>
      </header>

      <div className="relative flex-1">
        <div ref={containerRef} className="absolute inset-0" />

        {/* Fixed center pin — the map pans underneath this, the pin never moves. */}
        <div className="pointer-events-none absolute left-1/2 top-1/2 z-[400] -translate-x-1/2 -translate-y-full">
          <svg width="40" height="52" viewBox="0 0 40 52" fill="none">
            <path
              d="M20 2C10.6 2 3 9.6 3 19c0 12 17 29 17 29s17-17 17-29C37 9.6 29.4 2 20 2Z"
              fill="#c1440e"
              stroke="#fff8ec"
              strokeWidth="2"
            />
            <circle cx="20" cy="19" r="6.5" fill="#fff8ec" />
          </svg>
        </div>
        <div className="pointer-events-none absolute left-1/2 top-1/2 z-[399] h-2.5 w-2.5 -translate-x-1/2 translate-y-1 rounded-full bg-ink/25 blur-[1px]" />

        {/* Search box, floating over the map */}
        <div className="absolute left-4 right-4 top-4 z-[500]">
          <div className="relative">
            <svg
              className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink/35"
              width="17"
              height="17"
              viewBox="0 0 24 24"
              fill="none"
            >
              <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2.3" />
              <path d="m21 21-4.3-4.3" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" />
            </svg>
            <input
              type="text"
              value={query}
              onChange={(e) => handleSearchChange(e.target.value)}
              onFocus={() => results.length > 0 && setSearchOpen(true)}
              placeholder="Search for an address or area"
              className="w-full rounded-2xl border-2 border-line bg-paper py-3 pl-11 pr-4 text-sm font-medium text-ink shadow-lg shadow-ink/10 placeholder:text-ink/35 focus:border-signal focus:outline-none"
            />
          </div>
          {searchOpen && (query.trim().length >= 3) && (
            <div className="mt-2 overflow-hidden rounded-2xl border-2 border-line bg-paper shadow-lg shadow-ink/10">
              {searchLoading ? (
                <div className="px-4 py-3 text-sm text-ink/50">Searching…</div>
              ) : results.length > 0 ? (
                results.map((r, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => handleSelectResult(r)}
                    className="block w-full border-b border-line/60 px-4 py-3 text-left text-sm text-ink/80 transition last:border-b-0 hover:bg-ink/5"
                  >
                    {r.label}
                  </button>
                ))
              ) : (
                <div className="px-4 py-3 text-sm text-ink/50">No matches — try dragging the map instead.</div>
              )}
            </div>
          )}
        </div>

        {/* GPS recenter button */}
        <button
          type="button"
          onClick={requestGps}
          aria-label="Use my current location"
          className="absolute bottom-[196px] right-4 z-[500] flex h-11 w-11 items-center justify-center rounded-full border-2 border-line bg-paper shadow-lg shadow-ink/10 transition hover:bg-ink/5"
        >
          <svg width="19" height="19" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="3" stroke="#2554e8" strokeWidth="2.2" />
            <path
              d="M12 2v3M12 19v3M22 12h-3M5 12H2"
              stroke="#2554e8"
              strokeWidth="2.2"
              strokeLinecap="round"
            />
          </svg>
        </button>

        {locating && (
          <div className="absolute left-1/2 top-1/2 z-[600] -translate-x-1/2 -translate-y-[calc(100%+28px)] rounded-full bg-ink px-4 py-2 text-xs font-bold text-paper shadow-lg">
            Finding your location…
          </div>
        )}
      </div>

      <div className="z-10 border-t-2 border-line bg-paper px-4 pb-6 pt-4">
        {gpsDenied && (
          <p className="mb-3 text-xs leading-relaxed text-ink/50">
            Couldn&rsquo;t get your GPS location — search an address above or drag the map to the right spot.
          </p>
        )}
        <div className="mb-3 flex items-start gap-2.5">
          <svg className="mt-0.5 shrink-0 text-rust" width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path
              d="M12 2C7.6 2 4 5.6 4 10c0 6 8 12 8 12s8-6 8-12c0-4.4-3.6-8-8-8Z"
              stroke="currentColor"
              strokeWidth="2"
            />
            <circle cx="12" cy="10" r="2.6" stroke="currentColor" strokeWidth="2" />
          </svg>
          <p className="text-sm font-semibold leading-snug text-ink/80">
            {addressLoading ? "Finding this address…" : (addressLabel ?? `${center.lat.toFixed(5)}, ${center.lng.toFixed(5)}`)}
          </p>
        </div>
        <button
          type="button"
          onClick={() => onConfirm(center)}
          className="w-full rounded-full bg-signal px-4 py-4 text-base font-bold text-paper transition hover:-translate-y-0.5 hover:shadow-lg hover:shadow-signal/30"
        >
          Confirm this location
        </button>
      </div>
    </div>
  );
}
