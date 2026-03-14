"use client";

import Link from "next/link";
import { useState } from "react";

export function PricingSection({ fontClassName }: { fontClassName: string }) {
  const [annual, setAnnual] = useState(false);

  return (
    <section id="pricing" className="scroll-mt-20 border-t border-zinc-800 bg-zinc-950 px-4 py-16 sm:px-6">
      <div className="mx-auto max-w-6xl">
        <h2 className={`text-center text-2xl font-bold text-zinc-100 sm:text-3xl ${fontClassName}`}>
          Simple Pricing
        </h2>
        <p className="mt-2 text-center text-zinc-400">
          Start free. Upgrade when you need more.
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-2">
          <button
            type="button"
            onClick={() => setAnnual(false)}
            className={`rounded-lg px-4 py-2 text-sm font-medium ${
              !annual
                ? "bg-zinc-800 text-white"
                : "bg-zinc-800/50 text-zinc-400 hover:text-zinc-300"
            }`}
          >
            Monthly
          </button>
          <button
            type="button"
            onClick={() => setAnnual(true)}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium ${
              annual
                ? "bg-zinc-800 text-white"
                : "bg-zinc-800/50 text-zinc-400 hover:text-zinc-300"
            }`}
          >
            Annual
            <span className="rounded bg-emerald-600 px-1.5 py-0.5 text-xs text-white">
              Save 17%
            </span>
          </button>
        </div>

        <div className="mt-10 grid gap-6 sm:grid-cols-3">
          {/* Free */}
          <div className="rounded-lg border border-zinc-700 bg-zinc-900 p-6">
            <h3 className={`text-lg font-bold text-zinc-100 ${fontClassName}`}>FREE</h3>
            <p className="mt-2 text-2xl font-bold text-zinc-100">
              $0<span className="text-sm font-normal text-zinc-500">/forever</span>
            </p>
            <ul className="mt-4 space-y-2 text-sm text-zinc-400">
              <li>1 property</li>
              <li>Scans every 6 hours</li>
              <li>Email alerts</li>
              <li>Baseline violation audit</li>
            </ul>
            <Link
              href="/login"
              className="mt-6 block w-full rounded-lg border border-zinc-600 py-2.5 text-center text-sm font-medium text-zinc-300 transition hover:bg-zinc-800"
            >
              Get started free
            </Link>
          </div>

          {/* Starter */}
          <div className="relative rounded-lg border-2 border-emerald-500/50 bg-zinc-900 p-6">
            <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded bg-emerald-600 px-3 py-0.5 text-xs font-medium text-white">
              Most Popular
            </span>
            <h3 className={`text-lg font-bold text-zinc-100 ${fontClassName}`}>STARTER</h3>
            <p className="mt-2 text-2xl font-bold text-zinc-100">
              {annual ? (
                <>$149<span className="text-sm font-normal text-zinc-500">/yr</span></>
              ) : (
                <>$14.89<span className="text-sm font-normal text-zinc-500">/mo</span></>
              )}
            </p>
            <ul className="mt-4 space-y-2 text-sm text-zinc-400">
              <li>Up to 5 properties</li>
              <li>Scans every hour</li>
              <li>Email + SMS alerts</li>
              <li>CSV export</li>
            </ul>
            <Link
              href="/login"
              className="mt-6 block w-full rounded-lg bg-emerald-600 py-2.5 text-center text-sm font-medium text-white transition hover:bg-emerald-500"
            >
              Upgrade to Starter
            </Link>
          </div>

          {/* Pro */}
          <div className="rounded-lg border border-zinc-700 bg-zinc-900 p-6">
            <h3 className={`text-lg font-bold text-zinc-100 ${fontClassName}`}>PRO</h3>
            <p className="mt-2 text-2xl font-bold text-zinc-100">
              {annual ? (
                <>$249<span className="text-sm font-normal text-zinc-500">/yr</span></>
              ) : (
                <>$24.89<span className="text-sm font-normal text-zinc-500">/mo</span></>
              )}
            </p>
            <ul className="mt-4 space-y-2 text-sm text-zinc-400">
              <li>Unlimited properties</li>
              <li>Scans every 30 minutes</li>
              <li>Email + SMS alerts</li>
              <li>CSV + PDF export</li>
              <li>Priority support</li>
            </ul>
            <Link
              href="/login"
              className="mt-6 block w-full rounded-lg bg-emerald-600 py-2.5 text-center text-sm font-medium text-white transition hover:bg-emerald-500"
            >
              Go Pro
            </Link>
          </div>
        </div>

        <p className="mt-8 text-center text-sm text-zinc-500">
          All plans include a free baseline violation audit. Cancel anytime.
        </p>
      </div>
    </section>
  );
}
