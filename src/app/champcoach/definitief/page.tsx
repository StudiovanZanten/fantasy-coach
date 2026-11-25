"use client";
import { useState } from "react";
import Link from "next/link";
import { DataBanner, PageHeader } from "@/components/common/data-banner";
import { Deadline, RoundSelect } from "@/components/champcoach/common";
import { useIndex, useNow } from "@/components/providers/game-data";
import { Card, CardTitle, EmptyState, Notice } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { validateTeam } from "@/engine/rules/validate";
import { useRules } from "@/lib/client/hooks";
import { usePlanRound, usedOutside } from "@/lib/client/champcoach";
import { useApp } from "@/state/store";
import { fmtDateTime } from "@/lib/utils";

const ORDER = ["GK", "DEF", "MID", "FWD"];
const LABEL: Record<string, string> = { GK: "Keeper", DEF: "Verdedigers", MID: "Middenvelders", FWD: "Aanvallers" };

export default function FinalTeam() {
  const idx = useIndex();
  const now = useNow();
  const { rules } = useRules();
  const plan = usePlanRound();
  const [picked, setPicked] = useState<string | undefined>();
  const roundId = picked ?? plan;
  const cc = useApp((s) => s.champcoach);
  const set = useApp((s) => s.set);
  const [copied, setCopied] = useState(false);
  if (!roundId) return <EmptyState title="Geen open ronde" />;
  const round = idx.rounds.get(roundId)!;
  const team = cc.teams[roundId];
  if (!team?.playerIds.length)
    return (
      <div className="space-y-4">
        <DataBanner />
        <PageHeader title="Definitief team" action={<RoundSelect value={roundId} onChange={setPicked} filter={(s) => s !== "past"} />} />
        <EmptyState title="Nog geen team">
          Kies eerst een team in de <Link href="/champcoach/team" className="underline">Team Builder</Link>.
        </EmptyState>
      </div>
    );
  const violations = validateTeam({ rules, players: idx.players, playerIds: team.playerIds, captainId: team.captainId, usedPlayerIds: new Set(usedOutside(cc, roundId)) });
  const name = (id: string) => idx.players.get(id)?.name ?? id;
  const lines = ORDER.map((pos) => ({ pos, ids: team.playerIds.filter((id) => idx.players.get(id)?.position === pos) }));
  const text = [
    `${round.name}`,
    ...lines.map((l) => `${LABEL[l.pos]}: ${l.ids.map((id) => name(id) + (id === team.captainId ? " (C)" : "")).join(", ")}`),
  ].join("\n");

  const finalize = () =>
    set((s) => ({
      champcoach: {
        ...s.champcoach,
        teams: { ...s.champcoach.teams, [roundId]: { ...team, finalizedAt: now.toISOString() } },
        used: [...s.champcoach.used.filter((u) => u.roundId !== roundId), ...team.playerIds.map((playerId) => ({ playerId, roundId }))],
      },
    }));
  const undo = () =>
    set((s) => ({
      champcoach: { ...s.champcoach, teams: { ...s.champcoach.teams, [roundId]: { ...team, finalizedAt: undefined } }, used: s.champcoach.used.filter((u) => u.roundId !== roundId) },
    }));

  return (
    <div className="space-y-4">
      <DataBanner />
      <PageHeader title={`Definitief team · ${round.shortName}`} subtitle={<Deadline roundId={roundId} />} action={<RoundSelect value={roundId} onChange={setPicked} filter={(s) => s !== "past"} />} />
      <Card>
        <CardTitle>1-2-2-2</CardTitle>
        <dl className="space-y-1 text-sm">
          {lines.map((l) => (
            <div key={l.pos} className="flex gap-3">
              <dt className="w-32 text-[var(--color-muted)]">{LABEL[l.pos]}</dt>
              <dd>{l.ids.map((id) => (id === team.captainId ? `${name(id)} (C)` : name(id))).join(", ") || "–"}</dd>
            </div>
          ))}
        </dl>
      </Card>
      {violations.length > 0 ? (
        <Notice tone="bad">
          <ul className="list-disc pl-4">{violations.map((v, i) => <li key={i}>{v.message}</li>)}</ul>
        </Notice>
      ) : (
        <Notice tone="ok">Team voldoet aan alle regels.</Notice>
      )}
      <div className="flex flex-wrap gap-2">
        <Button
          variant="secondary"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(text);
              setCopied(true);
            } catch {
              setCopied(false);
            }
          }}
        >
          {copied ? "Gekopieerd" : "Kopieer team"}
        </Button>
        {team.finalizedAt ? (
          <Button variant="ghost" onClick={undo}>Team gereed ongedaan maken</Button>
        ) : (
          <Button onClick={finalize} disabled={violations.length > 0}>Team gereed</Button>
        )}
      </div>
      {team.finalizedAt && (
        <Notice tone="ok">
          Gemarkeerd als gereed op {fmtDateTime(team.finalizedAt)}. De zeven spelers staan nu als gebruikt in deze fase. Vergeet niet het team zelf bij de aanbieder in te voeren; Fantasy Coach doet dat niet voor je.
        </Notice>
      )}
    </div>
  );
}
