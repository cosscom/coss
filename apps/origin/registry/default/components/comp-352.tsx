import { ChevronDownIcon } from "lucide-react";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/registry/default/ui/accordion";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/registry/default/ui/collapsible";

const items = [
  {
    id: "1",
    title: "What makes coss ui different?",
    collapsibles: [
      {
        title: "What about performance?",
        content:
          "We optimize every component for maximum performance and minimal bundle size.",
      },
      {
        title: "How is the documentation?",
        content:
          "Our documentation is comprehensive and includes live examples for every component.",
      },
    ],
  },
  {
    id: "2",
    title: "How can I customize the components?",
    collapsibles: [
      {
        title: "Can I use custom themes?",
        content:
          "Yes, our theming system is fully customizable and supports both light and dark modes.",
      },
      {
        title: "What about Tailwind support?",
        content:
          "We have first-class support for Tailwind CSS with custom utility classes.",
      },
    ],
  },
  {
    id: "3",
    title: "Is coss ui optimized for performance?",
    collapsibles: [
      {
        title: "What's the bundle size impact?",
        content:
          "Our components are tree-shakeable and typically add minimal overhead to your bundle.",
        open: true,
      },
      {
        title: "How is code splitting handled?",
        content:
          "We support automatic code splitting for optimal loading performance.",
      },
    ],
  },
  {
    id: "4",
    title: "How accessible are the components?",
    collapsibles: [
      {
        title: "Which screen readers are supported?",
        content:
          "We test with NVDA, VoiceOver, and JAWS to ensure broad compatibility.",
      },
      {
        title: "What about keyboard navigation?",
        content:
          "Full keyboard navigation support is implemented following WAI-ARIA best practices.",
      },
    ],
  },
];

export default function Component() {
  return (
    <div className="space-y-4">
      <h2 className="font-bold text-xl">Multi-level</h2>
      <Accordion
        className="-space-y-px w-full"
        collapsible
        defaultValue="3"
        type="single"
      >
        {items.map((item) => (
          <AccordionItem
            className="relative border bg-background outline-none first:rounded-t-md last:rounded-b-md last:border-b has-focus-visible:z-10 has-focus-visible:border-ring has-focus-visible:ring-[3px] has-focus-visible:ring-ring/50"
            key={item.id}
            value={item.id}
          >
            <AccordionTrigger className="rounded-md px-4 py-3 text-[15px] leading-6 outline-none hover:no-underline focus-visible:ring-0">
              {item.title}
            </AccordionTrigger>
            <AccordionContent className="p-0">
              {item.collapsibles.map((collapsible, _index) => (
                <CollapsibleDemo
                  content={collapsible.content}
                  key={collapsible.title}
                  open={collapsible.open}
                  title={collapsible.title}
                />
              ))}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
}

function CollapsibleDemo({
  title,
  content,
  open,
}: {
  title: string;
  content: string;
  open?: boolean;
}) {
  return (
    <Collapsible className="border-t bg-accent px-4 py-3" defaultOpen={open}>
      <CollapsibleTrigger className="flex gap-2 font-semibold text-[15px] leading-6 [&[data-state=open]>svg]:rotate-180">
        <ChevronDownIcon
          aria-hidden="true"
          className="mt-1 shrink-0 opacity-60 transition-transform duration-200"
          size={16}
        />
        {title}
      </CollapsibleTrigger>
      <CollapsibleContent className="mt-1 overflow-hidden ps-6 text-muted-foreground text-sm transition-all data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down">
        {content}
      </CollapsibleContent>
    </Collapsible>
  );
}
