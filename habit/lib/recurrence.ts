import type { Task } from "./types";

/** Parse a YYYY-MM-DD string into a Date at local midnight. */
export function parseDate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

/** Format a Date as YYYY-MM-DD in local time. */
export function formatDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Local midnight of the Sunday that starts the week containing `d`. */
function startOfWeek(d: Date): Date {
  const s = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  s.setDate(s.getDate() - s.getDay());
  return s;
}

const MS_PER_WEEK = 7 * 24 * 60 * 60 * 1000;

/** Number of days in the month containing `d`. */
function daysInMonth(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
}

/**
 * Whether a recurring `task` is due on the given calendar date.
 *
 *  - daily:    every day
 *  - weekly:   on the configured days of week
 *  - biweekly: on the configured days of week, but only every other week,
 *              measured from `anchorDate`
 *  - monthly:  on `dayOfMonth`, clamped to the last day of shorter months
 *              (e.g. a "31st" task fires on Feb 28/29)
 */
export function isTaskDueOn(task: Task, date: Date): boolean {
  if (!task.active) return false;

  switch (task.frequency) {
    case "daily":
      return true;

    case "weekly":
      return (task.daysOfWeek ?? []).includes(date.getDay());

    case "biweekly": {
      if (!(task.daysOfWeek ?? []).includes(date.getDay())) return false;
      const anchor = task.anchorDate ? parseDate(task.anchorDate) : date;
      const weeks = Math.round(
        (startOfWeek(date).getTime() - startOfWeek(anchor).getTime()) / MS_PER_WEEK
      );
      return weeks % 2 === 0;
    }

    case "monthly": {
      const target = Math.min(task.dayOfMonth ?? 1, daysInMonth(date));
      return date.getDate() === target;
    }

    default:
      return false;
  }
}

/** Filter a task list down to those due on `date`. */
export function tasksDueOn(tasks: Task[], date: Date): Task[] {
  return tasks.filter((t) => isTaskDueOn(t, date));
}
