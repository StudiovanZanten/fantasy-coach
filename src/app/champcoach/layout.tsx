import { getDataAdapter } from "@/data";
import { GameDataProvider } from "@/components/providers/game-data";
import { notFound } from "next/navigation";

export default async function Layout({ children }: { children: React.ReactNode }) {
  const bundle = await getDataAdapter().getGameBundle("champ-coach");
  if (!bundle) notFound();
  return <GameDataProvider bundle={bundle}>{children}</GameDataProvider>;
}
