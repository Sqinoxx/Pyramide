/** Phone layout of the pyramid on the start page: stacked rows or the real triangle. */
export type PyramidLayout = "liste" | "pyramide";

export const PYRAMID_LAYOUT_COOKIE = "pyramidenansicht";

export function parsePyramidLayout(value: string | undefined): PyramidLayout {
  return value === "pyramide" ? "pyramide" : "liste";
}
