export function MobileHeader({ title }: { title?: string }) {
  return (
    <header className="pt-4 pb-2">
      <h1 className="text-xl font-bold tracking-wide text-balance">{title}</h1>
    </header>
  )
}
