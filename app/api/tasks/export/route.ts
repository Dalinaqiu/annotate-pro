import { NextResponse } from "next/server";
import { exportTasksCsv } from "@/server/repositories/tasks";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const projectId = searchParams.get("projectId") ?? undefined;
  const datasetId = searchParams.get("datasetId") ?? undefined;
  const status = searchParams.getAll("status") as any[];

  const csv = await exportTasksCsv({ projectId, datasetId, status: status.length ? (status as any) : undefined });
  return new NextResponse(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="tasks_export${projectId ? `_${projectId}` : ""}.csv"`,
    },
  });
}

