"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSession, signIn } from "next-auth/react";
import Link from "next/link";
import type { Task, TaskWithStatus } from "@/lib/types";
import { formatDate, parseDate, tasksDueOn } from "@/lib/recurrence";

function addDays(iso: string, delta: number): string {
  const d = parseDate(iso);
  d.setDate(d.getDate() + delta);
  return formatDate(d);
}

function prettyDate(iso: string): string {
  const d = parseDate(iso);
  const today = formatDate(new Date());
  const yesterday = addDays(today, -1);
  const tomorrow = addDays(today, 1);
  if (iso === today) return "Today";
  if (iso === yesterday) return "Yesterday";
  if (iso === tomorrow) return "Tomorrow";
  return d.toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

export default function TodayView() {
  const { status } = useSession();
  const [date, setDate] = useState<string>(() => formatDate(new Date()));
  const [tasks, setTasks] = useState<Task[]>([]);
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadTasks = useCallback(async () => {
    const res = await fetch("/api/tasks");
    if (!res.ok) throw new Error("Failed to load tasks");
    setTasks((await res.json()) as Task[]);
  }, []);

  const loadCompletions = useCallback(async (d: string) => {
    const res = await fetch(`/api/completions?date=${d}`);
    if (!res.ok) throw new Error("Failed to load completions");
    const items = (await res.json()) as { taskId: string }[];
    setCompletedIds(new Set(items.map((c) => c.taskId)));
  }, []);

  useEffect(() => {
    if (status !== "authenticated") return;
    setLoading(true);
    Promise.all([loadTasks(), loadCompletions(date)])
      .then(() => setError(null))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [status, date, loadTasks, loadCompletions]);

  const due: TaskWithStatus[] = useMemo(() => {
    const list = tasksDueOn(tasks, parseDate(date));
    return list
      .map((t) => ({ ...t, completed: completedIds.has(t.taskId) }))
      .sort((a, b) => Number(a.completed) - Number(b.completed) || a.title.localeCompare(b.title));
  }, [tasks, date, completedIds]);

  const toggle = async (task: TaskWithStatus) => {
    const next = !task.completed;
    // optimistic update
    setCompletedIds((prev) => {
      const s = new Set(prev);
      if (next) s.add(task.taskId);
      else s.delete(task.taskId);
      return s;
    });
    const res = await fetch("/api/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ taskId: task.taskId, date, completed: next }),
    });
    if (!res.ok) {
      // revert on failure
      setCompletedIds((prev) => {
        const s = new Set(prev);
        if (next) s.delete(task.taskId);
        else s.add(task.taskId);
        return s;
      });
      setError("Couldn't save that. Try again.");
    }
  };

  if (status === "loading") {
    return <p className="text-black/50 dark:text-white/50">Loading…</p>;
  }

  if (status === "unauthenticated") {
    return (
      <div className="rounded-xl border border-black/10 p-8 text-center dark:border-white/10">
        <h1 className="text-xl font-semibold">Welcome to Habit</h1>
        <p className="mt-2 text-black/60 dark:text-white/60">
          Sign in to see the tasks due today and check them off.
        </p>
        <button
          onClick={() => signIn("google")}
          className="mt-4 rounded-md bg-black px-4 py-2 text-white dark:bg-white dark:text-black"
        >
          Sign in with Google
        </button>
      </div>
    );
  }

  const doneCount = due.filter((t) => t.completed).length;

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <button
          onClick={() => setDate(addDays(date, -1))}
          className="rounded-md px-2 py-1 text-black/50 hover:bg-black/5 dark:text-white/50 dark:hover:bg-white/10"
          aria-label="Previous day"
        >
          ←
        </button>
        <div className="text-center">
          <h1 className="text-xl font-semibold">{prettyDate(date)}</h1>
          {due.length > 0 && (
            <p className="text-sm text-black/50 dark:text-white/50">
              {doneCount} of {due.length} done
            </p>
          )}
        </div>
        <button
          onClick={() => setDate(addDays(date, 1))}
          className="rounded-md px-2 py-1 text-black/50 hover:bg-black/5 dark:text-white/50 dark:hover:bg-white/10"
          aria-label="Next day"
        >
          →
        </button>
      </div>

      {error && <p className="mb-3 text-sm text-red-600">{error}</p>}

      {loading ? (
        <p className="text-black/50 dark:text-white/50">Loading…</p>
      ) : due.length === 0 ? (
        <div className="rounded-xl border border-dashed border-black/15 p-8 text-center dark:border-white/15">
          <p className="text-black/60 dark:text-white/60">Nothing scheduled for this day.</p>
          <Link href="/tasks/new" className="mt-3 inline-block text-sm underline">
            Create a task
          </Link>
        </div>
      ) : (
        <ul className="space-y-2">
          {due.map((task) => (
            <li key={task.taskId}>
              <button
                onClick={() => toggle(task)}
                className={`flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left transition ${
                  task.completed
                    ? "border-green-500/30 bg-green-500/10"
                    : "border-black/10 hover:bg-black/5 dark:border-white/10 dark:hover:bg-white/5"
                }`}
              >
                <span
                  className={`flex h-6 w-6 flex-none items-center justify-center rounded-full border ${
                    task.completed
                      ? "border-green-600 bg-green-600 text-white"
                      : "border-black/30 dark:border-white/30"
                  }`}
                >
                  {task.completed ? "✓" : ""}
                </span>
                <span className="min-w-0">
                  <span
                    className={`block truncate font-medium ${
                      task.completed ? "text-black/50 line-through dark:text-white/50" : ""
                    }`}
                  >
                    {task.title}
                  </span>
                  {task.description && (
                    <span className="block truncate text-sm text-black/50 dark:text-white/50">
                      {task.description}
                    </span>
                  )}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
