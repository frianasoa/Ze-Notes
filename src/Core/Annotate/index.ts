/**
 * Making PDF highlights from JSON — AI zone (see `src/Core/Extensions.ts`).
 *
 * Shared by the two features that make highlights: the bridge route
 * `POST /zotero/v1/annotations` (a page such as Clew sends the JSON) and the reading pass
 * (`../Reading/`, an AI proposes, a person accepts). Both have worked out where a quote sits;
 * this is the saving, and nothing more: `Zotero.Annotations.saveFromJSON`, the call the reader
 * itself uses, behind a validation that runs first. Moved here from `Bridge/annotations.ts` on
 * 2026-10-26 so that the two cannot drift apart.
 *
 * Only text-anchored kinds. Ink, image and sticky-note annotations are drawn by a person in
 * the reader, and nothing a page computes describes them well.
 *
 * Each annotation in a batch is judged on its own: a reading pass proposes many at once, and
 * one bad rectangle should not cost the other ninety-nine.
 */

/** The batch cap. A reading pass over one paper stays well under it. */
export const MAX_BATCH = 100;

const TYPES = ["highlight", "underline"] as const;

/**
 * Zotero's own palette — the eight swatches the reader offers. Anything else would be stored
 * and then shown by that same swatch row as no colour at all, which is worse than a refusal.
 */
const COLORS = ["#ffd400", "#ff6666", "#5fb236", "#2ea8e5", "#a28ae5", "#e56eee", "#f19837", "#aaaaaa"];

const MAX_RECTS = 200;
const MAX_TEXT = 10000;
const MAX_TAGS = 20;
const MAX_PAGE_LABEL = 100;

/** `PPPPP|OOOOOO|TTTTT`: page, offset on the page, distance from the top — as the reader writes it. */
const SORT_INDEX = /^\d{5}\|\d{6}\|\d{5}$/;

/** A Zotero object key: eight characters from Zotero's own alphabet, which has no 0, 1, O or I. */
const OBJECT_KEY = /^[23456789ABCDEFGHIJKLMNPQRSTUVWXYZ]{8}$/;

/** The size Zotero refuses a stored position over; the reader splits one larger than this. */
function positionMax(): number {
  const max = (Zotero.Annotations as any).ANNOTATION_POSITION_MAX_SIZE;
  return typeof max === "number" && max > 0 ? max : 65000;
}

function newKey(): string {
  const utils = (Zotero as any).DataObjectUtilities;
  if (typeof utils?.generateKey === "function") return utils.generateKey();
  return (Zotero.Utilities as any).generateObjectKey();
}

export type SlotResult =
  | { key: string; created: boolean; dateModified: string }
  | { error: string; message: string };

class Refused extends Error {
  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

function refuse(code: string, message: string): never {
  throw new Refused(code, message);
}

interface Proposal {
  attachmentKey: string;
  key: string | null;
  type: (typeof TYPES)[number];
  text: string;
  comment: string;
  color: string;
  pageLabel: string;
  sortIndex: string;
  position: { pageIndex: number; rects: number[][] };
  tags: string[];
}

function optionalString(raw: unknown, field: string, max: number): string {
  if (raw === undefined || raw === null) return "";
  if (typeof raw !== "string") refuse("bad_request", `${field} must be a string`);
  if (raw.length > max) refuse("too_long", `${field} is over ${max} characters`);
  return raw;
}

/**
 * Everything checked before Zotero is touched. The position is rebuilt from the two fields it
 * needs rather than passed through, so nothing else a page puts in it reaches the database.
 */
function proposalFrom(raw: any): Proposal {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) refuse("bad_request", "not an object");

  const attachmentKey = typeof raw.attachmentKey === "string" ? raw.attachmentKey : "";
  if (!attachmentKey) refuse("bad_request", "attachmentKey is required");

  let key: string | null = null;
  if (raw.key !== undefined && raw.key !== null) {
    if (typeof raw.key !== "string" || !OBJECT_KEY.test(raw.key)) {
      refuse("bad_key", "key must be a Zotero object key: eight characters, 2-9 and A-Z without O or I");
    }
    key = raw.key;
  }

  if (!TYPES.includes(raw.type)) refuse("bad_type", `type must be one of ${TYPES.join(", ")}`);

  const text = optionalString(raw.text, "text", MAX_TEXT);
  const comment = optionalString(raw.comment, "comment", MAX_TEXT);

  const color = typeof raw.color === "string" ? raw.color.toLowerCase() : "";
  if (!COLORS.includes(color)) refuse("bad_color", `color must be one of ${COLORS.join(" ")}`);

  const sortIndex = typeof raw.sortIndex === "string" ? raw.sortIndex : "";
  if (!SORT_INDEX.test(sortIndex)) refuse("bad_sort_index", "sortIndex must look like 00001|000328|00252");

  const position = raw.position;
  const pageIndex = position?.pageIndex;
  if (!Number.isInteger(pageIndex) || pageIndex < 0) {
    refuse("bad_position", "position.pageIndex must be a whole number of zero or more");
  }
  const rects = position?.rects;
  if (!Array.isArray(rects) || rects.length < 1 || rects.length > MAX_RECTS) {
    refuse("bad_position", `position.rects must hold 1 to ${MAX_RECTS} rectangles`);
  }
  for (const rect of rects) {
    if (!Array.isArray(rect) || rect.length !== 4 || !rect.every((n) => typeof n === "number" && Number.isFinite(n))) {
      refuse("bad_position", "each rectangle must be four finite numbers");
    }
  }
  const clean = { pageIndex: pageIndex as number, rects: rects.map((rect: number[]) => rect.slice()) };
  if (JSON.stringify(clean).length > positionMax()) {
    refuse("bad_position", `position is over ${positionMax()} characters as JSON`);
  }

  // The reader labels a page with what the PDF calls it; a page that does not say gets the
  // page's number, which is what the reader falls back to as well.
  const pageLabel =
    raw.pageLabel === undefined || raw.pageLabel === null
      ? String(clean.pageIndex + 1)
      : optionalString(raw.pageLabel, "pageLabel", MAX_PAGE_LABEL);

  let tags: string[] = [];
  if (raw.tags !== undefined && raw.tags !== null) {
    if (!Array.isArray(raw.tags) || raw.tags.length > MAX_TAGS) {
      refuse("bad_tags", `tags must be a list of at most ${MAX_TAGS} strings`);
    }
    for (const tag of raw.tags) {
      if (typeof tag !== "string" || tag.trim() === "") refuse("bad_tags", "each tag must be a non-empty string");
    }
    tags = [...new Set<string>(raw.tags.map((tag: string) => tag.trim()))];
  }

  return {
    attachmentKey,
    key,
    type: raw.type,
    text,
    comment,
    color,
    pageLabel,
    sortIndex,
    position: clean,
    tags,
  };
}

/** The attachment a proposal names: a PDF, in a library this Zotero may write to. */
function attachmentFor(libraryID: number, key: string): any {
  const attachment: any = Zotero.Items.getByLibraryAndKey(libraryID, key);
  if (!attachment?.isAttachment?.()) refuse("not_found", `No attachment ${key}`);
  if (String(attachment.attachmentContentType ?? "") !== "application/pdf") {
    refuse("not_a_pdf", `${key} is not a PDF`);
  }
  if (!(Zotero.Libraries.get(attachment.libraryID) as any)?.editable) {
    refuse("read_only", "That library cannot be edited");
  }
  return attachment;
}

async function createOne(libraryID: number, raw: unknown): Promise<SlotResult> {
  const proposal = proposalFrom(raw);
  const attachment = attachmentFor(libraryID, proposal.attachmentKey);

  // Idempotency. A client may send the key it generated, so a repeat after a lost reply finds
  // the first one and makes nothing — a lost reply would otherwise mean a whole batch twice.
  // Keys are unique per library, so one on anything else cannot be reused here.
  if (proposal.key) {
    const existing: any = Zotero.Items.getByLibraryAndKey(attachment.libraryID, proposal.key);
    if (existing) {
      if (existing.isAnnotation?.() && existing.parentItemID === attachment.id) {
        return { key: existing.key, created: false, dateModified: existing.dateModified };
      }
      refuse("key_taken", `${proposal.key} is already another item's key`);
    }
  }

  const saved: any = await Zotero.Annotations.saveFromJSON(attachment, {
    key: proposal.key ?? newKey(),
    type: proposal.type,
    text: proposal.text,
    comment: proposal.comment,
    color: proposal.color,
    pageLabel: proposal.pageLabel,
    sortIndex: proposal.sortIndex,
    position: proposal.position,
    // `{ name }`, not strings: `saveFromJSON` reads `tag.name`.
    tags: proposal.tags.map((name) => ({ name })),
  } as any);

  // Whether `saveFromJSON` sets tags has varied between Zotero versions, so the ones it did
  // not set are added here. A tag is the annotation's column in both tables; one dropped
  // silently would put the highlight somewhere nobody asked for.
  const has = new Set(saved.getTags().map((t: any) => t.tag));
  const missing = proposal.tags.filter((tag) => !has.has(tag));
  if (missing.length > 0) {
    for (const tag of missing) saved.addTag(tag);
    await saved.saveTx({ skipSelect: true });
  }

  const reread: any = Zotero.Items.get(saved.id);
  return { key: reread.key, created: true, dateModified: reread.dateModified };
}

/**
 * Creates each proposal in order, one at a time. A refused one takes its place in the results
 * as `{ error, message }` and its neighbours carry on.
 */
export async function createAnnotations(libraryID: number, proposals: unknown[]): Promise<SlotResult[]> {
  const results: SlotResult[] = [];
  for (const raw of proposals) {
    try {
      results.push(await createOne(libraryID, raw));
    } catch (e) {
      if (e instanceof Refused) {
        results.push({ error: e.code, message: e.message });
      } else {
        // Zotero's own refusal, after validation passed. The message is Zotero's, never the
        // request's content, so it is safe to hand back.
        results.push({ error: "save_failed", message: String((e as Error)?.message ?? e) });
      }
    }
  }
  return results;
}

/** A highlight on `attachmentKey`'s PDF, by its key, or a refusal saying why it is not one. */
function annotationOn(libraryID: number, attachmentKey: string, key: string): any {
  const attachment = attachmentFor(libraryID, attachmentKey);
  const annotation: any = Zotero.Items.getByLibraryAndKey(libraryID, key);
  if (!annotation?.isAnnotation?.() || annotation.parentItemID !== attachment.id) {
    refuse("not_found", `No highlight ${key} on that PDF`);
  }
  return annotation;
}

export type EditResult = { ok: true; dateModified: string } | { ok: false; error: string; message: string };

const failed = (e: unknown): EditResult =>
  e instanceof Refused
    ? { ok: false, error: e.code, message: e.message }
    : { ok: false, error: "save_failed", message: String((e as Error)?.message ?? e) };

/**
 * Changes a saved highlight: its comment, its colour, and one tag for another (the column it moves
 * from and the one it moves to). Only those: the quoted words and the place on the page are the
 * paper's and stay as they are, and tags the highlight has besides are left alone.
 */
export async function editAnnotation(
  libraryID: number,
  attachmentKey: string,
  key: string,
  change: { comment?: string; color?: string; fromTag?: string; toTag?: string },
): Promise<EditResult> {
  try {
    const annotation = annotationOn(libraryID, attachmentKey, key);
    if (change.color !== undefined) {
      const color = change.color.toLowerCase();
      if (!COLORS.includes(color)) refuse("bad_color", `color must be one of ${COLORS.join(" ")}`);
      annotation.annotationColor = color;
    }
    if (change.comment !== undefined) {
      if (change.comment.length > MAX_TEXT) refuse("too_long", `comment is over ${MAX_TEXT} characters`);
      annotation.annotationComment = change.comment;
    }
    if (change.fromTag !== change.toTag) {
      if (change.fromTag) annotation.removeTag(change.fromTag);
      if (change.toTag?.trim()) annotation.addTag(change.toTag.trim());
    }
    await annotation.saveTx({ skipSelect: true });
    return { ok: true, dateModified: annotation.dateModified };
  } catch (e) {
    return failed(e);
  }
}

/** Deletes a highlight from its PDF, after checking that it is one, on that PDF. */
export async function deleteAnnotation(libraryID: number, attachmentKey: string, key: string): Promise<EditResult> {
  try {
    const annotation = annotationOn(libraryID, attachmentKey, key);
    await annotation.eraseTx();
    return { ok: true, dateModified: "" };
  } catch (e) {
    return failed(e);
  }
}
