import type { CuratedOpening } from "../../src/lib/types";
import { whiteOpenings } from "./white";
import { blackE4Openings } from "./black-e4";
import { blackD4Openings } from "./black-d4";
import { recognizeOpenings } from "./recognize";

export { traps } from "./traps";
export { patterns } from "./patterns";

export const curatedOpenings: CuratedOpening[] = [
  ...whiteOpenings,
  ...blackE4Openings,
  ...blackD4Openings,
  ...recognizeOpenings,
];

/** The recommended starter repertoire for players around 1000. */
export const starterRepertoire = {
  white: ["italian-game"],
  black: ["e5-open-game", "two-knights-defence", "queens-gambit-declined"],
};
