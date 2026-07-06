"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import TaskForm from "../../../components/TaskForm";
import type { Task } from "@/lib/types";

export default function EditTask() {
  const params = useParams<{ id: string }>();
  const [task, setTask] = useState<Task | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "notfound">("loading");

  useEffect(() => {
    fetch(`/api/tasks/${params.id}`)
      .then((res) => {
        if (!res.ok) throw new Error();
        return res.json();
      })
      .then((t: Task) => {
        setTask(t);
        setState("ready");
      })
      .catch(() => setState("notfound"));
  }, [params.id]);

  return (
    <div>
      <Link href="/tasks" className="text-sm text-black/50 hover:underline dark:text-white/50">
        ← Back to tasks
      </Link>
      <h1 className="mb-4 mt-2 text-xl font-semibold">Edit task</h1>
      {state === "loading" && <p className="text-black/50 dark:text-white/50">Loading…</p>}
      {state === "notfound" && <p className="text-black/60 dark:text-white/60">Task not found.</p>}
      {state === "ready" && task && <TaskForm existing={task} />}
    </div>
  );
}
