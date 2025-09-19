"use client"

import { CodeIcon } from "lucide-react"

import CodeBlock from "@/components/code-block"
import CopyButton from "@/components/copy-button"
import { Button } from "@/registry/default/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/registry/default/ui/dialog"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/registry/default/ui/tooltip"

interface EasingUsageProps {
  easing: {
    name: string
    points: number[]
  }
  duration: number
}

export default function EasingUsage({ easing, duration }: EasingUsageProps) {
  const baseCode = `<div class="transition ease-[cubic-bezier(${easing.points.join(",")})] duration-[${duration}ms] hover:scale-105">Content to animate</div>`
  const usageCode = `<div 
  class="transition 
    ease-[cubic-bezier(${easing.points.join(",")})] 
    duration-[${duration}ms]
    hover:scale-100">
  // Content to animate 
</div>`

  return (
    <Dialog>
      <TooltipProvider delayDuration={0}>
        <Tooltip>
          <TooltipTrigger asChild>
            <span>
              <DialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-muted-foreground/80 hover:text-foreground h-7 transition-none hover:bg-transparent disabled:opacity-100"
                  aria-label="View usage"
                >
                  <CodeIcon size={16} aria-hidden={true} />
                </Button>
              </DialogTrigger>
            </span>
          </TooltipTrigger>
          <TooltipContent className="text-muted-foreground px-2 py-1 text-xs">
            View code
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <DialogContent className="sm:max-w-[700px]">
        <DialogHeader>
          <DialogTitle className="text-left">Usage</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-muted-foreground text-sm">
            Use this easing function in your Tailwind CSS classes:
          </p>
          <div className="relative">
            <CodeBlock code={usageCode} lang="html" />
            <CopyButton componentSource={baseCode} />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
