"use client"

import * as React from "react"
import { ScrollArea as ScrollAreaPrimitive } from "radix-ui"

import { cn } from "@/lib/utils"

type ScrollAreaOrientation = "vertical" | "horizontal"

function ScrollArea({
  className,
  children,
  ...props
}: React.ComponentPropsWithoutRef<typeof ScrollAreaPrimitive.Root>) {
  // Robust logic: children is optional at runtime — render Viewport only
  // with valid content and keep the default ScrollBar so overflow stays usable.
  const hasChildren = React.Children.count(children) > 0

  return (
    <ScrollAreaPrimitive.Root
      data-slot="scroll-area"
      className={cn("relative", className ?? "")}
      {...props}
    >
      <ScrollAreaPrimitive.Viewport
        data-slot="scroll-area-viewport"
        className="size-full rounded-[inherit] transition-[color,box-shadow] outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-1"
      >
        {hasChildren ? children : null}
      </ScrollAreaPrimitive.Viewport>
      <ScrollBar />
      <ScrollAreaPrimitive.Corner />
    </ScrollAreaPrimitive.Root>
  )
}

function ScrollBar({
  className,
  orientation = "vertical",
  ...props
}: React.ComponentPropsWithoutRef<
  typeof ScrollAreaPrimitive.ScrollAreaScrollbar
>) {
  // Robust logic: coerce any unexpected orientation value to "vertical" so
  // TypeScript narrows to the Radix union and styling stays deterministic.
  const safeOrientation: ScrollAreaOrientation =
    orientation === "horizontal" ? "horizontal" : "vertical"

  return (
    <ScrollAreaPrimitive.ScrollAreaScrollbar
      data-slot="scroll-area-scrollbar"
      orientation={safeOrientation}
      className={cn(
        "flex touch-none p-px transition-colors select-none",
        safeOrientation === "vertical" &&
          "h-full w-2.5 border-l border-l-transparent",
        safeOrientation === "horizontal" &&
          "h-2.5 flex-col border-t border-t-transparent",
        className ?? ""
      )}
      {...props}
    >
      <ScrollAreaPrimitive.ScrollAreaThumb
        data-slot="scroll-area-thumb"
        className="relative flex-1 rounded-full bg-border"
      />
    </ScrollAreaPrimitive.ScrollAreaScrollbar>
  )
}

export { ScrollArea, ScrollBar }
