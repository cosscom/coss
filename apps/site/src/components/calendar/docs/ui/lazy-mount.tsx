"use client";

import { type ReactNode, useEffect, useRef, useState } from "react";

/** Mounts children when the box comes within `near` of the viewport; unmounts once it is past `far`. */
export function LazyMount({
  children,
  placeholder,
  near = "200px 0px",
  far = "800px 0px",
  className,
}: {
  children: ReactNode;
  placeholder?: ReactNode;
  near?: string;
  far?: string;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const enter = new IntersectionObserver(([e]) => e.isIntersecting && setMounted(true), {
      rootMargin: near,
    });
    const leave = new IntersectionObserver(([e]) => !e.isIntersecting && setMounted(false), {
      rootMargin: far,
    });
    enter.observe(el);
    leave.observe(el);
    return () => {
      enter.disconnect();
      leave.disconnect();
    };
  }, [near, far]);
  return (
    <div ref={ref} className={className}>
      {mounted ? children : placeholder}
    </div>
  );
}
