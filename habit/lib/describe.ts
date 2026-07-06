import type { Task } from "./types";

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const ORDINAL = (n: number): string => {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] ?? s[v] ?? s[0]);
};

/** Human-readable summary of when a task recurs, e.g. "Every Mon, Wed". */
export function describeSchedule(task: Task): string {
  switch (task.frequency) {
    case "daily":
      return "Every day";
    case "weekly": {
      const days = (task.daysOfWeek ?? []).map((d) => DAY_NAMES[d]).join(", ");
      return days ? `Every ${days}` : "Weekly";
    }
    case "biweekly": {
      const days = (task.daysOfWeek ?? []).map((d) => DAY_NAMES[d]).join(", ");
      return days ? `Every other ${days}` : "Every 2 weeks";
    }
    case "monthly":
      return task.dayOfMonth ? `Monthly on the ${ORDINAL(task.dayOfMonth)}` : "Monthly";
    default:
      return "";
  }
}
