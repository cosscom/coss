export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-[60dvh] max-w-md flex-col justify-center gap-2 p-6">
      <h1 className="font-semibold text-xl">Not found</h1>
      <p className="text-muted-foreground text-sm">
        No project, person or Prompt Request lives at this address.
      </p>
    </main>
  );
}
