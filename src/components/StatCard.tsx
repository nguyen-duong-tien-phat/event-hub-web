import type { ReactNode } from 'react'

export function StatCard({ label, value, note }: { label: string; value: ReactNode; note: string }) {
  return (
    <div className="rounded-xl border p-5">
      <div className="text-[13px] text-muted-foreground">{label}</div>
      <div className="mt-1 text-2xl font-semibold tracking-tight">{value}</div>
      <div className="mt-0.5 text-xs text-muted-foreground">{note}</div>
    </div>
  )
}
