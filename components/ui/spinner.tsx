import { Loader2Icon } from "lucide-react"
import * as React from "react"

import { cn } from "@/lib/utils"

type SpinnerProps = React.ComponentPropsWithoutRef<"svg"> & {
  /** Accessible label announced by screen readers. Defaults to "Loading". */
  label?: string
}

function Spinner({ className, label = "Loading", ...props }: SpinnerProps) {
  // Robust logic: lucide icons forward SVG props; keep role="status" so
  // assistive tech announces loading, allow label override, and never let
  // an undefined className leak into cn().
  return (
    <Loader2Icon
      role="status"
      aria-label={label}
      aria-busy="true"
      className={cn("size-4 animate-spin", className ?? "")}
      {...props}
    />
  )
}

export { Spinner }
