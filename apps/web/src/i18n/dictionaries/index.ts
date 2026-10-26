import type { Lang } from "../locales";
import { en } from "./en";
import { oz } from "./oz";
import { ru } from "./ru";
import { tr } from "./tr";
import type { Dictionary } from "./types";
import { uz } from "./uz";

export const DICTIONARIES: Record<Lang, Dictionary> = { uz, oz, ru, en, tr };

export { format } from "../format";

export type { Dictionary };
