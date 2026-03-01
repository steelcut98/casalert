"use client";

import { useState } from "react";
import { rescanPropertyViolations } from "./actions";

export function RescanButton({ propertyId }: { propertyId: string }) {
  const [rescanning, setRescanning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setError(null);
    setRescanning(true);
    try {
      const result = await rescanPropertyViolations(propertyId);
      if (result.error) {
        setError(result.error);
      } else {
        window.location.reload();
      }
    } finally {
      setRescanning(false);
    }
  }

  return (
    <span className="ml-3 inline-flex items-center gap-2">
      <button
        type="button"
        disabled={rescanning}
        onClick={handleClick}
        className="inline-flex items-center gap-1.5 rounded border border-zinc-300 bg-white px-2.5 py-1 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-60 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
      >
        {rescanning ? (
          <>
            <svg
              className="h-4 w-4 animate-spin text-zinc-500"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              aria-hidden
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            Re-scanning…
          </>
        ) : (
          "Re-scan property"
        )}
      </button>
      {error && (
        <span className="text-sm text-red-600 dark:text-red-400">{error}</span>
      )}
    </span>
  );
}
