"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSession, signIn } from "next-auth/react";
import type { Task, Completion } from "@/lib/types";
import { formatDate, parseDate } from "@/lib/recurrence";
import {
  buildDayStats,
  sumTotals,
  computeStreaks,
  perTaskStats,
  startOfWeekMonday,
} from "@/lib/stats";
import Ring from "../components/Ring";

const WINDOW_DAYS = 84; // ~12 weeks of history for streaks & rates

function shiftISO(iso: string, delta: number): string {
  const d = parseDate(iso);
  d.setDate(d.getDate() + delta);
  return formatDate(d);
}

export default function Dashboard() {
  const { status } = useSession();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [completions, setCompletions] = useState<Completion[]>([]);
  const [loading, setLoading] = useState(true);

  const todayISO = formatDate(new Date());
  const windowStartISO = shiftISO(todayISO, -(WINDOW_DAYS - 1));

  useEffect(() => {
    if (status !== "authenticated") return;
    setLoading(true);
    Promise.all([
      fetch("/api/tasks").then((r) => (r.ok ? r.json() : [])),
      fetch(`/api/completions?start=${windowStartISO}&end=${todayISO}`).then((r) =>
        r.ok ? r.json() : []
      ),
    ])
      .then(([t, c]) => {
        setTasks(t as Task[]);
        setCompletions(c as Completion[]);
      })
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  const stats = useMemo(() => {
    const weekStartISO = formatDate(startOfWeekMonday(new Date()));
    const weekEndISO = shiftISO(weekStartISO, 6);
    const weekDays = buildDayStats(tasks, completions, weekStartISO, weekEndISO);
    const week = sumTotals(weekDays);

    const last7 = buildDayStats(tasks, completions, shiftISO(todayISO, -6), todayISO);
    const windowDays = buildDayStats(tasks, completions, windowStartISO, todayISO);
    const streaks = computeStreaks(windowDays);
    const perTask = perTaskStats(tasks, completions, windowStartISO, todayISO)
      .filter((s) => s.dueDays > 0)
      .sort((a, b) => (b.rate ?? 0) - (a.rate ?? 0));

    return { week, weekLeft: Math.max(week.due - week.done, 0), last7, streaks, perTask };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tasks, completions]);

  if (status === "loading") return <p className="text-black/50 dark:text-white/50">Loading…</p>;

  if (status === "unauthenticated") {
    return (
      <div className="rounded-xl border border-black/10 p-8 text-center dark:border-white/10">
        <p className="text-black/60 dark:text-white/60">Sign in to see your dashboard.</p>
        <button
          onClick={() => signIn("google")}
          className="mt-4 rounded-md bg-black px-4 py-2 text-white dark:bg-white dark:text-black"
        >
          Sign in with Google
        </button>
      </div>
    );
  }

  if (loading) return <p className="text-black/50 dark:text-white/50">Loading…</p>;

  const weekPct =
    stats.week.rate == null ? null : Math.round(stats.week.rate * 100);
  const maxBar = Math.max(1, ...stats.last7.map((d) => Math.max(d.due, d.done)));
  const dayLetters = ["S", "M", "T", "W", "T", "F", "S"];

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">Dashboard</h1>

      {/* Weekly completion ring */}
      <section className="flex flex-col items-center rounded-2xl border border-black/10 p-6 dark:border-white/10">
        <h2 className="mb-4 self-start text-sm font-semibold uppercase tracking-wide text-black/50 dark:text-white/50">
          This week
        </h2>
        <Ring
          value={stats.week.done}
          total={stats.week.due}
          centerBottom={`${stats.weekLeft} left`}
          caption={
            weekPct == null ? "Nothing due this week" : `${stats.week.done} / ${stats.week.due} done · ${weekPct}%`
          }
          color="#f97316"
        />
      </section>

      {/* Streaks */}
      <section className="grid grid-cols-2 gap-4">
        <div className="rounded-2xl border border-black/10 p-5 dark:border-white/10">
          <p className="text-sm text-black/50 dark:text-white/50">Current streak</p>
          <p className="mt-1 text-3xl font-bold tabular-nums">
            {stats.streaks.current}
            <span className="ml-1 text-base font-normal text-black/50 dark:text-white/50">
              {stats.streaks.current === 1 ? "day" : "days"}
            </span>
          </p>
        </div>
        <div className="rounded-2xl border border-black/10 p-5 dark:border-white/10">
          <p className="text-sm text-black/50 dark:text-white/50">Best streak</p>
          <p className="mt-1 text-3xl font-bold tabular-nums">
            {stats.streaks.best}
            <span className="ml-1 text-base font-normal text-black/50 dark:text-white/50">
              {stats.streaks.best === 1 ? "day" : "days"}
            </span>
          </p>
        </div>
      </section>

      {/* Last 7 days bars */}
      <section className="rounded-2xl border border-black/10 p-5 dark:border-white/10">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-black/50 dark:text-white/50">
          Last 7 days
        </h2>
        <div className="mt-4 flex items-end justify-between gap-2" style={{ height: 120 }}>
          {stats.last7.map((d) => {
            const done = d.due > 0 && d.done >= d.due;
            const label = dayLetters[parseDate(d.date).getDay()];
            return (
              <div key={d.date} className="flex flex-1 flex-col items-center gap-1">
                <div className="flex w-full flex-1 items-end justify-center">
                  <div
                    className="w-full max-w-8 rounded-t-md bg-black/10 dark:bg-white/10"
                    style={{ height: `${(Math.max(d.due, 1) / maxBar) * 100}%` }}
                  >
                    <div
                      className={`w-full rounded-t-md ${done ? "bg-green-500" : "bg-orange-400"}`}
                      style={{
                        height: `${d.due > 0 ? (d.done / d.due) * 100 : 0}%`,
                        marginTop: "auto",
                      }}
                    />
                  </div>
                </div>
                <span className="text-xs text-black/50 dark:text-white/50">{label}</span>
                <span className="text-xs tabular-nums text-black/40 dark:text-white/40">
                  {d.done}/{d.due}
                </span>
              </div>
            );
          })}
        </div>
      </section>

      {/* Per-task completion rate */}
      <section className="rounded-2xl border border-black/10 p-5 dark:border-white/10">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-black/50 dark:text-white/50">
          Per-task · last 12 weeks
        </h2>
        {stats.perTask.length === 0 ? (
          <p className="text-sm text-black/50 dark:text-white/50">No task history yet.</p>
        ) : (
          <ul className="space-y-3">
            {stats.perTask.map((s) => {
              const pct = s.rate == null ? 0 : Math.round(s.rate * 100);
              return (
                <li key={s.task.taskId}>
                  <Link href={`/tasks/${s.task.taskId}`} className="block group">
                    <div className="mb-1 flex items-baseline justify-between">
                      <span className="font-medium group-hover:underline">{s.task.title}</span>
                      <span className="text-sm tabular-nums text-black/55 dark:text-white/55">
                        {pct}% · {s.doneDays}/{s.dueDays}
                      </span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-black/10 dark:bg-white/10">
                      <div
                        className="h-full rounded-full bg-indigo-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
