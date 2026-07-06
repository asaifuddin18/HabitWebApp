"use client";

import { signIn } from "next-auth/react";

export default function SignIn() {
  return (
    <div className="rounded-xl border border-black/10 p-8 text-center dark:border-white/10">
      <h1 className="text-xl font-semibold">Sign in to Habit</h1>
      <p className="mt-2 text-black/60 dark:text-white/60">
        Use your Google account to continue.
      </p>
      <button
        onClick={() => signIn("google", { callbackUrl: "/" })}
        className="mt-4 rounded-md bg-black px-4 py-2 text-white dark:bg-white dark:text-black"
      >
        Sign in with Google
      </button>
    </div>
  );
}
