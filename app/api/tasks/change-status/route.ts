import { NextResponse } from "next/server";
import { changeTaskStatus } from "@/server/repositories/tasks";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { taskId, to } = body as { taskId?: string; to?: string };
    if (!taskId || !to) return NextResponse.json({ error: "taskId/to required" }, { status: 400 });
    const allowed = ["PENDING","IN_PROGRESS","DONE","TO_REVIEW","APPROVED","REJECTED"] as const;
    if (!allowed.includes(to as any)) return NextResponse.json({ error: "invalid status" }, { status: 400 });
    const updated = await changeTaskStatus(taskId, to as any);
    return NextResponse.json({ ok: true, task: { id: updated.id, status: updated.status } });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? "unknown error" }, { status: 400 });
  }
}

