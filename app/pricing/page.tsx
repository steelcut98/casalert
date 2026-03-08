"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ThemeToggle } from "@/components/ThemeToggle";

type PriceIds = {
  starterMonthly: string;
  starterAnnual: string;
  proMonthly: string;
  proAnnual: string;
};

export default function PricingPage() {
  const [annual, setAnnual] = useState(false);
  const [priceIds, setPriceIds] = useState<PriceIds | null>(null);
  const [loading, setLoading] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/stripe/prices")
      .then((r) => r.json())
      .then(setPriceIds)
      .catch(() => setPriceIds(null));
  }, []);

  async function handleCheckout(priceId: string) {
    if (!priceId) return;
    setLoading(priceId);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priceId }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        setLoading(null);
      }
    } catch {
      setLoading(null);
    }
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <header className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
          <Link
            href="/"
            className="text-lg font-semibold text-zinc-900 dark:text-zinc-100"
          >
            CasAlert
          </Link>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Link
              href="/login"
              className="text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
            >
              Log in
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-12">
        <h1 className="text-center text-3xl font-bold text-zinc-900 dark:text-zinc-100">
          Simple, transparent pricing
        </h1>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-2">
          <button
            type="button"
            onClick={() => setAnnual(false)}
            className={`rounded-full px-4 py-2 text-sm font-medium ${
              !annual
                ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                : "bg-zinc-200 text-zinc-700 dark:bg-zinc-700 dark:text-zinc-300"
            }`}
          >
            Monthly
          </button>
          <button
            type="button"
            onClick={() => setAnnual(true)}
            className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium ${
              annual
                ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                : "bg-zinc-200 text-zinc-700 dark:bg-zinc-700 dark:text-zinc-300"
            }`}
          >
            Annual
            <span className="rounded bg-emerald-600 px-1.5 py-0.5 text-xs text-white">
              Save 2 months
            </span>
          </button>
        </div>

        <div className="mt-10 grid gap-6 sm:grid-cols-3">
          {/* Free */}
          <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
              Free
            </h2>
            <p className="mt-2 text-2xl font-bold text-zinc-900 dark:text-zinc-100">
              $0<span className="text-sm font-normal text-zinc-500">/mo</span>
            </p>
            <ul className="mt-4 space-y-2 text-sm text-zinc-600 dark:text-zinc-400">
              <li>1 property</li>
              <li>6-hour scans</li>
              <li>Email alerts only</li>
              <li>Baseline violation audit</li>
            </ul>
            <Link
              href="/login"
              className="mt-6 block w-full rounded-lg border border-zinc-300 py-2.5 text-center text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              Get started free
            </Link>
          </div>

          {/* Starter */}
          <div className="relative rounded-xl border-2 border-indigo-500 bg-white p-6 shadow-md dark:border-indigo-500 dark:bg-zinc-900">
            <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-indigo-600 px-3 py-0.5 text-xs font-medium text-white">
              Most Popular
            </span>
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
              Starter
            </h2>
            <p className="mt-2 text-2xl font-bold text-zinc-900 dark:text-zinc-100">
              {annual ? (
                <>
                  $149<span className="text-sm font-normal text-zinc-500">/yr</span>
                </>
              ) : (
                <>
                  $14.89<span className="text-sm font-normal text-zinc-500">/mo</span>
                </>
              )}
            </p>
            <ul className="mt-4 space-y-2 text-sm text-zinc-600 dark:text-zinc-400">
              <li>Up to 5 properties</li>
              <li>1-hour scans</li>
              <li>Email + SMS alerts</li>
              <li>CSV export</li>
            </ul>
            <button
              type="button"
              disabled={!priceIds || !!loading}
              onClick={() =>
                handleCheckout(
                  annual ? priceIds!.starterAnnual : priceIds!.starterMonthly
                )
              }
              className="mt-6 w-full rounded-lg bg-indigo-600 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              {loading ? "Redirecting…" : "Start monitoring"}
            </button>
          </div>

          {/* Pro */}
          <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
              Pro
            </h2>
            <p className="mt-2 text-2xl font-bold text-zinc-900 dark:text-zinc-100">
              {annual ? (
                <>
                  $249<span className="text-sm font-normal text-zinc-500">/yr</span>
                </>
              ) : (
                <>
                  $24.89<span className="text-sm font-normal text-zinc-500">/mo</span>
                </>
              )}
            </p>
            <ul className="mt-4 space-y-2 text-sm text-zinc-600 dark:text-zinc-400">
              <li>Unlimited properties</li>
              <li>30-min scans</li>
              <li>Email + SMS alerts</li>
              <li>Multi-city + API access</li>
            </ul>
            <button
              type="button"
              disabled={!priceIds || !!loading}
              onClick={() =>
                handleCheckout(
                  annual ? priceIds!.proAnnual : priceIds!.proMonthly
                )
              }
              className="mt-6 w-full rounded-lg bg-zinc-900 py-2.5 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200 disabled:opacity-50"
            >
              {loading ? "Redirecting…" : "Go Pro"}
            </button>
          </div>
        </div>

        {annual && (
          <p className="mt-8 text-center text-sm text-zinc-600 dark:text-zinc-400">
            Annual billing saves you 2 months — that&apos;s like getting two
            months completely free.
          </p>
        )}
      </main>
    </div>
  );
}
