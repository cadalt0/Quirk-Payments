"use client"
import confetti from "canvas-confetti"
import { useEffect } from "react"

export function ConfettiBurst({ fire = true }: { fire?: boolean }) {
  useEffect(() => {
    if (!fire) return
    const duration = 900
    const end = Date.now() + duration
    ;(function frame() {
      confetti({
        particleCount: 30,
        spread: 60,
        origin: { y: 0.5 },
        colors: ["#7d3cff", "#f2d53c", "#ff0028", "#beef00", "#1400c6"],
        scalar: 0.9,
      })
      if (Date.now() < end) requestAnimationFrame(frame)
    })()
  }, [fire])
  return null
}
