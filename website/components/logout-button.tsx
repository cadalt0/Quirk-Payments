"use client"

import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"

const QUIRK_KEYS_PREFIXES = [
  "quirk.selectedChains",
  "quirk.settlementChain",
  "quirk.account",
  "quirk.requests",
  "quirk.recentPayments",
  "quirk.pay.allow",
  "quirk.lastRequest",
]

export function LogoutButton({ className }: { className?: string }) {
  const router = useRouter()

  function handleLogout() {
    try {
      // remove known keys
      QUIRK_KEYS_PREFIXES.forEach((k) => localStorage.removeItem(k))
      // also remove any other namespaced keys for safety
      Object.keys(localStorage)
        .filter((k) => k.startsWith("quirk."))
        .forEach((k) => localStorage.removeItem(k))
    } catch (e) {
      // ignore storage errors
    }
    // navigate to onboarding to create a new account
    router.replace("/onboarding")
  }

  return (
    <Button
      variant="outline"
      className={className}
      onClick={handleLogout}
      aria-label="Log out and create another account"
    >
      Log out
    </Button>
  )
}
