import { cn } from "@coss/ui/lib/utils";
import {
  Bookmark,
  ChevronsUpDown,
  CornerDownLeft,
  Folder,
  GitBranch,
  SlidersHorizontal,
} from "lucide-react";
import type { ReactNode } from "react";

/**
 * Shipyard's ⌘N "New task" box, drawn as it looks in the app (always its dark window, whatever the
 * site's theme) to sit over the harbour in a banner. Decorative: a picture of the app, not a form.
 */
export function ShipyardNewTask({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "w-[min(34rem,90%)] select-none rounded-2xl bg-[#1c1c1e]/90 text-[#e6e6e6] shadow-[0_24px_80px_rgba(0,0,0,0.55)] ring-1 ring-white/10 backdrop-blur-md",
        className,
      )}
    >
      <div className="px-5 pt-4">
        <p className="font-medium text-[15px]">New task</p>
        <p className="mt-1 text-[12.5px] text-[#9a9a9f] leading-snug">
          One agent is a task; pick several to try it several ways. No agent makes the worktree
          alone.
        </p>
      </div>
      <div className="mt-3 flex items-center gap-3 px-5 text-[12.5px]">
        <span className="rounded-md bg-white/10 px-2 py-0.5 font-medium">New task</span>
        <span className="text-[#9a9a9f]">
          Running agents <span className="ml-1 tabular-nums">9</span>
        </span>
        <span className="ml-auto flex items-center gap-3 text-[#9a9a9f]">
          <Bookmark className="size-4" strokeWidth={1.75} />
          <SlidersHorizontal className="size-4" strokeWidth={1.75} />
        </span>
      </div>
      <div className="mx-4 mt-3 h-24 rounded-xl bg-[#111113] px-3.5 py-2.5 text-[13px] ring-1 ring-white/10">
        Fix webhook retries
      </div>
      <div className="mt-2.5 flex flex-wrap items-center gap-1 px-4 text-[13px]">
        <Chip icon={<Folder className="size-3.5" strokeWidth={1.75} />} muted>
          shop
        </Chip>
        <Chip icon={<span className="size-1.5 rounded-full bg-emerald-400" />} muted>
          devl
        </Chip>
        <Chip icon={<GitBranch className="size-3.5" strokeWidth={1.75} />} muted>
          New worktree
        </Chip>
        <Chip className="ml-auto" icon={<span className="font-semibold text-amber-500">✱</span>}>
          Claude Code
        </Chip>
        <span className="ml-1 inline-flex h-7 items-center gap-1.5 rounded-lg bg-white/15 px-2.5 text-[#e6e6e6]">
          <span className="size-3 rounded-full border-2 border-[#e6e6e6] border-r-transparent" />
          <CornerDownLeft className="size-3.5" strokeWidth={2} />
        </span>
      </div>
      <div className="mt-3 flex items-center gap-4 border-white/10 border-t px-5 py-2.5 text-[#8a8a8f] text-[12px]">
        <span>⇧↵ new line</span>
        <span>esc close</span>
        <span className="ml-auto flex items-center gap-2">
          <span className="relative h-4 w-7 rounded-full bg-white/15">
            <span className="absolute top-0.5 left-0.5 size-3 rounded-full bg-[#c8c8cc]" />
          </span>
          Start more
        </span>
      </div>
    </div>
  );
}

function Chip({
  icon,
  muted,
  className,
  children,
}: {
  icon: ReactNode;
  muted?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex h-7 items-center gap-1.5 rounded-lg px-2",
        muted ? "text-[#b4b4b9]" : "font-medium text-[#e6e6e6]",
        className,
      )}
    >
      {icon}
      {children}
      <ChevronsUpDown className="size-3 text-[#8a8a8f]" strokeWidth={1.75} />
    </span>
  );
}
