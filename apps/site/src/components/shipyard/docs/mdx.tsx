import { BookOpen, Compass, FileCode, Terminal } from "lucide-react";
import type { MDXComponents } from "mdx/types";
import { getMDXComponents } from "@/components/mdx";
import { Diagram, DiagramEdge, DiagramGroup, DiagramNode } from "./diagram";
import { Scene } from "./scenes";
import { Shot } from "./shot";
import { Stage } from "./stage";

/**
 * Components available in every Shipyard docs page without an import: the site's (coss ui's
 * typography, callouts and cards, Fumadocs' tabs and steps), with Shipyard's own pieces in front
 * — diagrams, line scenes, screenshots and the stage — and a few lucide icons for `Card`'s icon
 * prop.
 */
export function getShipyardMDXComponents(components?: MDXComponents) {
  return getMDXComponents({
    BookOpen,
    Compass,
    Diagram,
    DiagramEdge,
    DiagramGroup,
    DiagramNode,
    FileCode,
    Scene,
    Shot,
    Stage,
    Terminal,
    ...components,
  });
}
