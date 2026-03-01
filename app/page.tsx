import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="flex min-h-screen flex-col bg-zinc-50 dark:bg-zinc-950">
      <header className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
          <span className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            CasAlert
          </span>
          <nav>
            {user ? (
              <Link
                href="/dashboard"
                className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
              >
                Dashboard
              </Link>
            ) : (
              <Link
                href="/login"
                className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
              >
                Sign in
              </Link>
            )}
          </nav>
        </div>
      </header>

      <main className="mx-auto flex max-w-3xl flex-1 flex-col items-center justify-center px-4 py-16 text-center">
        <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 sm:text-4xl">
          Housing code violation alerts for landlords
        </h1>
        <p className="mt-4 text-lg text-zinc-600 dark:text-zinc-400">
          We monitor municipal violation databases and notify you by email or
          SMS when a new violation is filed against your property.
        </p>
        <div className="mt-8">
          {user ? (
            <Link
              href="/dashboard"
              className="inline-flex items-center rounded-lg bg-zinc-900 px-6 py-3 text-base font-medium text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              Go to dashboard
            </Link>
          ) : (
            <Link
              href="/login"
              className="inline-flex items-center rounded-lg bg-zinc-900 px-6 py-3 text-base font-medium text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              Get started
            </Link>
          )}
        </div>
      </main>
    </div>
  );
}
