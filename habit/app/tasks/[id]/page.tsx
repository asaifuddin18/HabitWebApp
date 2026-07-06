"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useSession } from "next-auth/react";
import type { Task, Completion } from "@/lib/types";
import { formatDate, parseDate } from "@/lib/recurrence";
import { describeSchedule } from "@/lib/describe";
import { taskHistory, perTaskStats, startOfWeekMonday, type HistoryCell } from "@/lib/stats";

const WEEKS = 12;

function shiftISO(iso: string, delta: number): string {
  const d = parseDate(iso);
  d.setDate(d.getDate() + delta);
  return formatDate(d);
}

export default function TaskDetail() {
  const params = useParams<{ id: string }>();
  const { status } = useSession();
  const [task, setTask] = useState<Task | null>(null);
  const [completions, setCompletions] = useState<Completion[]>([]);
  const [state, setState] = useState<"loading" | "ready" | "notfound">("loading");

  const todayISO = formatDate(new Date());
  const alignedStartISO = formatDate(startOfWeekMonday(parseDate(shiftISO(todayISO, -(WEEKS * 7 - 1)))));

  useEffect(() => {
    if (status !== "authenticated") return;
    Promise.all([
      fetch(`/api/tasks/${params.id}`).then((r) => {
        if (!r.ok) throw new Error();
        return r.json();
      }),
      fetch(`/api/completions?start=${alignedStartISO}&end=${todayISO}`).then((r) =>
        r.ok ? r.json() : []
      ),
    ])
      .then(([t, c]) => {
        setTask(t as Task);
        setCompletions((c as Completion[]).filter((x) => x.taskId === params.id));
        setState("ready");
      })
      .catch(() => setState("notfound"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, params.id]);

  const cells: HistoryCell[] = useMemo(
    () => (task ? taskHistory(task, completions, alignedStartISO, todayISO) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [task, completions]
  );

  const stat = useMemo(
    () => (task ? perTaskStats([task], completions, alignedStartISO, todayISO)[0] : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [task, completions]
  );

  // arrange cells into week columns (rows = Mon..Sun)
  const columns = useMemo(() => {
    const cols: HistoryCell[][] = [];
    for (const cell of cells) {
      const dow = (parseDate(cell.date).getDay() + 6) % 7; // Mon=0
      if (dow === 0 || cols.length === 0) cols.push([]);
      cols[cols.length - 1].push(cell);
    }
    return cols;
  }, [cells]);

  if (status === "loading" || state === "loading")
    return <p className="text-black/50 dark:text-white/50">Loading…</p>;
  if (state === "notfound" || !task)
    return (
      <div>
        <Link href="/tasks" className="text-sm text-black/50 hover:underline dark:text-white/50">
          ← Back to tasks
        </Link>
        <p className="mt-4 text-black/60 dark:text-white/60">Task not found.</p>
      </div>
    );

  const pct = stat?.rate == null ? null : Math.round(stat.rate * 100);
  const recent = [...completions].sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, 10);

  const cellColor = (c: HistoryCell) => {
    if (!c.due) return "bg-black/5 dark:bg-white/5";
    if (c.done) return "bg-green-500";
    if (c.date === todayISO) return "bg-orange-400/60";
    return "bg-red-400/40";
  };

  return (
    <div className="space-y-6">
      <div>
        <Link href="/tasks" className="text-sm text-black/50 hover:underline dark:text-white/50">
          ← Back to tasks
        </Link>
        <div className="mt-2 flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">{task.title}</h1>
            <p className="text-black/55 dark:text-white/55">{describeSchedule(task)}</p>
            {task.description && (
              <p className="mt-1 text-sm text-black/50 dark:text-white/50">{task.description}</p>
            )}
          </div>
          <Link
            href={`/tasks/${task.taskId}/edit`}
            className="flex-none rounded-md border border-black/15 px-3 py-1.5 text-sm hover:bg-black/5 dark:border-white/15 dark:hover:bg-white/10"
          >
            Edit
          </Link>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-2xl border border-black/10 p-4 dark:border-white/10">
          <p className="text-xs text-black/50 dark:text-white/50">Completion</p>
          <p className="mt-1 text-2xl font-bold tabular-nums">{pct == null ? "—" : `${pct}%`}</p>
        </div>
        <div className="rounded-2xl border border-black/10 p-4 dark:border-white/10">
          <p className="text-xs text-black/50 dark:text-white/50">Streak</p>
          <p className="mt-1 text-2xl font-bold tabular-nums">{stat?.currentStreak ?? 0}</p>
        </div>
        <div className="rounded-2xl border border-black/10 p-4 dark:border-white/10">
          <p className="text-xs text-black/50 dark:text-white/50">Done / due</p>
          <p className="mt-1 text-2xl font-bold tabular-nums">
            {stat?.doneDays ?? 0}
            <span className="text-base font-normal text-black/40 dark:text-white/40">
              /{stat?.dueDays ?? 0}
            </span>
          </p>
        </div>
      </div>

      {/* Heat-map */}
      <section className="rounded-2xl border border-black/10 p-5 dark:border-white/10">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-black/50 dark:text-white/50">
          Last {WEEKS} weeks
        </h2>
        <div className="flex gap-1 overflow-x-auto pb-1">
          {columns.map((col, i) => (
            <div key={i} className="flex flex-col gap-1">
              {col.map((c) => (
                <div
                  key={c.date}
                  title={`${c.date}${c.due ? (c.done ? " · done" : " · missed") : " · not due"}`}
                  className={`h-3.5 w-3.5 rounded-sm ${cellColor(c)}`}
                />
              ))}
            </div>
          ))}
        </div>
        <div className="mt-3 flex items-center gap-4 text-xs text-black/50 dark:text-white/50">
          <span className="flex items-center gap-1">
            <span className="h-3 w-3 rounded-sm bg-green-500" /> done
          </span>
          <span className="flex items-center gap-1">
            <span className="h-3 w-3 rounded-sm bg-red-400/40" /> missed
          </span>
          <span className="flex items-center gap-1">
            <span className="h-3 w-3 rounded-sm bg-black/5 dark:bg-white/5" /> not due
          </span>
        </div>
      </section>

      {/* Recent completions */}
      <section className="rounded-2xl border border-black/10 p-5 dark:border-white/10">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-black/50 dark:text-white/50">
          Recent completions
        </h2>
        {recent.length === 0 ? (
          <p className="text-sm text-black/50 dark:text-white/50">Not completed yet.</p>
        ) : (
          <ul className="space-y-1 text-sm">
            {recent.map((c) => (
              <li key={c.date} className="flex justify-between">
                <span>
                  {parseDate(c.date).toLocaleDateString(undefined, {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                  })}
                </span>
                <span className="text-black/40 dark:text-white/40">✓</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
