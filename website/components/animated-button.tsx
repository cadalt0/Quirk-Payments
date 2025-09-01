"use client"
import { cn } from "@/lib/utils"
import type React from "react"

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "danger"
  full?: boolean
}

export function AnimatedButton({ className, variant = "primary", full = true, ...props }: Props) {
  const v =
    variant === "primary"
      ? "btn-glow btn-glow--primary"
      : variant === "danger"
        ? "bg-[var(--color-quirk-electric-red)] text-white hover:shadow-[0_0_18px_rgba(255,0,40,.5)]"
        : "bg-[var(--color-quirk-blue-greeny)] text-black hover:shadow-[0_0_18px_rgba(92,189,185,.5)]"
  return (
    <button
      {...props}
      className={cn(
        "rounded-full px-5 py-3 text-base font-semibold tracking-wide",
        "active:translate-y-[1px] transition",
        v,
        full ? "w-full" : "",
        className,
      )}
    />
  )
}
