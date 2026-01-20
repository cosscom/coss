export default function GeneralSettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-semibold text-2xl tracking-tight">General</h1>
        <p className="text-muted-foreground text-sm">
          Manage your general account settings and preferences.
        </p>
      </div>

      <div className="space-y-4">
        <div className="rounded-lg border border-border bg-card p-4">
          <h2 className="font-medium text-base">Language & Region</h2>
          <p className="mt-1 text-muted-foreground text-sm">
            Configure your language and regional preferences.
          </p>
        </div>

        <div className="rounded-lg border border-border bg-card p-4">
          <h2 className="font-medium text-base">Time Zone</h2>
          <p className="mt-1 text-muted-foreground text-sm">
            Set your preferred time zone for scheduling.
          </p>
        </div>

        <div className="rounded-lg border border-border bg-card p-4">
          <h2 className="font-medium text-base">Date & Time Format</h2>
          <p className="mt-1 text-muted-foreground text-sm">
            Choose how dates and times are displayed.
          </p>
        </div>
      </div>
    </div>
  );
}
