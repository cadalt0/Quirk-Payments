"use client"
import { AnimatedButton } from "@/components/animated-button"
import { ConfettiBurst } from "@/components/confetti"
import { GlobalFX } from "@/components/global-fx"
import { useEffect, useState } from "react"

export default function AccountCreated() {
  const [countdown, setCountdown] = useState(5)

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          window.location.href = "/onboarding"
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [])

  const handleContinue = () => {
    window.location.href = "/onboarding"
  }

  return (
    <main className="mobile-page items-center text-center justify-center">
      <GlobalFX />
      <ConfettiBurst />
      <div className="space-y-2">
        <div className="text-4xl">🎉</div>
        <h1 className="text-2xl font-extrabold">Your Quirk Account is Ready!</h1>
        <p className="text-sm text-muted-foreground">
          Welcome to Quirk! Let's set up your USDC settlement preferences.
        </p>
      </div>
      
      <div className="mt-6 space-y-4">
        <div className="text-center">
          <p className="text-sm text-muted-foreground">
            Redirecting to setup in <span className="font-bold text-[#6b46ff]">{countdown}</span> seconds
          </p>
        </div>
        
        <AnimatedButton onClick={handleContinue}>
          Continue to Setup
        </AnimatedButton>
      </div>
    </main>
  )
}
