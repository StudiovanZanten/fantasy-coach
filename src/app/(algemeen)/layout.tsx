import { getDataAdapter } from "@/data";
import { ActiveGameProvider } from "@/components/providers/active-game";
import type { GameBundle } from "@/data/adapters/types";

export default async function Layout({ children }: { children: React.ReactNode }) {
  const a = getDataAdapter();
  const bundles = (await Promise.all(["topcoach-eredivisie", "champ-coach", "wk-darts"].map((id) => a.getGameBundle(id)))).filter((b): b is GameBundle => Boolean(b));
  return <ActiveGameProvider bundles={bundles}>{children}</ActiveGameProvider>;
}
