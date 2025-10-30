import { ScrollArea } from "@/registry/default/ui/scroll-area"

const tags = Array.from({ length: 50 }, (_, i) => `v1.0.0-alpha.${i}`)

export default function ScrollAreaDemo() {
  return (
    <ScrollArea className="h-64 rounded-md border">
      <div className="px-4 py-2">
        <h4 className="mb-2 text-sm font-medium">Tags</h4>
        <div className="flex flex-col gap-1">
          {tags.map((tag) => (
            <div key={tag} className="text-sm">
              {tag}
            </div>
          ))}
        </div>
      </div>
    </ScrollArea>
  )
}
