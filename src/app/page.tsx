import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-8">
      <div className="text-center space-y-6">
        <h1 className="text-4xl font-bold">ReachOut</h1>
        <p className="text-muted-foreground max-w-md">
          Build and run automated SMS and email outreach campaigns with visual
          drag-and-drop workflows.
        </p>
        <div className="flex gap-4 justify-center">
          <Link
            href="/workflows"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            View Workflows
          </Link>
        </div>
      </div>
    </main>
  );
}
