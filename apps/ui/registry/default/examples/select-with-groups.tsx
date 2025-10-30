import {
  Select,
  SelectGroup,
  SelectGroupLabel,
  SelectItem,
  SelectPopup,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/registry/default/ui/select"

const placeholder = [{ label: "Select framework", value: null }]

const frontend = [
  { label: "Next.js", value: "next" },
  { label: "Vite", value: "vite" },
  { label: "Astro", value: "astro" },
]

const backend = [
  { label: "Express", value: "express" },
  { label: "NestJS", value: "nestjs" },
  { label: "Fastify", value: "fastify" },
  { label: "Django", value: "django" },
  { label: "Flask", value: "flask" },
  { label: "Rails", value: "rails" },
]

export default function SelectWithGroups() {
  return (
    <Select items={[...placeholder, ...frontend, ...backend]}>
      <SelectTrigger>
        <SelectValue />
      </SelectTrigger>
      <SelectPopup>
        <SelectGroup>
          <SelectGroupLabel>Frontend</SelectGroupLabel>
          {frontend.map(({ label, value }) => (
            <SelectItem key={value} value={value}>
              {label}
            </SelectItem>
          ))}
        </SelectGroup>
        <SelectSeparator />
        <SelectGroup>
          <SelectGroupLabel>Backend</SelectGroupLabel>
          {backend.map(({ label, value }) => (
            <SelectItem key={value} value={value}>
              {label}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectPopup>
    </Select>
  )
}
