"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Frequency, Task } from "@/lib/types";
import { formatDate } from "@/lib/recurrence";

const DAYS = [
  { label: "Sun", value: 0 },
  { label: "Mon", value: 1 },
  { label: "Tue", value: 2 },
  { label: "Wed", value: 3 },
  { label: "Thu", value: 4 },
  { label: "Fri", value: 5 },
  { label: "Sat", value: 6 },
];

export default function TaskForm({ existing }: { existing?: Task }) {
  const router = useRouter();
  const [title, setTitle] = useState(existing?.title ?? "");
  const [description, setDescription] = useState(existing?.description ?? "");
  const [frequency, setFrequency] = useState<Frequency>(existing?.frequency ?? "daily");
  const [daysOfWeek, setDaysOfWeek] = useState<number[]>(existing?.daysOfWeek ?? []);
  const [dayOfMonth, setDayOfMonth] = useState<number>(existing?.dayOfMonth ?? 1);
  const [anchorDate, setAnchorDate] = useState<string>(
    existing?.anchorDate ?? formatDate(new Date())
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const needsDays = frequency === "weekly" || frequency === "biweekly";

  const toggleDay = (d: number) =>
    setDaysOfWeek((prev) =>
      prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d].sort()
    );

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const payload = {
      title,
      description: description || undefined,
      frequency,
      daysOfWeek: needsDays ? daysOfWeek : undefined,
      dayOfMonth: frequency === "monthly" ? dayOfMonth : undefined,
      anchorDate: frequency === "biweekly" ? anchorDate : undefined,
      active: existing?.active ?? true,
    };

    const res = await fetch(existing ? `/api/tasks/${existing.taskId}` : "/api/tasks", {
      method: existing ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    setSaving(false);
    if (!res.ok) {
      setError("Couldn't save the task. Check the fields and try again.");
      return;
    }
    router.push("/tasks");
    router.refresh();
  };

  const inputCls =
    "w-full rounded-md border border-black/15 bg-transparent px-3 py-2 outline-none focus:border-black/40 dark:border-white/15 dark:focus:border-white/40";

  return (
    <form onSubmit={submit} className="space-y-5">
      <div>
        <label className="mb-1 block text-sm font-medium">Title</label>
        <input
          className={inputCls}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Meditate"
          required
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">Description (optional)</label>
        <input
          className={inputCls}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Any notes"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">Frequency</label>
        <select
          className={inputCls}
          value={frequency}
          onChange={(e) => setFrequency(e.target.value as Frequency)}
        >
          <option value="daily">Daily</option>
          <option value="weekly">Weekly</option>
          <option value="biweekly">Biweekly (every 2 weeks)</option>
          <option value="monthly">Monthly</option>
        </select>
      </div>

      {needsDays && (
        <div>
          <label className="mb-1 block text-sm font-medium">On which days?</label>
          <div className="flex flex-wrap gap-2">
            {DAYS.map((d) => (
              <button
                type="button"
                key={d.value}
                onClick={() => toggleDay(d.value)}
                className={`rounded-full px-3 py-1 text-sm border ${
                  daysOfWeek.includes(d.value)
                    ? "border-black bg-black text-white dark:border-white dark:bg-white dark:text-black"
                    : "border-black/20 dark:border-white/20"
                }`}
              >
                {d.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {frequency === "biweekly" && (
        <div>
          <label className="mb-1 block text-sm font-medium">Starting the week of</label>
          <input
            type="date"
            className={inputCls}
            value={anchorDate}
            onChange={(e) => setAnchorDate(e.target.value)}
          />
          <p className="mt-1 text-xs text-black/50 dark:text-white/50">
            The 2-week cycle is counted from this date.
          </p>
        </div>
      )}

      {frequency === "monthly" && (
        <div>
          <label className="mb-1 block text-sm font-medium">Day of month</label>
          <input
            type="number"
            min={1}
            max={31}
            className={inputCls}
            value={dayOfMonth}
            onChange={(e) => setDayOfMonth(Number(e.target.value))}
          />
          <p className="mt-1 text-xs text-black/50 dark:text-white/50">
            Days past the end of a short month fall on that month&apos;s last day.
          </p>
        </div>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={saving}
          className="rounded-md bg-black px-4 py-2 text-white disabled:opacity-50 dark:bg-white dark:text-black"
        >
          {saving ? "Saving…" : existing ? "Save changes" : "Create task"}
        </button>
        <button
          type="button"
          onClick={() => router.push("/tasks")}
          className="rounded-md px-4 py-2 text-black/60 hover:bg-black/5 dark:text-white/60 dark:hover:bg-white/10"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
