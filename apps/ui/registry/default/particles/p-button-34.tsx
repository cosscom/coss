import { Button } from "@/registry/default/ui/button";

export default function Particle() {
  return (
    <Button variant="outline">
      <span className="relative flex size-2">
        <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-75" />
        <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
      </span>
      Online
    </Button>
  );
}
