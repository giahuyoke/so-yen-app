export const UNITS = ["g", "piece"] as const;
export type Unit = (typeof UNITS)[number];
