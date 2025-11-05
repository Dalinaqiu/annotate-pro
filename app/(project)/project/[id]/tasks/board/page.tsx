import { listTasks } from "@/server/repositories/tasks";
import { TaskBoard } from "@/components/tasks/TaskBoard";

interface PageProps { params: { id: string } }

export default async function ProjectTasksBoardPage({ params }: PageProps) {
  const projectId = params.id;
  const { items } = await listTasks({ projectId, take: 200 });
  // Map to client-safe shape
  const initial = items.map((t) => ({
    id: t.id,
    title: t.title,
    status: t.status as any,
    priority: t.priority as any,
    assignedToId: t.assignedToId,
    dataItem: t.dataItem ? { sourceUri: t.dataItem.sourceUri } : undefined,
  }));

  return (
    <main className="space-y-6 p-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Project #{projectId} · Board</h1>
          <p className="text-sm text-muted-foreground">Drag tasks across columns to change status.</p>
        </div>
        <nav className="space-x-4 text-sm">
          <a href={`/project/${projectId}/tasks`} className="underline">List</a>
          <a href={`/project/${projectId}/tasks/board`} className="underline">Board</a>
        </nav>
      </header>

      <TaskBoard initial={initial as any} projectId={projectId} />
    </main>
  );
}

