/**
 * Camera / Gallery line icons for CaptureStep's two photo-source buttons.
 * Matches CategoryIcons.tsx's style: 48x48 viewBox, 2.5px stroke, rounded
 * caps/joins, currentColor, stroke-only (no fill), so they read as one set.
 */

type IconProps = { className?: string };

export function CameraIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 48 48" fill="none" className={className} aria-hidden="true">
      <path
        d="M6 16a3 3 0 0 1 3-3h7l2.5-4h11l2.5 4h7a3 3 0 0 1 3 3v20a3 3 0 0 1-3 3H9a3 3 0 0 1-3-3V16Z"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      <circle cx="24" cy="26" r="7" stroke="currentColor" strokeWidth="2.5" />
      <path d="M33 18.5h3" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

export function GalleryIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 48 48" fill="none" className={className} aria-hidden="true">
      <path d="M42 15v18a4 4 0 0 1-4 4H16" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      <rect x="6" y="9" width="30" height="30" rx="4" stroke="currentColor" strokeWidth="2.5" />
      <circle cx="16" cy="18" r="3.5" stroke="currentColor" strokeWidth="2.5" />
      <path
        d="M6 32l9-9 6 6 8-10 7 9.5"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
