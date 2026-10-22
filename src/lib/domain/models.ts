export const UNITS = ["g", "piece"] as const;
export type Unit = (typeof UNITS)[number];

export const PRODUCTION_KINDS = ["clean", "steam", "pack"] as const;
export type ProductionKind = (typeof PRODUCTION_KINDS)[number];
