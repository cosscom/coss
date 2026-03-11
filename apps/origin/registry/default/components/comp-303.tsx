import { EclipseIcon } from "lucide-react";

export default function Component() {
  return (
    <div className="dark bg-muted px-4 py-3 text-foreground">
      <p className="text-center text-sm">
        <EclipseIcon
          aria-hidden="true"
          className="me-3 -mt-0.5 inline-flex opacity-60"
          size={16}
        />
        Get the most out of your app with real-time updates and analytics{" "}
        <span className="text-muted-foreground">·</span>{" "}
        <a className="font-medium underline hover:no-underline" href="#">
          Upgrade
        </a>
      </p>
    </div>
  );
}
