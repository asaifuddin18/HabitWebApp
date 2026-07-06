"use client";

import Link from "next/link";
import { useSession, signIn, signOut } from "next-auth/react";

export default function NavBar() {
  const { data: session, status } = useSession();

  return (
    <header className="border-b border-black/10 dark:border-white/10">
      <nav className="mx-auto flex max-w-2xl items-center justify-between px-4 py-3">
        <div className="flex items-center gap-4">
          <Link href="/" className="text-lg font-semibold">
            Habit
          </Link>
          {session && (
            <>
              <Link href="/dashboard" className="text-sm text-black/60 hover:text-black dark:text-white/60 dark:hover:text-white">
                Dashboard
              </Link>
              <Link href="/tasks" className="text-sm text-black/60 hover:text-black dark:text-white/60 dark:hover:text-white">
                Tasks
              </Link>
            </>
          )}
        </div>
        <div className="text-sm">
          {status === "loading" ? null : session ? (
            <button
              onClick={() => signOut()}
              className="rounded-md px-3 py-1 text-black/60 hover:bg-black/5 dark:text-white/60 dark:hover:bg-white/10"
            >
              Sign out
            </button>
          ) : (
            <button
              onClick={() => signIn("google")}
              className="rounded-md bg-black px-3 py-1 text-white dark:bg-white dark:text-black"
            >
              Sign in
            </button>
          )}
        </div>
      </nav>
    </header>
  );
}
