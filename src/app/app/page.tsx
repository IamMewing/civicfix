/**
 * The tool itself, moved here from `/` so the marketing landing page can live at
 * the root URL. The PWA manifest's start_url points here directly — see
 * src/app/manifest.ts.
 */
import CaptureStep from "@/components/CaptureStep";

export default function AppPage() {
  return <CaptureStep />;
}
