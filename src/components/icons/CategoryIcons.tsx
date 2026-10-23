/**
 * Bespoke line icons for the three issue categories — used on the landing page's
 * category showcase. Kept as one consistent stroke style (48x48, 2.5px stroke,
 * rounded caps/joins, currentColor) rather than pulling in an icon library, so they
 * read as one hand-drawn set alongside the Archivo display type.
 */

type IconProps = { className?: string };

export function PotholeIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 48 48" fill="none" className={className} aria-hidden="true">
      <path
        d="M8 21c-.6 3 .4 6 2 9 2.4 4.3 7 7.3 12 7.9 6 .7 12-2 15-7 2.3-4 2.7-9 1-13.4-1.8-4.7-6-8.2-11-9.3-5.3-1.2-11 .5-14.6 4.6C10 15 8.5 18 8 21Z"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      <path
        d="M16 19.5 22 27l-3.5 7M31 16l-5 10 3 8.5"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function StreetlightIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 48 48" fill="none" className={className} aria-hidden="true">
      <path d="M20 42h10M24 42V21" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      <path
        d="M24 21h9a3 3 0 0 0 3-3.4C35.4 12.6 30.6 9 25 9h-2C17.4 9 12.6 12.6 12.4 17.6A3 3 0 0 0 15 21h9Z"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      <path d="M24 5v3M11 10l2 2M37 10l-2 2" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

export function WaterLeakIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 48 48" fill="none" className={className} aria-hidden="true">
      <path
        d="M24 6c6.5 8.4 11 15.5 11 21a11 11 0 1 1-22 0c0-5.5 4.5-12.6 11-21Z"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      <path d="M7 38c2.5 1.8 5 1.8 7.5 0s5-1.8 7.5 0 5 1.8 7.5 0 5-1.8 7.5 0" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}
