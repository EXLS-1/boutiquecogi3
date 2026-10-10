import * as React from "react"

import { cn } from "@/lib/utils"

function Kbd({ className, ...props }: React.ComponentPropsWithoutRef<"kbd">) {
  return (
    <kbd
      data-slot="kbd"
      className={cn(
        "pointer-events-none inline-flex h-5 w-fit min-w-5 items-center justify-center gap-1 rounded-sm bg-muted px-1 font-sans text-xs font-medium text-muted-foreground select-none",
        "[&_svg:not([class*='size-'])]:size-3",
        "[[data-slot=tooltip-content]_&]:bg-background/20 [[data-slot=tooltip-content]_&]:text-background dark:[[data-slot=tooltip-content]_&]:bg-background/10",
        className ?? ""
      )}
      {...props}
    />
  )
}

function KbdGroup({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"div">) {
  // Robust logic: a group of <kbd> elements is a generic container, so it
  // must render a <div> (not a nested <kbd>) for valid HTML semantics and
  // correct div prop typing.
  return (
    <div
      data-slot="kbd-group"
      className={cn("inline-flex items-center gap-1", className ?? "")}
      {...props}
    />
  )
}

export { Kbd, KbdGroup }
