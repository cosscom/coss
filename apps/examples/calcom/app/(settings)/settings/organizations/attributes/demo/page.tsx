import {
  type AttributeItem,
  AttributesPageContent,
} from "../attributes-page-content";

const demoAttributes: AttributeItem[] = [
  {
    details: "Multi-select · 1 options",
    enabled: true,
    id: "attr_1",
    name: "test",
  },
  {
    details: "Single-select · 3 options",
    enabled: true,
    id: "attr_2",
    name: "test2",
  },
];

export default function AttributesDemoPage() {
  return <AttributesPageContent attributes={demoAttributes} />;
}
