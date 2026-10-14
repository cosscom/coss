export default function Home() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-2 p-6">
      <h1 className="font-semibold text-xl">Webhooks portal</h1>
      <p className="text-muted-foreground text-sm">
        Open this portal from the product you use: it gives you a link to manage your webhook
        endpoints.
      </p>
    </main>
  );
}
