"use client";

import { useState } from "react";

const ITEMS: { question: string; answer: string }[] = [
  {
    question: "How does CasAlerts get violation data?",
    answer:
      "We connect directly to official city open data portals — the same public databases used by city inspectors and attorneys. No scraping, no intermediaries.",
  },
  {
    question: "How fast will I be alerted?",
    answer:
      "Depending on your plan, we check city databases every 30 minutes to 6 hours. You'll receive an alert within minutes of detection.",
  },
  {
    question: "What cities do you support?",
    answer:
      "Chicago and Philadelphia at launch. We're adding Los Angeles, Houston, and Atlanta throughout 2026.",
  },
  {
    question: "Is the free plan really free?",
    answer:
      "Yes. Monitor 1 property with email alerts, forever. No credit card required, no trial period.",
  },
  {
    question: "Is this legal advice?",
    answer:
      "No. CasAlerts provides monitoring information from public government databases. We are not a legal service. Always verify violation details directly with your municipal authority.",
  },
  {
    question: "Can I cancel anytime?",
    answer:
      "Yes. Cancel from your settings page. You keep access through the end of your billing period.",
  },
];

export function FAQSection({ fontClassName }: { fontClassName: string }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <section id="faq" className="scroll-mt-20 border-t border-zinc-800 bg-zinc-950 px-4 py-16 sm:px-6">
      <div className="mx-auto max-w-3xl">
        <h2 className={`text-center text-2xl font-bold text-zinc-100 sm:text-3xl ${fontClassName}`}>
          Questions & Answers
        </h2>
        <div className="mt-10 space-y-2">
          {ITEMS.map((item, i) => (
            <div
              key={i}
              className="rounded-lg border border-zinc-700 bg-zinc-900 overflow-hidden"
            >
              <button
                type="button"
                onClick={() => setOpenIndex(openIndex === i ? null : i)}
                className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-medium text-zinc-100 transition hover:bg-zinc-800"
              >
                <span>{item.question}</span>
                <span
                  className={`ml-2 shrink-0 text-zinc-500 transition-transform ${
                    openIndex === i ? "rotate-180" : ""
                  }`}
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </span>
              </button>
              {openIndex === i && (
                <div className="border-t border-zinc-700 px-4 py-3 text-sm text-zinc-400">
                  {item.answer}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
