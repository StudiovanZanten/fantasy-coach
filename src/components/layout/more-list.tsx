"use client";
import Link from "next/link";
import { NAV } from "./app-shell";

export function MoreList({ section }: { section: string }) {
  const items = [...(NAV[section] ?? []), { href: "/import", label: "Importeren" }, { href: "/instellingen", label: "Instellingen" }, { href: "/beheer/regels", label: "Spelregels" }, { href: "/privacy", label: "Privacy" }];
  return (
    <ul className="divide-y divide-[var(--color-border)] rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]">
      {items.map((i) => (
        <li key={i.href}>
          <Link href={i.href} className="block px-4 py-3 font-medium">
            {i.label}
          </Link>
        </li>
      ))}
    </ul>
  );
}
