import type { Dataset } from "@/engine/recommend/dataset";

/**
 * Contract voor databronnen. Een live bron implementeert dezelfde vorm; de app hoeft dan
 * niet te veranderen. `isMock` zorgt dat de UI altijd een "Demodata"-label toont.
 */
export interface DataMeta {
  sourceId: string;
  label: string;
  isMock: boolean;
  updatedAt: string;
  notes?: string;
}

export interface DemoClock {
  id: string;
  label: string;
  now: string;
}

export interface GameBundle {
  gameId: string;
  meta: DataMeta;
  dataset: Dataset;
  /** Alleen bij demodata: vaste tijdstippen om scenario's te tonen. */
  demoClocks: DemoClock[];
}

export interface DataSourceAdapter {
  meta: Omit<DataMeta, "updatedAt">;
  getGameBundle(gameId: string): Promise<GameBundle | null>;
}

/** Registratie van (toekomstige) databronnen, met status en voorwaarden. */
export interface DataSourceInfo {
  id: string;
  name: string;
  kind: "official" | "secondary" | "statistics" | "odds" | "manual";
  dataTypes: string[];
  access: "api-free" | "api-paid" | "no-public-api" | "manual" | "rss";
  connected: boolean;
  url?: string;
  notes: string;
}
