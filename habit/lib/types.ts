export type Frequency = "daily" | "weekly" | "biweekly" | "monthly";

export interface Task {
  userId: string;
  taskId: string;
  title: string;
  description?: string;
  frequency: Frequency;
  /** weekly + biweekly: days the task recurs on. 0 = Sunday … 6 = Saturday. */
  daysOfWeek?: number[];
  /** monthly: day of month (1–31, clamped to the month's length). */
  dayOfMonth?: number;
  /** biweekly: ISO date (YYYY-MM-DD) the 2-week cycle is anchored to. */
  anchorDate?: string;
  active: boolean;
  createdAt: string;
}

export interface Completion {
  userId: string;
  /** Sort key: `${date}#${taskId}`. Range-query a day with begins_with(date). */
  sk: string;
  taskId: string;
  /** YYYY-MM-DD */
  date: string;
  completedAt: string;
}

/** A task plus whether it's been completed for the date being viewed. */
export type TaskWithStatus = Task & { completed: boolean };
