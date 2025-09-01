const CHAINS = ["Base", "Arbitrum", "Avalanche", "Ethereum"] as const
export type Chain = (typeof CHAINS)[number]

export function ChainBadges({ highlight = "Base" as Chain }) {
  return (
    <div className="flex flex-wrap gap-2">
      {CHAINS.map((c) => (
        <span
          key={c}
          className={`px-3 py-1 rounded-full text-xs border ${
            c === highlight
              ? "bg-[var(--color-quirk-teeny-greeny)] border-[var(--color-quirk-blue-greeny)]"
              : "bg-white/70 border-black/10"
          }`}
        >
          {c}
        </span>
      ))}
    </div>
  )
}
