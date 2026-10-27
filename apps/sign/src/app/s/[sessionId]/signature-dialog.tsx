"use client";

import { Button } from "@coss/ui/components/button";
import {
  Dialog,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogPanel,
  DialogPopup,
  DialogTitle,
} from "@coss/ui/components/dialog";
import { Input } from "@coss/ui/components/input";
import { Label } from "@coss/ui/components/label";
import { Tabs, TabsList, TabsPanel, TabsTab } from "@coss/ui/components/tabs";
import { type PointerEvent, useEffect, useRef, useState } from "react";

export type SignatureKind = "signature" | "initials";

const WIDTH = 600;
const HEIGHT = 200;
const SCRIPT_FONT = '"Snell Roundhand", "Segoe Script", "Brush Script MT", cursive';
const INK = "#1f2937";

/** `typed` drawn on a canvas in a script face, as a PNG data URL (transparent background). */
function typedImage(text: string): string {
  const canvas = document.createElement("canvas");
  canvas.width = WIDTH;
  canvas.height = HEIGHT;
  const context = canvas.getContext("2d");
  if (!context) return "";
  let size = 96;
  context.font = `${size}px ${SCRIPT_FONT}`;
  while (size > 24 && context.measureText(text).width > WIDTH - 40) {
    size -= 4;
    context.font = `${size}px ${SCRIPT_FONT}`;
  }
  context.fillStyle = INK;
  context.textBaseline = "middle";
  context.textAlign = "center";
  context.fillText(text, WIDTH / 2, HEIGHT / 2);
  return canvas.toDataURL("image/png");
}

export function initialsOf(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("")
    .slice(0, 4);
}

/** Adopting a signature or initials: drawn with a finger, mouse or pen, or typed. */
export function SignatureDialog({
  kind,
  name,
  open,
  onOpenChange,
  onAdopt,
}: {
  kind: SignatureKind;
  name: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdopt: (image: string) => void;
}) {
  const [mode, setMode] = useState<"type" | "draw">("type");
  const [typed, setTyped] = useState("");
  const [drawn, setDrawn] = useState(false);
  const canvas = useRef<HTMLCanvasElement>(null);
  const last = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (open) {
      setTyped(kind === "signature" ? name : initialsOf(name));
      setDrawn(false);
    }
  }, [open, kind, name]);

  const point = (event: PointerEvent<HTMLCanvasElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * WIDTH,
      y: ((event.clientY - rect.top) / rect.height) * HEIGHT,
    };
  };
  const start = (event: PointerEvent<HTMLCanvasElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    last.current = point(event);
  };
  const move = (event: PointerEvent<HTMLCanvasElement>) => {
    const from = last.current;
    const context = canvas.current?.getContext("2d");
    if (!from || !context) return;
    const to = point(event);
    context.strokeStyle = INK;
    context.lineWidth = 4;
    context.lineCap = "round";
    context.lineJoin = "round";
    context.beginPath();
    context.moveTo(from.x, from.y);
    context.lineTo(to.x, to.y);
    context.stroke();
    last.current = to;
    setDrawn(true);
  };
  const end = () => {
    last.current = null;
  };
  const clear = () => {
    canvas.current?.getContext("2d")?.clearRect(0, 0, WIDTH, HEIGHT);
    setDrawn(false);
  };

  const ready = mode === "type" ? typed.trim().length > 0 : drawn;
  const adopt = () => {
    const image =
      mode === "type" ? typedImage(typed.trim()) : (canvas.current?.toDataURL("image/png") ?? "");
    if (image) onAdopt(image);
  };
  const label = kind === "signature" ? "signature" : "initials";

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogPopup>
        <DialogHeader>
          <DialogTitle>Adopt your {label}</DialogTitle>
          <DialogDescription>
            It's placed on every {label} field of these documents.
          </DialogDescription>
        </DialogHeader>
        <DialogPanel>
          <Tabs onValueChange={(value) => setMode(value as "type" | "draw")} value={mode}>
            <TabsList>
              <TabsTab value="type">Type</TabsTab>
              <TabsTab value="draw">Draw</TabsTab>
            </TabsList>
            <TabsPanel className="flex flex-col gap-3 pt-3" value="type">
              <Label htmlFor="typed-signature">Your {label}</Label>
              <Input
                autoComplete="off"
                id="typed-signature"
                maxLength={64}
                onChange={(event) => setTyped(event.target.value)}
                value={typed}
              />
              <div
                aria-hidden
                className="flex h-24 items-center justify-center overflow-hidden rounded-md border bg-white text-4xl text-gray-800"
                style={{ fontFamily: SCRIPT_FONT }}
              >
                {typed}
              </div>
            </TabsPanel>
            <TabsPanel className="flex flex-col gap-2 pt-3" value="draw">
              <canvas
                aria-label={`Draw your ${label}`}
                className="aspect-[3/1] w-full touch-none rounded-md border bg-white"
                height={HEIGHT}
                onPointerCancel={end}
                onPointerDown={start}
                onPointerMove={move}
                onPointerUp={end}
                ref={canvas}
                width={WIDTH}
              />
              <Button className="self-start" onClick={clear} size="sm" variant="ghost">
                Clear
              </Button>
            </TabsPanel>
          </Tabs>
        </DialogPanel>
        <DialogFooter>
          <Button onClick={() => onOpenChange(false)} variant="ghost">
            Cancel
          </Button>
          <Button disabled={!ready} onClick={adopt}>
            Adopt and sign
          </Button>
        </DialogFooter>
      </DialogPopup>
    </Dialog>
  );
}
