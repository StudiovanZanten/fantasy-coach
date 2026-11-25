"use client";
import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Field({ label, hint, children }: { label: string; hint?: ReactNode; children: ReactNode }) {
  return (
    <label className="block space-y-1">
      <span className="text-sm font-medium">{label}</span>
      {children}
      {hint && <span className="block text-xs text-[var(--color-muted)]">{hint}</span>}
    </label>
  );
}

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={cn(
        "h-10 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 text-sm outline-none focus:border-[var(--color-accent)]",
        props.className,
      )}
    />
  );
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={cn("h-10 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 text-sm outline-none focus:border-[var(--color-accent)]", props.className)}
    />
  );
}

export function Switch({ checked, onChange, label, description }: { checked: boolean; onChange: (v: boolean) => void; label: string; description?: string }) {
  return (
    <button type="button" role="switch" aria-checked={checked} onClick={() => onChange(!checked)} className="flex w-full items-center justify-between gap-3 py-2 text-left">
      <span>
        <span className="block text-sm font-medium">{label}</span>
        {description && <span className="block text-xs text-[var(--color-muted)]">{description}</span>}
      </span>
      <span className={cn("relative h-6 w-11 shrink-0 rounded-full transition", checked ? "bg-[var(--color-accent)]" : "bg-[var(--color-border)]")}>
        <span className={cn("absolute top-0.5 h-5 w-5 rounded-full bg-white transition", checked ? "left-[22px]" : "left-0.5")} />
      </span>
    </button>
  );
}

export function Slider({ label, value, onChange, min = 0, max = 2, step = 0.1, format }: { label: string; value: number; onChange: (v: number) => void; min?: number; max?: number; step?: number; format?: (v: number) => string }) {
  return (
    <label className="block py-1">
      <span className="flex justify-between text-sm">
        <span>{label}</span>
        <span className="tabular text-[var(--color-muted)]">{format ? format(value) : value.toFixed(1)}</span>
      </span>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} className="w-full accent-[var(--color-accent)]" />
    </label>
  );
}

export function Segmented<T extends string>({ value, options, onChange, label }: { value: T; options: { value: T; label: string }[]; onChange: (v: T) => void; label: string }) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex rounded-xl bg-[var(--color-surface-2)] p-1">
      {options.map((o) => (
        <button
          key={o.value}
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={cn("rounded-lg px-3 py-1.5 text-sm font-medium", value === o.value ? "bg-[var(--color-accent)] text-slate-950" : "text-[var(--color-muted)]")}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
