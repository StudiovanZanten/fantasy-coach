"use client";
import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { APP } from "@/config/app";
import { useApp, useHydrated } from "@/state/store";

const HOME: Record<string, string> = { "topcoach-eredivisie": "/topcoach", "champ-coach": "/champcoach", "wk-darts": "/darts" };

export default function Landing() {
  const hydrated = useHydrated();
  const { onboarded, activeGameId } = useApp();
  const router = useRouter();
  useEffect(() => {
    if (hydrated && onboarded) router.replace(HOME[activeGameId] ?? "/topcoach");
  }, [hydrated, onboarded, activeGameId, router]);
  if (!hydrated || onboarded) return null;
  return (
    <main className="mx-auto flex min-h-dvh max-w-xl flex-col justify-center gap-6 px-4 py-10">
      <div>
        <p className="font-display text-sm font-bold uppercase tracking-widest text-[var(--color-accent)]">{APP.name}</p>
        <h1 className="font-display text-5xl font-extrabold leading-none">Elke ronde de beste keuze, met uitleg.</h1>
        <p className="mt-3 text-[var(--color-muted)]">{APP.tagline}. Opstelling, captain, wissels en planning over alle rondes, op basis van verwachte punten en de officiële opstellingen.</p>
      </div>
      <ul className="space-y-1 text-sm">
        <li>• TopCoach Eredivisie: beste formatie, captain, risico’s en Gouden Wissels voor je eigen selectie.</li>
        <li>• Champ Coach: rondeplanner met eenmalig gebruik, bewaaradvies en opstellingencheck.</li>
        <li>• Darts: voorbereide demomodule.</li>
      </ul>
      <Link href="/welkom" className="inline-flex h-12 items-center justify-center rounded-xl bg-[var(--color-accent)] px-6 font-semibold text-slate-950">Beginnen</Link>
      <p className="text-xs text-[var(--color-muted)]">{APP.disclaimer}</p>
    </main>
  );
}
