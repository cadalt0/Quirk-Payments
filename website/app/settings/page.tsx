import Link from "next/link"

export default function SettingsPage() {
  return (
    <main className="mx-auto max-w-sm p-6">
      <h1 className="text-2xl font-semibold mb-2">Settings</h1>
      <p className="text-sm text-muted-foreground mb-6">
        Configure your Quirk account preferences here. You can return to the Dashboard anytime.
      </p>

      <div className="flex gap-2">
        <Link
          href="/"
          className="inline-flex items-center rounded-md border border-black/15 bg-white px-3 py-1.5 text-xs font-medium shadow-sm hover:bg-black/[0.03] focus:outline-none focus:ring-2 focus:ring-black/10"
        >
          Back to Dashboard
        </Link>
      </div>
    </main>
  )
}
