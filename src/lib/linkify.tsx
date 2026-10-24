/**
 * Renders plain text with any URLs turned into real clickable links — used to display
 * the AI-drafted complaint, which now includes a plain Google Maps URL on its Location
 * line (see /api/draft's mapLink). The underlying copied text stays plain (it still has
 * to paste cleanly into a government portal's plain-text form field); this only affects
 * how CivicFix's own read-only displays of that text render it.
 */

import type { ReactNode } from "react";

const URL_PATTERN = /(https?:\/\/[^\s)]+)/g;

export function linkifyText(text: string): ReactNode[] {
  return text.split(URL_PATTERN).map((part, i) =>
    /^https?:\/\//.test(part) ? (
      <a
        key={i}
        href={part}
        target="_blank"
        rel="noopener noreferrer"
        className="underline decoration-dotted underline-offset-2 hover:text-signal"
      >
        {part}
      </a>
    ) : (
      <span key={i}>{part}</span>
    ),
  );
}
