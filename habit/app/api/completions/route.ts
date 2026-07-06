import { NextResponse } from "next/server";
import { getUserId } from "@/lib/session";
import {
  listCompletionsForDate,
  listCompletionsBetween,
  setCompletion,
  clearCompletion,
} from "@/lib/dynamodb";
import { completionInputSchema } from "@/lib/validation";

// GET /api/completions?date=YYYY-MM-DD
// GET /api/completions?start=YYYY-MM-DD&end=YYYY-MM-DD
export async function GET(req: Request) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const date = searchParams.get("date");
  const start = searchParams.get("start");
  const end = searchParams.get("end");

  if (start && end) {
    return NextResponse.json(await listCompletionsBetween(userId, start, end));
  }
  if (date) {
    return NextResponse.json(await listCompletionsForDate(userId, date));
  }
  return NextResponse.json({ error: "Provide ?date= or ?start=&end=" }, { status: 400 });
}

// POST /api/completions  { taskId, date, completed }
// Toggles a per-date check-off on or off.
export async function POST(req: Request) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = completionInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { taskId, date, completed } = parsed.data;
  if (completed) {
    await setCompletion(userId, taskId, date);
  } else {
    await clearCompletion(userId, taskId, date);
  }
  return NextResponse.json({ ok: true, taskId, date, completed });
}
