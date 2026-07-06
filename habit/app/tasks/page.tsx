"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSession, signIn } from "next-auth/react";
import type { Task } from "@/lib/types";
import { describeSchedule } from "@/lib/describe";

export default function ManageTasks() {
  const { status } = useSession();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/tasks");
    if (res.ok) setTasks((await res.json()) as Task[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (status === "authenticated") load();
  }, [status, load]);

  const remove = async (task: Task) => {
    if (!confirm(`Delete "${task.title}"? Past completions are kept.`)) return;
    setTasks((prev) => prev.filter((t) => t.taskId !== task.taskId));
    await fetch(`/api/tasks/${task.taskId}`, { method: "DELETE" });
  };

  if (status === "loading") return <p className="text-black/50 dark:text-white/50">Loading…</p>;

  if (status === "unauthenticated") {
    return (
      <div className="rounded-xl border border-black/10 p-8 text-center dark:border-white/10">
        <p className="text-black/60 dark:text-white/60">Sign in to manage your tasks.</p>
        <button
          onClick={() => signIn("google")}
          className="mt-4 rounded-md bg-black px-4 py-2 text-white dark:bg-white dark:text-black"
        >
          Sign in with Google
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold">Your tasks</h1>
        <Link
          href="/tasks/new"
          className="rounded-md bg-black px-3 py-1.5 text-sm text-white dark:bg-white dark:text-black"
        >
          + New task
        </Link>
      </div>

      {loading ? (
        <p className="text-black/50 dark:text-white/50">Loading…</p>
      ) : tasks.length === 0 ? (
        <div className="rounded-xl border border-dashed border-black/15 p-8 text-center dark:border-white/15">
          <p className="text-black/60 dark:text-white/60">No tasks yet.</p>
          <Link href="/tasks/new" className="mt-3 inline-block text-sm underline">
            Create your first task
          </Link>
        </div>
      ) : (
        <ul className="space-y-2">
          {tasks.map((task) => (
            <li
              key={task.taskId}
              className="flex items-center justify-between rounded-xl border border-black/10 px-4 py-3 dark:border-white/10"
            >
              <Link href={`/tasks/${task.taskId}`} className="min-w-0 group">
                <p className="truncate font-medium group-hover:underline">
                  {task.title}
                  {!task.active && (
                    <span className="ml-2 rounded bg-black/10 px-1.5 py-0.5 text-xs dark:bg-white/10">
                      paused
                    </span>
                  )}
                </p>
                <p className="text-sm text-black/50 dark:text-white/50">
                  {describeSchedule(task)}
                </p>
              </Link>
              <div className="flex flex-none gap-2 text-sm">
                <Link
                  href={`/tasks/${task.taskId}/edit`}
                  className="rounded-md px-2 py-1 hover:bg-black/5 dark:hover:bg-white/10"
                >
                  Edit
                </Link>
                <button
                  onClick={() => remove(task)}
                  className="rounded-md px-2 py-1 text-red-600 hover:bg-red-500/10"
                >
                  Delete
                </button>
              </div>
            