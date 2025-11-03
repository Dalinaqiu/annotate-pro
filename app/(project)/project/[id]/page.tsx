interface ProjectPageProps {
  params: { id: string };
}

export default function ProjectPage({ params }: ProjectPageProps) {
  return (
    <main className="space-y-6 p-6">
      <header>
        <h1 className="text-2xl font-semibold">Project #{params.id}</h1>
        <p className="text-sm text-muted-foreground">
          Tabs for tasks, members, and settings will mount here.
        </p>
      </header>
    </main>
  );
}
