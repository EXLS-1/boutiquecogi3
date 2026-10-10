"use client"

import * as React from "react"
import { Slider as SliderPrimitive } from "radix-ui"

import { cn } from "@/lib/utils"

type SliderRootProps = React.ComponentPropsWithoutRef<
  typeof SliderPrimitive.Root
>

function Slider({
  className,
  defaultValue,
  value,
  min = 0,
  max = 100,
  ...props
}: SliderRootProps) {
  // Robust logic: normalize Radix controlled/uncontrolled values to a finite
  // number array. Falls back to [min] when no value is provided, clamps every
  // entry to [safeMin, safeMax], and renders one thumb per entry so the
  // slider never crashes on undefined / NaN / out-of-range input.
  const safeMin = Number.isFinite(min) ? min : 0
  const safeMax = Number.isFinite(max) ? max : 100
  const lower = Math.min(safeMin, safeMax)
  const upper = Math.max(safeMin, safeMax)

  const clampToRange = React.useCallback(
    (n: number) => {
      if (!Number.isFinite(n)) return lower
      return Math.min(upper, Math.max(lower, n))
    },
    [lower, upper]
  )

  const _values = React.useMemo<number[]>(() => {
    const raw = Array.isArray(value)
      ? value
      : Array.isArray(defaultValue)
        ? defaultValue
        : [lower]
    const numeric = raw.filter(
      (n): n is number => typeof n === "number" && Number.isFinite(n)
    )
    const clamped = numeric.map(clampToRange)
    return clamped.length > 0 ? clamped : [lower]
  }, [value, defaultValue, lower, clampToRange])

  return (
    <SliderPrimitive.Root
      data-slot="slider"
      defaultValue={defaultValue}
      value={value}
      min={lower}
      max={upper}
      className={cn(
        "relative flex w-full touch-none items-center select-none data-[disabled]:opacity-50 data-[orientation=vertical]:h-full data-[orientation=vertical]:min-h-44 data-[orientation=vertical]:w-auto data-[orientation=vertical]:flex-col",
        className ?? ""
      )}
      {...props}
    >
      <SliderPrimitive.Track
        data-slot="slider-track"
        className={cn(
          "relative grow overflow-hidden rounded-full bg-muted data-[orientation=horizontal]:h-1.5 data-[orientation=horizontal]:w-full data-[orientation=vertical]:h-full data-[orientation=vertical]:w-1.5"
        )}
      >
        <SliderPrimitive.Range
          data-slot="slider-range"
          className={cn(
            "absolute bg-primary data-[orientation=horizontal]:h-full data-[orientation=vertical]:w-full"
          )}
        />
      </SliderPrimitive.Track>
      {Array.from({ length: _values.length }, (_, index) => (
        <SliderPrimitive.Thumb
          data-slot="slider-thumb"
          key={index}
          className="block size-4 shrink-0 rounded-full border border-primary bg-white shadow-sm ring-ring/50 transition-[color,box-shadow] hover:ring-4 focus-visible:ring-4 focus-visible:outline-hidden disabled:pointer-events-none disabled:opacity-50"
        />
      ))}
    </SliderPrimitive.Root>
  )
}

export { Slider }
