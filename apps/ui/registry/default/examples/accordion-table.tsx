import {
  Accordion,
  AccordionItem,
  AccordionPanel,
  AccordionTrigger,
} from "@/registry/default/ui/accordion"

export default function AccordionTableDemo() {
  return (
    <Accordion className="w-full" multiple={true}>
      <AccordionItem
        value="item-1"
        className="border border-b-0 first:rounded-t-lg last:rounded-b-lg last:border-b"
      >
        <AccordionTrigger className="border-none px-4 py-3">
          What is Base UI?
        </AccordionTrigger>
        <AccordionPanel className="px-4">
          Base UI is a library of high-quality unstyled React components for
          design systems and web apps.
        </AccordionPanel>
      </AccordionItem>
      <AccordionItem
        value="item-2"
        className="border border-b-0 first:rounded-t-lg last:rounded-b-lg last:border-b"
      >
        <AccordionTrigger className="border-none px-4 py-3">
          How do I get started?
        </AccordionTrigger>
        <AccordionPanel className="px-4">
          Head to the "Quick start" guide in the docs. If you've used unstyled
          libraries before, you'll feel at home.
        </AccordionPanel>
      </AccordionItem>
      <AccordionItem
        value="item-3"
        className="border border-b-0 first:rounded-t-lg last:rounded-b-lg last:border-b"
      >
        <AccordionTrigger className="border-none px-4 py-3">
          Can I use it for my project?
        </AccordionTrigger>
        <AccordionPanel className="px-4">
          Of course! Base UI is free and open source.
        </AccordionPanel>
      </AccordionItem>
    </Accordion>
  )
}
