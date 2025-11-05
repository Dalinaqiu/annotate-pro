import { listTasks, bulkChangeStatus, assignTasksRoundRobin, assignTasksLeastLoad, unassignTasks, deleteTasks } from "@/server/repositories/tasks";
import { revalidatePath } from "next/cache";

interface PageProps { params: { id: string } }

export default async function ProjectTasksPage({ params }: PageProps) {
  const projectId = params.id;
  const { items } = await listTasks({ projectId, take: 100 });

  async function onBulkAction(formData: FormData) {
    "use server";
    const action = String(formData.get("action"));
    const ids = (formData.getAll("taskIds") as string[]) ?? [];
    const userIdsRaw = (formData.get("userIds") as string | null) ?? "";
    const userIds = userIdsRaw.split(",").map((s) => s.trim()).filter(Boolean);

    switch (action) {
      case "to_in_progress":
        await bulkChangeStatus(ids, "IN_PROGRESS");
        break;
      case "to_done":
        await bulkChangeStatus(ids, "DONE");
        break;
      case "to_to_review":
        await bulkChangeStatus(ids, "TO_REVIEW");
        break;
      case "to_approved":
        await bulkChangeStatus(ids, "APPROVED");
        break;
      case "to_rejected":
        await bulkChangeStatus(ids, "REJECTED");
        break;
      case "assign_rr":
        await assignTasksRoundRobin(ids, userIds);
        break;
      case "assign_ll":
        await assignTasksLeastLoad(ids, userIds);
        break;
      case "unassign":
        await unassignTasks(ids);
        break;
      case "delete":
        await deleteTasks(ids);
        break;
    }
    revalidatePath(`/project/${projectId}/tasks`);
  }

  return (
    <main className="space-y-6 p-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Project #{projectId} · Tasks</h1>
          <p className="text-sm text-muted-foreground">List, bulk actions, assignment, and export.</p>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <a className="underline" href={`/project/${projectId}/tasks/board`}>Board</a>
          <a className="underline" href={`/api/tasks/export?projectId=${projectId}`}>Export CSV</a>
        </div>
      </header>

      <form action={onBulkAction} className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <select name="action" className="border px-2 py-1 rounded">
            <option value="to_in_progress">标记进行中</option>
            <option value="to_done">标记已完成</option>
            <option value="to_to_review">提交审核</option>
            <option value="to_approved">审核通过</option>
            <option value="to_rejected">驳回</option>
            <option value="assign_rr">分配（轮询）</option>
            <option value="assign_ll">分配（最小负载）</option>
            <option value="unassign">取消分配</option>
            <option value="delete">删除</option>
          </select>
          <input name="userIds" placeholder="userId1,userId2" className="border px-2 py-1 rounded w-64" />
          <button type="submit" className="bg-black text-white px-3 py-1 rounded">应用</button>
        </div>

        <div className="overflow-auto rounded border">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="p-2 text-left"><span>选择</span></th>
                <th className="p-2 text-left">标题</th>
                <th className="p-2 text-left">状态</th>
                <th className="p-2 text-left">优先级</th>
                <th className="p-2 text-left">指派</th>
                <th className="p-2 text-left">数据项</th>
                <th className="p-2 text-left">创建时间</th>
              </tr>
            </thead>
            <tbody>
              {items.map((t) => (
                <tr key={t.id} className="border-t">
                  <td className="p-2 align-top">
                    <input type="checkbox" name="taskIds" value={t.id} />
                  </td>
                  <td className="p-2 align-top">{t.title}</td>
                  <td className="p-2 align-top">{t.status}</td>
                  <td className="p-2 align-top">{t.priority}</td>
                  <td className="p-2 align-top">{t.assignedToId ?? "-"}</td>
                  <td className="p-2 align-top">
                    <div className="max-w-[360px] truncate" title={t.dataItem?.sourceUri ?? ""}>{t.dataItem?.sourceUri ?? ""}</div>
                  </td>
                  <td className="p-2 align-top">{new Date(t.createdAt).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </form>
    </main>
  );
}
