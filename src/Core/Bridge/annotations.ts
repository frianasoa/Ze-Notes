/**
 * Making PDF highlights from JSON a page sends — `POST /zotero/v1/annotations`.
 *
 * The saving and its validation live in `../Annotate/`, shared with the reading pass; this
 * route is one of its two callers. Kept as a file so `routes.ts` and `API.md` keep pointing at
 * the bridge's own name for it.
 */
export { createAnnotations, MAX_BATCH } from "../Annotate";
export type { SlotResult } from "../Annotate";
