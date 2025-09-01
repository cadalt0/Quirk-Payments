export type QuirkConfig = {
  chains: string[]
  settlementChain: string
  settlementAddress: string
  handle: string
}

export type PaymentRequest = {
  id: string
  amount: number
  note?: string
  url: string
  createdAt: number
  status: "pending" | "completed"
  network?: string
  payid?: string // Database payment ID
  hash?: string // Transaction hash
  updatedAt?: string // Last updated timestamp
}

const CONFIG_KEY = "quirk_config"
const REQUESTS_KEY = "quirk_requests"

export function saveConfig(cfg: QuirkConfig) {
  if (typeof window === "undefined") return
  localStorage.setItem(CONFIG_KEY, JSON.stringify(cfg))
}

export function getConfig(): QuirkConfig | null {
  if (typeof window === "undefined") return null
  const raw = localStorage.getItem(CONFIG_KEY)
  return raw ? (JSON.parse(raw) as QuirkConfig) : null
}

export function addRequest(req: PaymentRequest) {
  if (typeof window === "undefined") return
  const list = getRequests()
  list.unshift(req)
  localStorage.setItem(REQUESTS_KEY, JSON.stringify(list))
}

export function getRequests(): PaymentRequest[] {
  if (typeof window === "undefined") return []
  const raw = localStorage.getItem(REQUESTS_KEY)
  return raw ? (JSON.parse(raw) as PaymentRequest[]) : []
}
