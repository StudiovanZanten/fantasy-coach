"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { APP } from "@/config/app";
import { useApp, useHydrated } from "@/state/store";
import { cn } from "@/lib/utils";
import { BarChart3, CalendarClock, ClipboardCheck, Crown, Gauge, Home, MessageSquare, Newspaper, Repeat, Settings, ShieldCheck, Target, Trophy, Users } from "lucide-react";

type NavItem = { href: string; label: string; icon: React.ComponentType<{ className?: string }>; mobile?: boolean };

const NAV: Record<string, NavItem[]> = {
  topcoach: [
    { href: "/topcoach", label: "Overzicht", icon: Home, mobile: true },
    { href: "/topcoach/opstelling", label: "Opstelling", icon: Gauge, mobile: true },
    { href: "/topcoach/selectie", label: "Mijn selectie", icon: Users, mobile: true },
    { href: "/topcoach/captain", label: "Captain", icon: Crown },
    { href: "/topcoach/gouden-wissel", label: "Gouden Wissel", icon: Repeat },
    { href: "/topcoach/spelers", label: "Spelers", icon: Target },
    { href: "/topcoach/nieuws", label: "Nieuws", icon: Newspaper },
    { href: "/topcoach/evaluatie", label: "Evaluatie", icon: BarChart3 },
    { href: "/chat", label: "Assistent", icon: MessageSquare, mobile: true },
  ],
  champcoach: [
    { href: "/champcoach", label: "Rondeplanner", icon: CalendarClock, mobile: true },
    { href: "/champcoach/team", label: "Team Builder", icon: Gauge, mobile: true },
    { href: "/champcoach/check", label: "Opstellingencheck", icon: ClipboardCheck, mobile: true },
    { href: "/champcoach/definitief", label: "Definitief", icon: ShieldCheck },
    { href: "/champcoach/scouting", label: "Scouting", icon: Target },
    { href: "/champcoach/gebruikt", label: "Gebruikte spelers", icon: Users },
    { href: "/champcoach/evaluatie", label: "Evaluatie", icon: BarChart3 },
    { href: "/chat", label: "Assistent", icon: MessageSquare, mobile: true },
  ],
  darts: [{ href: "/darts", label: "Toernooi", icon: Trophy, mobile: true }],
};

const GAMES = [
  { id: "topcoach-eredivisie", section: "topcoach", label: "TopCoach", href: "/topcoach" },
  { id: "champ-coach", section: "champcoach", label: "Champ Coach", href: "/champcoach" },
  { id: "wk-darts", section: "darts", label: "Darts", href: "/darts" },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const hydrated = useHydrated();
  const { activeGameId, theme, set } = useApp();
  const sectionFromPath = GAMES.find((g) => path.startsWith(g.href))?.section;
  const section = sectionFromPath ?? GAMES.find((g) => g.id === activeGameId)?.section ?? "topcoach";

  useEffect(() => {
    const g = GAMES.find((x) => x.section === sectionFromPath);
    if (g && g.id !== activeGameId) set(() => ({ activeGameId: g.id }));
  }, [sectionFromPath, activeGameId, set]);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  if (path === "/" || path.startsWith("/welkom")) return <>{children}</>;
  const items = NAV[section] ?? [];
  const mobileItems = items.filter((i) => i.mobile).slice(0, 4);

  return (
    <div className="mx-auto flex min-h-dvh max-w-7xl">
      <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col border-r border-[var(--color-border)] p-4 md:flex">
        <Link href="/" className="mb-4 font-display text-2xl font-extrabold uppercase">
          {APP.name}
        </Link>
        <GameSwitcher section={section} />
        <nav className="mt-4 flex flex-1 flex-col gap-1" aria-label="Hoofdmenu">
          {items.map((i) => (
            <NavLink key={i.href} item={i} active={path === i.href} />
          ))}
        </nav>
        <div className="flex flex-col gap-1 border-t border-[var(--color-border)] pt-3">
          <NavLink item={{ href: "/instellingen", label: "Instellingen", icon: Settings }} active={path.startsWith("/instellingen")} />
          <NavLink item={{ href: "/beheer/regels", label: "Spelregels", icon: ShieldCheck }} active={path.startsWith("/beheer")} />
        </div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex items-center justify-between gap-2 border-b border-[var(--color-border)] bg-[var(--color-bg)]/90 px-4 py-3 backdrop-blur md:hidden">
          <Link href="/" className="font-display text-xl font-extrabold uppercase">
            {APP.shortName}
          </Link>
          <GameSwitcher section={section} compact />
          <Link href="/instellingen" aria-label="Instellingen" className="rounded-lg p-2 text-[var(--color-muted)]">
            <Settings className="h-5 w-5" />
          </Link>
        </header>
        <main className="flex-1 px-4 pb-28 pt-4 md:px-8 md:pb-10 md:pt-6">{hydrated ? children : <div className="h-40 animate-pulse rounded-2xl bg-[var(--color-surface)]" />}</main>
        <footer className="hidden px-8 pb-6 text-xs text-[var(--color-muted)] md:block">{APP.disclaimer}</footer>
      </div>
      <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-[var(--color-border)] bg-[var(--color-surface)] pb-[env(safe-area-inset-bottom)] md:hidden" aria-label="Snelmenu">
        {mobileItems.map((i) => (
          <MobileLink key={i.href} item={i} active={path === i.href} />
        ))}
        <MobileLink item={{ href: `/${section}/meer`, label: "Meer", icon: BarChart3 }} active={path.endsWith("/meer")} />
      </nav>
    </div>
  );
}

function GameSwitcher({ section, compact }: { section: string; compact?: boolean }) {
  return (
    <div className={cn("flex gap-1 rounded-xl bg-[var(--color-surface-2)] p-1", compact && "text-xs")} role="tablist" aria-label="Spel">
      {GAMES.map((g) => (
        <Link key={g.id} href={g.href} role="tab" aria-selected={section === g.section} className={cn("flex-1 rounded-lg px-2 py-1 text-center font-semibold", section === g.section ? "bg-[var(--color-accent)] text-slate-950" : "text-[var(--color-muted)]")}>
          {g.label}
        </Link>
      ))}
    </div>
  );
}

function NavLink({ item, active }: { item: NavItem; active: boolean }) {
  const Icon = item.icon;
  return (
    <Link href={item.href} aria-current={active ? "page" : undefined} className={cn("flex items-center gap-3 rounded-xl px-3 py-2 text-sm", active ? "bg-[var(--color-surface-2)] font-semibold text-[var(--color-text)]" : "text-[var(--color-muted)] hover:text-[var(--color-text)]")}>
      <Icon className="h-4 w-4" />
      {item.label}
    </Link>
  );
}

function MobileLink({ item, active }: { item: NavItem; active: boolean }) {
  const Icon = item.icon;
  return (
    <Link href={item.href} aria-current={active ? "page" : undefined} className={cn("flex flex-col items-center gap-0.5 py-2 text-[11px]", active ? "text-[var(--color-accent)]" : "text-[var(--color-muted)]")}>
      <Icon className="h-5 w-5" />
      {item.label}
    </Link>
  );
}

export { NAV };
