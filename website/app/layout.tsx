import type React from "react"
import type { Metadata } from "next"
import { GeistSans } from "geist/font/sans"
import { GeistMono } from "geist/font/mono"
import { Analytics } from "@vercel/analytics/next"
import { Suspense } from "react"
import AuthSessionProvider from "../components/session-provider"
import { AuthProvider } from "../lib/auth-context"
import "./globals.css"

export const metadata: Metadata = {
  title: "v0 App",
  description: "Created with v0",
  generator: "v0.app",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="antialiased">
      <body
        className={`bg-[#fceed1] text-foreground font-sans min-h-dvh overflow-hidden ${GeistSans.variable} ${GeistMono.variable}`}
      >
        <AuthSessionProvider>
          <AuthProvider>
            <Suspense fallback={<div>Loading...</div>}>
              <div className="min-h-dvh w-full flex items-center justify-center p-2 sm:p-4">
                <div
                  className="
                    relative mx-auto w-full max-w-[420px]
                    h-[calc(100dvh-16px)] sm:h-[calc(100dvh-32px)]
                    bg-[#fff8ee] rounded-[28px] border-2 border-black/15
                    shadow-[0_20px_60px_rgba(0,0,0,0.15)] overflow-hidden
                  "
                >
                  <div className="flex h-full flex-col overflow-y-auto no-scrollbar">{children}</div>
                </div>
              </div>
            </Suspense>
          </AuthProvider>
        </AuthSessionProvider>
        <Analytics />
      </body>
    </html>
  )
}
