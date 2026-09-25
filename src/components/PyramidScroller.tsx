"use client";

import { useEffect, useRef } from "react";

/**
 * Horizontal scroll container for the pyramid. When a row is wider than the
 * screen, start scrolled to the viewer's own card (or the centre, where the
 * top of the pyramid sits) instead of the far left edge.
 */
export function PyramidScroller({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || el.scrollWidth <= el.clientWidth) return;
    const self = el.querySelector<HTMLElement>("[data-self]");
    const target = self
      ? self.offsetLeft + self.offsetWidth / 2 - el.clientWidth / 2
      : (el.scrollWidth - el.clientWidth) / 2;
    el.scrollLeft = Math.max(0, target);
  }, []);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
