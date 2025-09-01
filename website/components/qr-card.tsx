"use client"
import QRCode from "react-qr-code"

export function QRCard({ value }: { value: string }) {
  return (
    <div className="flex flex-col items-center gap-3">
      <div className="bg-white rounded-2xl p-4 qr-bounce">
        <QRCode value={value} size={180} />
      </div>
      <p className="text-xs text-muted-foreground text-center max-w-[16rem]">Scan to open payment request</p>
    </div>
  )
}
