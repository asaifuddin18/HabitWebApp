import { NextResponse } from "next/server";
import { getUserId } from "@/lib/session";
import { getTask, putTask, deleteTask } from "@/lib/dynamodb";
import { taskInputSchema } from "@/lib/validation";
import type { Task } from "@/lib/types";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Ctx) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const task = await getTask(userId, id);
  if (!task) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(task);
}

export async function PUT(req: Request, { params }: Ctx) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const existing = await getTask(userId, id);
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

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
    ...existing,
    title: input.title,
    description: input.description,
    frequency: input.frequency,
    daysOfWeek: input.daysOfWeek,
    dayOfMonth: input.dayOfMonth,
    anchorDate: input.anchorDate,
    active: input.active,
  };

  await putTask(task);
  return NextResponse.json(task);
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  await deleteTask(userId, id);
  return NextResponse.json({ ok: true });
}
