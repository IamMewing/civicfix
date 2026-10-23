/**
 * LandingPage — the marketing front door at `/`. devpost/scope.md > Inspiration &
 * Identity calls for "approachable, friendly, and reliable — with a premium,
 * polished feel and genuinely cool animations." This page is the bold, confident
 * introduction to that; the actual tool lives at `/app` (see src/app/app/page.tsx)
 * and the manifest's start_url points there, not here, so an installed home-screen
 * icon opens straight into the capture flow.
 *
 * One signature motion moment (the rotating blob behind the hero mockup) carries
 * the "cool animation" brief; everything else is interaction-triggered (hover) or
 * static, per frontend-design guidance against scattering fade-ins on every section.
 */
"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { PotholeIcon, StreetlightIcon, WaterLeakIcon } from "@/components/icons/CategoryIcons";

const CATEGORIES = [
  {
    icon: PotholeIcon,
    title: "Pothole or road damage",
    copy: "Deep potholes, caved-in surfaces, damaged shoulders.",
    authority: "your city's municipal corporation",
    bg: "bg-rust",
    soft: "bg-rust-soft",
    text: "text-rust",
  },
  {
    icon: StreetlightIcon,
    title: "Broken streetlight",
    copy: "Dark stretches, flickering or dead poles, exposed wiring.",
    authority: "your city's municipal corporation",
    bg: "bg-gold",
    soft: "bg-gold-soft",
    text: "text-gold",
  },
  {
    icon: WaterLeakIcon,
    title: "Water leakage or drainage",
    copy: "Burst pipes, overflowing drains, standing water on the street.",
    authority: "your city's water authority",
    bg: "bg-signal",
    soft: "bg-signal-soft",
    text: "text-signal",
  },
] as const;

const STEPS = [
  {
    n: "01",
    title: "Photograph the problem",
    copy: "Take or upload a photo, add a quick note, and share your location.",
  },
  {
    n: "02",
    title: "AI identifies the issue",
    copy: "CivicFix classifies the problem and works out which authority actually handles it.",
  },
  {
    n: "03",
    title: "Get a ready-to-file complaint",
    copy: "A complete, properly worded complaint — citing the verified official source — drafted in seconds.",
  },
  {
    n: "04",
    title: "File it for real",
    copy: "Hand off to the real government channel for your city — or India's national CPGRAMS portal if we haven't verified your city yet — and submit it yourself. No simulated filing, ever.",
  },
];

function PillLink({
  href,
  children,
  variant = "solid",
}: {
  href: string;
  children: React.ReactNode;
  variant?: "solid" | "ghost";
}) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-full px-7 py-3.5 text-base font-semibold transition-transform active:scale-[0.97]";
  const solid = "bg-ink text-paper hover:-translate-y-0.5 hover:shadow-lg hover:shadow-ink/20";
  const ghost = "border-2 border-ink/80 text-ink hover:bg-ink/5";
  return (
    <Link href={href} className={`${base} ${variant === "solid" ? solid : ghost}`}>
      {children}
    </Link>
  );
}

function HeroMockup() {
  const reduceMotion = useReducedMotion();
  return (
    <div className="relative mx-auto flex h-[320px] w-full max-w-sm items-center justify-center sm:h-[380px]">
      <motion.div
        aria-hidden="true"
        className="absolute h-[260px] w-[260px] rounded-[40%_60%_65%_35%/45%_40%_60%_55%] bg-ink/90 sm:h-[300px] sm:w-[300px]"
        animate={reduceMotion ? undefined : { rotate: 360 }}
        transition={reduceMotion ? undefined : { duration: 26, repeat: Infinity, ease: "linear" }}
      />
      <div className="relative w-[230px] rounded-[2rem] border-4 border-ink bg-paper p-4 shadow-2xl sm:w-[260px]">
        <div className="mb-3 flex items-center justify-between">
          <div className="h-2 w-16 rounded-full bg-ink/15" />
          <div className="h-2 w-2 rounded-full bg-verified" />
        </div>
        <div className="mb-3 h-24 rounded-xl bg-ink/10" />
        <div className="mb-3 flex items-center justify-between rounded-full border border-line px-3 py-2">
          {["Classify", "Research", "Draft"].map((label, i) => (
            <div key={label} className="flex flex-col items-center gap-1">
              <div className={`h-3 w-3 rounded-full ${i < 3 ? "bg-verified" : "bg-ink/15"}`} />
              <span className="text-[9px] font-medium text-slate">{label}</span>
            </div>
          ))}
        </div>
        <div className="rounded-xl bg-verified-soft px-3 py-2.5">
          <div className="text-xs font-bold text-verified">GHMC — Roads &amp; Infrastructure</div>
          <div className="mt-0.5 text-[10px] text-slate">Verified source cited ✓</div>
        </div>
      </div>
    </div>
  );
}

export default function LandingPage() {
  return (
    <main className="bg-paper">
      {/* Nav */}
      <header className="sticky top-0 z-50 border-b border-line/70 bg-paper/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4 sm:px-8">
          <span className="font-display text-xl font-black tracking-tight">CivicFix</span>
          <nav className="hidden items-center gap-2 sm:flex">
            <a
              href="#how-it-works"
              className="rounded-full px-4 py-2 text-sm font-semibold text-ink/80 transition hover:bg-ink/5"
            >
              How it works
            </a>
            <a
              href="#trust"
              className="rounded-full px-4 py-2 text-sm font-semibold text-ink/80 transition hover:bg-ink/5"
            >
              Why it&rsquo;s real
            </a>
          </nav>
          <PillLink href="/app">Open CivicFix</PillLink>
        </div>
      </header>

      {/* Hero */}
      <section className="bg-amber">
        <div className="mx-auto grid max-w-6xl gap-10 px-5 py-16 sm:px-8 sm:py-20 lg:grid-cols-2 lg:items-center lg:gap-6 lg:py-28">
          <div>
            <h1 className="font-display text-[13vw] font-black leading-[0.95] tracking-tight text-ink sm:text-6xl lg:text-7xl">
              Snap it. We&rsquo;ll find who&rsquo;s responsible.
            </h1>
            <p className="mt-6 max-w-md text-lg leading-relaxed text-ink/80">
              Photograph a pothole, a broken streetlight, or a water leak anywhere in India.
              CivicFix identifies the right government authority, drafts the complaint, and hands
              you off to file it for real.
            </p>
            <p className="mt-3 max-w-md text-sm text-ink/60">
              Named local authorities in Hyderabad, Bengaluru, Mumbai, Delhi, Chennai, Kolkata,
              Pune &amp; Ahmedabad — CPGRAMS, India&rsquo;s national grievance portal, everywhere
              else.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <PillLink href="/app">Open CivicFix</PillLink>
              <PillLink href="#how-it-works" variant="ghost">
                See how it works
              </PillLink>
            </div>
          </div>
          <HeroMockup />
        </div>
      </section>

      {/* Category showcase */}
      <section className="mx-auto max-w-6xl px-5 py-16 sm:px-8 sm:py-24">
        <h2 className="font-display max-w-xl text-3xl font-black leading-tight sm:text-4xl">
          Three problems, three authorities — handled correctly every time.
        </h2>
        <div className="mt-10 grid gap-5 sm:grid-cols-3">
          {CATEGORIES.map(({ icon: Icon, title, copy, authority, bg, soft, text }) => (
            <motion.div
              key={title}
              whileHover={{ y: -6, rotate: -0.5 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
              className={`flex flex-col justify-between rounded-3xl ${bg} p-6 text-paper`}
            >
              <div>
                <Icon className="h-11 w-11" />
                <h3 className="font-display mt-5 text-xl font-bold">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-paper/85">{copy}</p>
              </div>
              <div
                className={`mt-6 inline-flex w-fit items-center gap-1.5 rounded-full ${soft} px-3 py-1.5 text-xs font-bold ${text}`}
              >
                Routes to {authority}
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="border-y border-line bg-ink/[0.03]">
        <div className="mx-auto max-w-6xl px-5 py-16 sm:px-8 sm:py-24">
          <h2 className="font-display text-3xl font-black leading-tight sm:text-4xl">How it works</h2>
          <div className="mt-10 grid gap-x-8 gap-y-10 sm:grid-cols-2">
            {STEPS.map((step) => (
              <div key={step.n} className="flex gap-5">
                <span className="font-display shrink-0 text-4xl font-black text-amber-deep">{step.n}</span>
                <div>
                  <h3 className="text-lg font-bold">{step.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-slate">{step.copy}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Trust band */}
      <section id="trust" className="bg-ink text-paper">
        <div className="mx-auto max-w-6xl px-5 py-16 sm:px-8 sm:py-24">
          <h2 className="font-display max-w-3xl text-3xl font-black leading-tight sm:text-4xl">
            Real authorities. Real filing. No pretending.
          </h2>
          <div className="mt-10 grid gap-8 sm:grid-cols-2">
            <div>
              <h3 className="text-lg font-bold text-amber">Verified, not guessed</h3>
              <p className="mt-2 text-sm leading-relaxed text-paper/75">
                Every authority CivicFix names is backed by a real, verified official source,
                checked ahead of time — never an invented URL or a silent guess.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-bold text-amber">You file it — for real</h3>
              <p className="mt-2 text-sm leading-relaxed text-paper/75">
                CivicFix hands you off to the actual government reporting channel. There&rsquo;s no
                fake &ldquo;submitted&rdquo; screen and no made-up status tracker.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="bg-amber">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-5 px-5 py-20 text-center sm:px-8">
          <h2 className="font-display text-4xl font-black leading-tight text-ink sm:text-5xl">
            Seen a problem today?
          </h2>
          <p className="max-w-md text-ink/80">Free to use. No account needed.</p>
          <PillLink href="/app">Open CivicFix</PillLink>
        </div>
      </section>

      <footer className="px-5 py-8 text-center text-xs text-slate sm:px-8">
        CivicFix — built for India, verified city by city.
      </footer>
    </main>
  );
}
