import { DM_Sans } from "next/font/google";
import Link from "next/link";
import { LandingNav } from "@/components/landing/LandingNav";
import { PricingSection } from "@/components/landing/PricingSection";
import { FAQSection } from "@/components/landing/FAQSection";

const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-dm-sans",
});

const fontClassName = dmSans.className;

export default function HomePage() {
  return (
    <div className={`min-h-screen bg-zinc-950 text-zinc-100 ${fontClassName}`}>
      <LandingNav fontClassName={fontClassName} />

      {/* Hero */}
      <section className="border-b border-zinc-800 px-4 pb-16 pt-12 sm:px-6 md:pt-16">
        <div className="mx-auto max-w-6xl">
          <div className="grid gap-12 lg:grid-cols-2 lg:gap-16 lg:items-center">
            <div>
              <h1 className={`text-3xl font-bold leading-tight text-zinc-100 sm:text-4xl md:text-5xl ${fontClassName}`}>
                A Violation Was Filed Against Your Property. Did You Know?
              </h1>
              <p className="mt-4 max-w-2xl text-base text-zinc-400">
                Most landlords find out about code violations weeks after they&apos;re filed — when it&apos;s already a legal problem. CasAlerts monitors Chicago and Philadelphia city databases and alerts you within hours by email or SMS.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  href="/login"
                  className="inline-flex items-center rounded-lg bg-emerald-600 px-8 py-3 text-sm font-semibold text-white transition hover:bg-emerald-500"
                >
                  Monitor your property free
                </Link>
                <a
                  href="#how-it-works"
                  className="inline-flex items-center rounded-lg border border-zinc-700 bg-zinc-800 px-8 py-3 text-sm font-medium text-zinc-300 transition hover:bg-zinc-700 hover:text-zinc-100"
                >
                  See how it works
                </a>
              </div>
              <p className="mt-4 text-sm text-zinc-500">
                Free forever for 1 property · No credit card required
              </p>
            </div>
            <div className="flex justify-center lg:justify-end">
              <div className="w-full max-w-sm rounded-lg border-l-4 border-red-500 bg-zinc-800 p-4 shadow-lg">
                <p className="text-xs font-semibold uppercase tracking-wide text-red-500">
                  🔴 New Violation Detected
                </p>
                <p className="mt-2 font-medium text-zinc-100">
                  3223 N HARLEM AVE, Chicago
                </p>
                <p className="mt-1 text-sm text-red-400">
                  COMPLAINT — Failure to maintain exterior walls
                </p>
                <p className="mt-2 text-xs text-zinc-500">
                  Filed: March 8, 2026
                </p>
                <p className="text-xs text-zinc-500">
                  Inspector: J. Rodriguez
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Trust bar */}
      <section className="border-b border-zinc-800 bg-zinc-900 px-4 py-6 sm:px-6">
        <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-center gap-8 text-sm text-zinc-500">
          <span>🏘️ Monitoring 200+ properties</span>
          <span>📡 Direct city database access</span>
          <span>🔒 Bank-level encryption</span>
        </div>
      </section>

      {/* Problem */}
      <section className="border-b border-zinc-800 px-4 py-16 sm:px-6">
        <div className="mx-auto max-w-6xl">
          <h2 className={`text-center text-2xl font-bold text-zinc-100 sm:text-3xl ${fontClassName}`}>
            The Problem Every Landlord Faces
          </h2>
          <div className="mt-12 grid gap-6 sm:grid-cols-3">
            <div className="rounded-lg border border-zinc-700 bg-zinc-900 p-6">
              <p className="text-2xl" aria-hidden="true">🔴</p>
              <h3 className={`mt-2 text-lg font-bold text-zinc-100 ${fontClassName}`}>
                Tenant-filed complaints
              </h3>
              <p className="mt-2 text-sm text-zinc-400">
                A tenant calls 311, an inspector shows up, and a violation is filed — all before you know anything happened. Now it&apos;s on public record.
              </p>
            </div>
            <div className="rounded-lg border border-zinc-700 bg-zinc-900 p-6">
              <p className="text-2xl" aria-hidden="true">⏰</p>
              <h3 className={`mt-2 text-lg font-bold text-zinc-100 ${fontClassName}`}>
                Missed deadlines
              </h3>
              <p className="mt-2 text-sm text-zinc-400">
                Compliance deadlines start ticking the day a violation is filed. Miss one and you&apos;re looking at escalated fines, court dates, or license problems.
              </p>
            </div>
            <div className="rounded-lg border border-zinc-700 bg-zinc-900 p-6">
              <p className="text-2xl" aria-hidden="true">💰</p>
              <h3 className={`mt-2 text-lg font-bold text-zinc-100 ${fontClassName}`}>
                Preventable fines
              </h3>
              <p className="mt-2 text-sm text-zinc-400">
                The average code violation fine in Chicago ranges from $500 to $1,000 per violation. Most could be avoided with earlier notice.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="scroll-mt-20 border-b border-zinc-800 bg-zinc-900/50 px-4 py-16 sm:px-6">
        <div className="mx-auto max-w-6xl">
          <h2 className={`text-center text-2xl font-bold text-zinc-100 sm:text-3xl ${fontClassName}`}>
            How CasAlerts Works
          </h2>
          <div className="mt-12 grid gap-10 sm:grid-cols-3">
            <div>
              <span className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-emerald-500 bg-zinc-900 text-sm font-bold text-emerald-500">
                1
              </span>
              <h3 className={`mt-4 text-lg font-bold text-zinc-100 ${fontClassName}`}>
                Add Your Property
              </h3>
              <p className="mt-2 text-sm text-zinc-400">
                Enter your address. We verify it against city records and instantly scan for every existing open violation — your free baseline audit.
              </p>
            </div>
            <div>
              <span className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-emerald-500 bg-zinc-900 text-sm font-bold text-emerald-500">
                2
              </span>
              <h3 className={`mt-4 text-lg font-bold text-zinc-100 ${fontClassName}`}>
                We Watch the Databases
              </h3>
              <p className="mt-2 text-sm text-zinc-400">
                Our system monitors Chicago and Philadelphia code violation databases continuously. When a new violation is filed at your address, we detect it.
              </p>
            </div>
            <div>
              <span className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-emerald-500 bg-zinc-900 text-sm font-bold text-emerald-500">
                3
              </span>
              <h3 className={`mt-4 text-lg font-bold text-zinc-100 ${fontClassName}`}>
                You Get Alerted
              </h3>
              <p className="mt-2 text-sm text-zinc-400">
                Receive an email or SMS with the full details: violation type, severity, inspector assigned, compliance deadline, and a direct link to the city record.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="scroll-mt-20 border-b border-zinc-800 px-4 py-16 sm:px-6">
        <div className="mx-auto max-w-6xl">
          <h2 className={`text-center text-2xl font-bold text-zinc-100 sm:text-3xl ${fontClassName}`}>
            What You Get
          </h2>
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-lg border border-zinc-700 bg-zinc-900 p-6">
              <h3 className={`text-lg font-bold text-zinc-100 ${fontClassName}`}>
                Instant Violation Alerts
              </h3>
              <p className="mt-2 text-sm text-zinc-400">
                Email and SMS the moment a new violation appears on city records. Know in hours, not weeks.
              </p>
            </div>
            <div className="rounded-lg border border-zinc-700 bg-zinc-900 p-6">
              <h3 className={`text-lg font-bold text-zinc-100 ${fontClassName}`}>
                Free Baseline Audit
              </h3>
              <p className="mt-2 text-sm text-zinc-400">
                Every open violation on your property, surfaced the moment you sign up. See exactly where you stand.
              </p>
            </div>
            <div className="rounded-lg border border-zinc-700 bg-zinc-900 p-6">
              <h3 className={`text-lg font-bold text-zinc-100 ${fontClassName}`}>
                COMPLAINT Detection
              </h3>
              <p className="mt-2 text-sm text-zinc-400">
                Tenant-filed complaints are flagged in red and prioritized — these carry the highest legal risk.
              </p>
            </div>
            <div className="rounded-lg border border-zinc-700 bg-zinc-900 p-6">
              <h3 className={`text-lg font-bold text-zinc-100 ${fontClassName}`}>
                Multi-City Monitoring
              </h3>
              <p className="mt-2 text-sm text-zinc-400">
                Chicago and Philadelphia today. Los Angeles, Houston, and Atlanta coming 2026.
              </p>
            </div>
            <div className="rounded-lg border border-zinc-700 bg-zinc-900 p-6">
              <div className="flex items-center gap-2">
                <h3 className={`text-lg font-bold text-zinc-100 ${fontClassName}`}>
                  Compliance History Export
                </h3>
                <span className="rounded bg-emerald-600/20 px-1.5 py-0.5 text-xs font-medium text-emerald-400">
                  Starter & Pro
                </span>
              </div>
              <p className="mt-2 text-sm text-zinc-400">
                Download your full violation history as CSV. Useful for insurance renewals, legal proceedings, or property sales.
              </p>
            </div>
            <div className="rounded-lg border border-zinc-700 bg-zinc-900 p-6">
              <div className="flex items-center gap-2">
                <h3 className={`text-lg font-bold text-zinc-100 ${fontClassName}`}>
                  SMS + Email Alerts
                </h3>
                <span className="rounded bg-emerald-600/20 px-1.5 py-0.5 text-xs font-medium text-emerald-400">
                  Starter & Pro
                </span>
              </div>
              <p className="mt-2 text-sm text-zinc-400">
                Choose how you want to be notified. Free plan includes email. Paid plans add SMS for urgent alerts.
              </p>
            </div>
          </div>
        </div>
      </section>

      <PricingSection fontClassName={fontClassName} />

      {/* City coverage */}
      <section className="border-t border-zinc-800 px-4 py-16 sm:px-6">
        <div className="mx-auto max-w-6xl">
          <h2 className={`text-center text-2xl font-bold text-zinc-100 sm:text-3xl ${fontClassName}`}>
            Built for Your City
          </h2>
          <div className="mt-12 grid gap-6 sm:grid-cols-2">
            <div className="rounded-lg border border-zinc-700 bg-zinc-900 p-6">
              <h3 className={`text-lg font-bold text-zinc-100 ${fontClassName}`}>
                Chicago, IL
              </h3>
              <p className="mt-2 text-sm text-zinc-400">
                Building Code Violations via Chicago Open Data Portal (Socrata API). Updated daily. Covers COMPLAINT, PERIODIC, REGISTRATION, and PERMIT inspections.
              </p>
            </div>
            <div className="rounded-lg border border-zinc-700 bg-zinc-900 p-6">
              <h3 className={`text-lg font-bold text-zinc-100 ${fontClassName}`}>
                Philadelphia, PA
              </h3>
              <p className="mt-2 text-sm text-zinc-400">
                L&I Code Violations via OpenDataPhilly (Carto API). Updated daily. Covers all Department of Licenses & Inspections enforcement actions.
              </p>
            </div>
          </div>
          <p className="mt-6 text-center text-sm text-zinc-500">
            Expanding to Los Angeles, Houston, and Atlanta in 2026.
          </p>
        </div>
      </section>

      <FAQSection fontClassName={fontClassName} />

      {/* Final CTA */}
      <section className="relative border-t border-zinc-800 bg-zinc-900 px-4 py-20 sm:px-6">
        <div className="absolute inset-0 bg-gradient-to-b from-emerald-950/20 to-transparent" />
        <div className="relative mx-auto max-w-2xl text-center">
          <h2 className={`text-2xl font-bold text-zinc-100 sm:text-3xl ${fontClassName}`}>
            Every Day Without Monitoring Is a Day You&apos;re Exposed
          </h2>
          <p className="mt-4 text-zinc-400">
            It takes 30 seconds to add your first property. You&apos;ll see every open violation instantly.
          </p>
          <Link
            href="/login"
            className="mt-8 inline-flex items-center rounded-lg bg-emerald-600 px-10 py-4 text-base font-semibold text-white transition hover:bg-emerald-500"
          >
            Start monitoring free
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-zinc-800 bg-zinc-950 px-4 py-8 sm:px-6">
        <div className="mx-auto max-w-6xl">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <p className="text-sm text-zinc-600">© 2026 CasAlerts</p>
            <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-sm text-zinc-600">
              <a href="#features" className="hover:text-zinc-400">Features</a>
              <span>·</span>
              <a href="#pricing" className="hover:text-zinc-400">Pricing</a>
              <span>·</span>
              <a href="#faq" className="hover:text-zinc-400">FAQ</a>
              <span>·</span>
              <Link href="/login" className="hover:text-zinc-400">Sign in</Link>
              <span>·</span>
              <Link href="/terms" className="hover:text-zinc-400">Terms</Link>
              <span>·</span>
              <Link href="/privacy" className="hover:text-zinc-400">Privacy</Link>
            </div>
          </div>
          <p className="mt-6 max-w-2xl text-center text-xs text-zinc-600 sm:text-left">
            CasAlerts provides monitoring information from public government databases. We are not a legal service and nothing on this platform constitutes legal advice.
          </p>
        </div>
      </footer>
    </div>
  );
}
