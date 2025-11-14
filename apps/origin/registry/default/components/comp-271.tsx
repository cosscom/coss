import { CircleCheckIcon } from "lucide-react";

export default function Component() {
  return (
    <div className="rounded-md border border-eborder px-4 py-3">
      <p className="text-sm">
        <CircleCheckIcon
          className="-mt-0.5 me-3 inline-flex text-emerald-500"
          size={16}
          aria-hidden="true"
        />
        Completed successfully!
      </p>
    </div>
  );
}
