"use client";

import { Spinner } from "@coss/ui/components/spinner";
import { type ReactNode, useEffect, useRef, useState } from "react";

type PdfJs = typeof import("pdfjs-dist/legacy/build/pdf.mjs");
type PdfDocument = Awaited<ReturnType<PdfJs["getDocument"]>["promise"]>;

let pdfjs: Promise<PdfJs> | undefined;

/** pdf.js, loaded once, parsing in a worker of this origin. */
function loadPdfJs(): Promise<PdfJs> {
  pdfjs ??= import("pdfjs-dist/legacy/build/pdf.mjs").then((module) => {
    module.GlobalWorkerOptions.workerPort = new Worker(
      new URL("pdfjs-dist/legacy/build/pdf.worker.min.mjs", import.meta.url),
      { type: "module" },
    );
    return module;
  });
  return pdfjs;
}

export type PageSize = { width: number; height: number };

/**
 * A document's pages, each drawn on a canvas at the container's width, with `overlay(page, scale)`
 * on top: things placed in PDF points from the page's top left (as displayed) times `scale`.
 */
export function PdfPages({
  bytes,
  pages,
  overlay,
  onStatus,
}: {
  bytes: ArrayBuffer;
  pages: PageSize[];
  overlay: (page: number, scale: number) => ReactNode;
  /** Whether pdf.js could open the document (its pages then draw). */
  onStatus?: (status: "ready" | "failed") => void;
}) {
  const [document, setDocument] = useState<PdfDocument | null>(null);
  const [failed, setFailed] = useState(false);
  // The latest callback, without reopening the document when it changes.
  const reportStatus = useRef(onStatus);
  reportStatus.current = onStatus;

  useEffect(() => {
    let canceled = false;
    let task: ReturnType<PdfJs["getDocument"]> | null = null;
    loadPdfJs()
      .then((module) => {
        if (canceled) return null;
        // pdf.js takes ownership of the buffer it's given: hand it a copy.
        task = module.getDocument({
          data: new Uint8Array(bytes.slice(0)),
          // Data files some documents need (CJK text, standard fonts, JPEG 2000 and JBIG2 images,
          // color profiles), from this origin.
          cMapUrl: "/pdfjs/cmaps/",
          cMapPacked: true,
          standardFontDataUrl: "/pdfjs/standard_fonts/",
          iccUrl: "/pdfjs/iccs/",
          wasmUrl: "/pdfjs/wasm/",
        });
        return task.promise;
      })
      .then((pdf) => {
        if (pdf && !canceled) {
          setDocument(pdf);
          reportStatus.current?.("ready");
        }
      })
      .catch((error: unknown) => {
        if (canceled) return;
        console.error("Could not open the document:", error);
        setFailed(true);
        reportStatus.current?.("failed");
      });
    return () => {
      canceled = true;
      void task?.destroy();
    };
  }, [bytes]);

  if (failed) {
    return <p className="text-destructive-foreground text-sm">This document couldn't be shown.</p>;
  }
  return (
    <div className="flex flex-col gap-4">
      {pages.map((size, index) => (
        <Page
          document={document}
          // biome-ignore lint/suspicious/noArrayIndexKey: pages are fixed and in order.
          key={index}
          number={index + 1}
          onFailed={() => reportStatus.current?.("failed")}
          overlay={overlay}
          size={size}
        />
      ))}
    </div>
  );
}

function Page({
  document,
  number,
  size,
  overlay,
  onFailed,
}: {
  document: PdfDocument | null;
  number: number;
  size: PageSize;
  /** The page couldn't be drawn: its document isn't shown after all. */
  onFailed: () => void;
  overlay: (page: number, scale: number) => ReactNode;
}) {
  const wrapper = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const [width, setWidth] = useState(0);
  const [visible, setVisible] = useState(false);
  const [drawn, setDrawn] = useState(false);

  // The page's CSS width follows its container.
  useEffect(() => {
    const element = wrapper.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => {
      if (entry) setWidth(Math.floor(entry.contentRect.width));
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  // Drawn once it comes near the screen: a long document doesn't draw every page up front.
  useEffect(() => {
    const element = wrapper.current;
    if (!element) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) setVisible(true);
      },
      { rootMargin: "800px 0px" },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const failed = useRef(onFailed);
  failed.current = onFailed;
  useEffect(() => {
    if (!document || !visible || width === 0 || !canvas.current) return;
    let task: { cancel(): void; promise: Promise<void> } | null = null;
    let canceled = false;
    const target = canvas.current;
    document
      .getPage(number)
      .then((page) => {
        if (canceled) return;
        const base = page.getViewport({ scale: 1 });
        const ratio = window.devicePixelRatio || 1;
        const viewport = page.getViewport({ scale: (width / base.width) * ratio });
        target.width = Math.floor(viewport.width);
        target.height = Math.floor(viewport.height);
        task = page.render({ canvas: target, viewport });
        return task.promise.then(() => {
          if (!canceled) setDrawn(true);
        });
      })
      .catch((error: unknown) => {
        if ((error as { name?: string }).name !== "RenderingCancelledException") {
          console.error(`Could not draw page ${number}:`, error);
          if (!canceled) failed.current();
        }
      });
    return () => {
      canceled = true;
      task?.cancel();
    };
  }, [document, visible, width, number]);

  const scale = width > 0 ? width / size.width : 0;
  return (
    <div
      className="relative w-full overflow-hidden rounded-md border bg-white shadow-xs"
      ref={wrapper}
      style={{ aspectRatio: `${size.width} / ${size.height}` }}
    >
      <canvas aria-label={`Page ${number}`} className="absolute inset-0 size-full" ref={canvas} />
      {!drawn && (
        <div className="absolute inset-0 flex items-center justify-center">
          <Spinner />
        </div>
      )}
      {scale > 0 && overlay(number, scale)}
    </div>
  );
}
