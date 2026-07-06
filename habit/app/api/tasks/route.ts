import { NextResponse } from "next/server";
import { v4 as uuid } from "uuid";
import { getUserId } from "@/lib/session";
import { listTasks, putTask } from "@/lib/dynamodb";
import { taskInputSchema } from "@/lib/validation";
import type { Task } from "@/lib/types";

export async function GET() {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const tasks = await listTasks(userId);
  return NextResponse.json(tasks);
}

export async function POST(req: Request) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = taskInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const input = parsed.data;
  const task: Task = {
    userId,
    taskId: uuid(),
    title: input.title,
    description: input.description,
    frequency: input.frequency,
    daysOfWeek: input.daysOfWeek,
    dayOfMonth: input.dayOfMonth,
    anchorDate: input.anchorDate,
    active: input.active,
    createdAt: new Date().toISOString(),
  };

  await putTask(task);
  return NextResponse.json(task, { status: 201 });
}
