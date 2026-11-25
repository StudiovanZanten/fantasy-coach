import { seedAdapter } from "./adapters/seed";
import type { DataSourceAdapter } from "./adapters/types";

/**
 * Kiest de actieve databron. Vandaag altijd de seedadapter; zodra live adapters bestaan
 * kan hier per spel/datatype een CompositeAdapter worden teruggegeven.
 */
export function getDataAdapter(): DataSourceAdapter {
  return seedAdapter;
}
