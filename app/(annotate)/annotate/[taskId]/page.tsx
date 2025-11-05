import { getTaskWithItem } from "@/server/repositories/tasks";
import { AnnotateShell } from "@/components/annotate/AnnotateShell";
import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth";

interface AnnotatePageProps { params: { taskId: string } }

export default async function AnnotateTaskPage({ params }: AnnotatePageProps) {
  const [task, session] = await Promise.all([
    getTaskWithItem(params.taskId),
    getServerSession(authOptions as any),
  ]);
  return (
    <main className="flex h-screen flex-col">
      <div className="flex-1">
        <AnnotateShell
          taskId={params.taskId}
          userId={(session?.user as any)?.id ?? null}
          sourceUri={task?.dataItem?.sourceUri ?? undefined}
          mimeType={task?.dataItem?.mimeType ?? undefined}
        />
      </div>
    </main>
  );
}
