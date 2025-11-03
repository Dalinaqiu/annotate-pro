interface AnnotatePageProps {
  params: { taskId: string };
}

export default function AnnotateTaskPage({ params }: AnnotatePageProps) {
  return (
    <main className="flex h-screen flex-col">
      <header className="border-b p-4">
        <h1 className="text-lg font-medium">Annotating task {params.taskId}</h1>
        <p className="text-sm text-muted-foreground">
          Canvas, toolbars, and collaboration sidebar will mount in this layout.
        </p>
      </header>
    </main>
  );
}
