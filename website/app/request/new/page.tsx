"use client"
import { AnimatedButton } from "@/components/animated-button"
import { MobileHeader } from "@/components/header"
import { QRCard } from "@/components/qr-card"
import { addRequest, getConfig } from "@/lib/store"
import { useMemo, useState } from "react"
import { GlobalFX } from "@/components/global-fx"

function uid() {
  return Math.random().toString(36).slice(2, 10)
}

export default function NewRequest() {
  const cfg = getConfig()
  const [amount, setAmount] = useState<string>("50")
  const [note, setNote] = useState<string>("")
  const [generated, setGenerated] = useState<string | null>(null)

  const payload = useMemo(() => {
    const handle = cfg?.handle || "you.quirk"
    const params = new URLSearchParams({
      to: handle,
      amount: amount || "0",
      note: note || "",
      allow: (cfg?.chains || ["Base"]).join(","),
    })
    // safe on client only
    const origin = typeof window !== "undefined" ? window.location.origin : ""
    return `${origin}/pay?${params.toString()}`
  }, [amount, note, cfg])

  const generate = () => {
    const id = uid()
    addRequest({
      id,
      amount: Number(amount || 0),
      note: note || undefined,
      url: payload,
      createdAt: Date.now(),
      status: "pending",
      network: "Base",
    })
    setGenerated(payload)
  }

  return (
    <main className="mobile-page">
      <GlobalFX />
      <MobileHeader title="New Payment Request" />
      <section className="space-y-3">
        <label className="block">
          <span className="text-sm">Amount (USDC)</span>
          <input
            className="mt-1 w-full rounded-xl border border-black/10 px-3 py-3 bg-white"
            type="number"
            inputMode="decimal"
            min="0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </label>
        <label className="block">
          <span className="text-sm">Optional Note</span>
          <input
            className="mt-1 w-full rounded-xl border border-black/10 px-3 py-3 bg-white"
            placeholder="Dinner bill"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </label>
      </section>

      {!generated ? (
        <div className="mt-auto pt-6">
          <AnimatedButton onClick={generate}>Generate Request</AnimatedButton>
        </div>
      ) : (
        <section className="mt-6 space-y-4">
          <div className="bg-white rounded-2xl p-4 border border-black/10">
            <p className="text-sm font-semibold">Payment Link</p>
            <p className="text-xs break-all mt-1">{generated}</p>
            <div className="mt-3 flex gap-2">
              <button className="text-sm underline" onClick={() => navigator.clipboard.writeText(generated)}>
                Copy
              </button>
              <button className="text-sm underline" onClick={() => (window.location.href = generated!)}>
                Open
              </button>
              {"share" in navigator && (
                <button
                  className="text-sm underline"
                  onClick={() =>
                    (navigator as any).share({
                      title: "Quirk Payment",
                      text: "Pay me with USDC via Quirk",
                      url: generated,
                    })
                  }
                >
                  Share
                </button>
              )}
            </div>
          </div>
          <QRCard value={generated} />
          <div className="pt-4">
            <AnimatedButton variant="secondary" onClick={() => (window.location.href = "/")}>
              Go to Dashboard
            </AnimatedButton>
          </div>
        </section>
      )}
    </main>
  )
}
