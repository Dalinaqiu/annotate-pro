"use client";
import { useMemo, useState } from "react";

type Task = {
  id: string;
  title: string;
  status: Status;
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  assignedToId: string | null;
  dataItem?: { sourceUri?: string | null } | null;
};

type Status = "PENDING" | "IN_PROGRESS" | "DONE" | "TO_REVIEW" | "APPROVED" | "REJECTED";

type Columns = Record<Status, Task[]>;

const STATUS_ORDER: Status[] = ["PENDING", "IN_PROGRESS", "DONE", "TO_REVIEW", "APPROVED", "REJECTED"];
const STATUS_LABEL: Record<Status, string> = {
  PENDING: "待标注",
  IN_PROGRESS: "进行中",
  DONE: "已完成",
  TO_REVIEW: "待审核",
  APPROVED: "审核通过",
  REJECTED: "驳回",
};

export function TaskBoard(props: { initial: Task[]; projectId: string }) {
  const [columns, setColumns] = useState<Columns>(() => {
    const col: Columns = { PENDING: [], IN_PROGRESS: [], DONE: [], TO_REVIEW: [], APPROVED: [], REJECTED: [] };
    for (const t of props.initial) col[t.status].push(t);
    return col;
  });
  const [busy, setBusy] = useState<string | null>(null);

  async function handleDrop(e: React.DragEvent<HTMLDivElement>, to: Status) {
    e.preventDefault();
    const taskId = e.dataTransfer.getData("text/plain");
    if (!taskId) return;
    const from = STATUS_ORDER.find((s) => columns[s].some((t) => t.id === taskId));
    if (!from || from === to) return;
    try {
      setBusy(taskId);
      const res = await fetch("/api/tasks/change-status", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ taskId, to }),
      });
      if (!res.ok) throw new Error(await res.text());
      setColumns((prev) => {
        const next: Columns = { PENDING: [], IN_PROGRESS: [], DONE: [], TO_REVIEW: [], APPROVED: [], REJECTED: [] };
        for (const s of STATUS_ORDER) next[s] = prev[s].filter((t) => t.id !== taskId);
        const moved = prev[from].find((t) => t.id === taskId);
        if (moved) next[to] = [{ ...moved, status: to }, ...prev[to]];
        return next;
      });
    } catch (err) {
      console.error(err);
      alert("状态更新失败：" + (err as Error).message);
    } finally {
      setBusy(null);
    }
  }

  function onDragStart(e: React.DragEvent<HTMLDivElement>, taskId: string) {
    e.dataTransfer.setData("text/plain", taskId);
    e.dataTransfer.effectAllowed = "move";
  }

  return (
    <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
      {STATUS_ORDER.map((s) => (
        <div key={s} className="flex flex-col rounded border bg-white">
          <div className="flex items-center justify-between border-b px-3 py-2 text-sm font-medium">
            <span>{STATUS_LABEL[s]}</span>
            <span className="text-muted-foreground">{columns[s].length}</span>
          </div>
          <div
            className="min-h-40 flex-1 p-2"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => handleDrop(e, s)}
          >
            {columns[s].map((t) => (
              <div
                key={t.id}
                draggable
                onDragStart={(e) => onDragStart(e, t.id)}
                className={`mb-2 cursor-move rounded border p-2 text-sm shadow-sm ${busy === t.id ? "opacity-50" : ""}`}
                title={t.dataItem?.sourceUri ?? ""}
              >
                <div className="font-medium">{t.title}</div>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>优先级: {t.priority}</span>
                  <span>指派: {t.assignedToId ?? "-"}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

