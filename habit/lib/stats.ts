import type { Task, Completion } from "./types";
import { isTaskDueOn, parseDate, formatDate } from "./recurrence";

/** Inclusive list of YYYY-MM-DD strings from start to end. */
export function eachDay(startISO: string, endISO: string): string[] {
  const out: string[] = [];
  const end = parseDate(endISO);
  const d = parseDate(startISO);
  while (d <= end) {
    out.push(formatDate(d));
    d.setDate(d.getDate() + 1);
  }
  return out;
}

/** Monday-based start of the week containing d (local). */
export function startOfWeekMonday(d: Date): Date {
  const s = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const dow = (s.getDay() + 6) % 7; // Mon=0 … Sun=6
  s.setDate(s.getDate() - dow);
  return s;
}

export interface DayStat {
  date: string;
  due: number;
  done: number;
}

/** Map date -> set of taskIds completed that date. */
function completionIndex(completions: Completion[]): Map<string, Set<string>> {
  const m = new Map<string, Set<string>>();
  for (const c of completions) {
    let set = m.get(c.date);
    if (!set) m.set(c.date, (set = new Set()));
    set.add(c.taskId);
  }
  return m;
}

/** Per-day due/done counts across an inclusive date range. */
export function buildDayStats(
  tasks: Task[],
  completions: Completion[],
  startISO: string,
  endISO: string
): DayStat[] {
  const idx = completionIndex(completions);
  return eachDay(startISO, endISO).map((dateStr) => {
    const d = parseDate(dateStr);
    const dueTasks = tasks.filter((t) => isTaskDueOn(t, d));
    const doneSet = idx.get(dateStr);
    const done = doneSet ? dueTasks.filter((t) => doneSet.has(t.taskId)).length : 0;
    return { date: dateStr, due: dueTasks.length, done };
  });
}

export interface Totals {
  due: number;
  done: number;
  /** 0–1, or null if nothing was due. */
  rate: number | null;
}

export function sumTotals(days: DayStat[]): Totals {
  const due = days.reduce((a, s) => a + s.due, 0);
  const done = days.reduce((a, s) => a + s.done, 0);
  return { due, done, rate: due > 0 ? done / due : null };
}

/**
 * Streaks over the given day stats (ascending, ending today).
 *
 * A day "counts" only if it had at least one task due; it's "complete" when all
 * due tasks were done. Days with nothing due are ignored (they neither extend
 * nor break a streak). If today has due tasks not yet finished, the current
 * streak is measured through yesterday rather than being reset to zero.
 */
export function computeStreaks(days: DayStat[]): { current: number; best: number } {
  const relevant = days
    .filter((s) => s.due > 0)
    .map((s) => ({ date: s.date, complete: s.done === s.due }));

  let best = 0;
  let run = 0;
  for (const d of relevant) {
    if (d.complete) {
      run += 1;
      best = Math.max(best, run);
    } else {
      run = 0;
    }
  }

  const todayISO = formatDate(new Date());
  let idx = relevant.length - 1;
  if (idx >= 0 && relevant[idx].date === todayISO && !relevant[idx].complete) {
    idx -= 1; // today still pending — don't let it break the streak
  }
  let current = 0;
  for (let i = idx; i >= 0; i--) {
    if (relevant[i].complete) current += 1;
    else break;
  }

  return { current, best };
}

export interface TaskStat {
  task: Task;
  dueDays: number;
  doneDays: number;
  rate: number | null;
  currentStreak: number;
}

/** Per-task completion stats across a range (clamped to the task's creation). */
export function perTaskStats(
  tasks: Task[],
  completions: Completion[],
  startISO: string,
  endISO: string
): TaskStat[] {
  const idx = completionIndex(completions);
  const todayISO = formatDate(new Date());

  return tasks.map((task) => {
    const createdISO = task.createdAt ? task.createdAt.slice(0, 10) : startISO;
    const rangeStart = createdISO > startISO ? createdISO : startISO;

    const dueDates: { date: string; done: boolean }[] = [];
    for (const dateStr of eachDay(rangeStart, endISO)) {
      if (isTaskDueOn(task, parseDate(dateStr))) {
        dueDates.push({ date: dateStr, done: idx.get(dateStr)?.has(task.taskId) ?? false });
      }
    }

    const dueDays = dueDates.length;
    const doneDays = dueDates.filter((d) => d.done).length;

    // current per-task streak, tolerating a still-pending today
    let end = dueDates.length - 1;
    if (end >= 0 && dueDates[end].date === todayISO && !dueDates[end].done) end -= 1;
    let currentStreak = 0;
    for (let i = end; i >= 0; i--) {
      if (dueDates[i].done) currentStreak += 1;
      else break;
    }

    return {
      task,
      dueDays,
      doneDays,
      rate: dueDays > 0 ? doneDays / dueDays : null,
      currentStreak,
    };
  });
}

/** Whether a given date had the task due, and whether it was completed. */
export interface HistoryCell {
  date: string;
  due: boolean;
  done: boolean;
}

/** Per-task day-by-day history for a range (used by the heat-map). */
export function taskHistory(
  task: Task,
  completions: Completion[],
  startISO: string,
  endISO: string
): HistoryCell[] {
  const doneDates = new Set(
    completions.filter((c) => c.taskId === task.taskId).map((c) => c.date)
  );
  return eachDay(startISO, endISO).map((dateStr) => ({
    date: dateStr,
    due: isTaskDueOn(task, parseDate(dateStr)),
    done: doneDates.has(dateStr),
  }));
}
