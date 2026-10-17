/**
 * The route table. Every handler runs after `security.authorise()` has already passed, so
 * none of them repeats the Host, Origin or token checks; write handlers do check the
 * "Allow writes" switch, because that is per-route rather than per-request.
 *
 * Milestone 2 routes are described in `API.md` and deliberately absent here. `/presets`
 * answers 404 `not_implemented` rather than 404 `no_route`, so a client can tell "this will
 * exist" from "you have the URL wrong".
 */
import NoteActions from "../Actions/NoteActions";
import Changes from "./changes";
import { buildMatrix } from "./matrix";
import { patchFrom, readSettings, RevisionMismatch, writeSettings } from "./settings";
import { BridgePrefs, redact } from "./prefs";
import { capabilities, DENIED_CODE } from "./security";
import { catalogue, characterCap, job, pieceFor, start } from "./commands";
import type { Piece, TargetRef } from "./commands";
import type { Capability } from "./prefs";
import type { BridgeRequest, BridgeResponse } from "./http";
import { header, query, readBody, sendBytes, sendError, sendJson } from "./http";

export interface RouteContext {
  request: BridgeRequest;
  response: BridgeResponse;
  origin: string | null;
  bootId: string;
  pluginVersion: string;
}

/**
 * The user library's own Zotero URI, or `null` when this Zotero will not say.
 *
 * `http://zotero.org/users/12345` when this Zotero syncs, and
 * `http://zotero.org/users/local/AbCdEfGh` when it does not. It is in `/status` because it is
 * the one thing a client cannot work out for itself: a client already learns every item's
 * **key**, and a group library's id arrives with the item, so a group item's URI can be
 * assembled without help. The user library's cannot — the number, or the local key, lives only
 * inside this Zotero.
 *
 * What it is for: Zotero matches a citation in a Word document back to a library item by
 * exactly this URI plus the item key, which is how Zotero's own Word plugin stores one.
 * Without it a document written elsewhere carries the citation's data but no link, and Zotero
 * has to ask which item was meant.
 *
 * It names a library, not a person: no username, no key material, and nothing that is not
 * already written into every `.docx` Zotero itself produces.
 *
 * `Zotero.URI` is asked first because it is what Zotero uses on its own citations, so the
 * answer matches by construction. The fallback exists because a bridge that returns `null`
 * costs a feature, and one that throws costs the whole handshake.
 */
function userLibraryUri(): string | null {
  try {
    const uri = (Zotero as any).URI?.getLibraryURI?.(Zotero.Libraries.userLibraryID);
    if (typeof uri === "string" && uri) return uri;
  } catch {
    /* fall through to building it by hand */
  }
  try {
    const users = (Zotero as any).Users;
    const id = users?.getCurrentUserID?.();
    if (typeof id === "number" && id > 0) return `http://zotero.org/users/${id}`;
    const local = users?.getLocalUserKey?.();
    if (typeof local === "string" && local) return `http://zotero.org/users/local/${local}`;
  } catch {
    /* an unsynced Zotero that has not minted a local key yet: say so rather than guess */
  }
  return null;
}

/** Resolved once per request; `?library=` overrides the user library. */
function libraryID(request: BridgeRequest): number {
  const asked = parseInt(query(request).get("library") ?? "", 10);
  return Number.isFinite(asked) && asked > 0 ? asked : Zotero.Libraries.userLibraryID;
}

function collectionFor(request: BridgeRequest, key: string): any | null {
  const collection = Zotero.Collections.getByLibraryAndKey(libraryID(request), key);
  return collection || null;
}

function itemFor(request: BridgeRequest, key: string): any | null {
  const item = Zotero.Items.getByLibraryAndKey(libraryID(request), key);
  return item || null;
}

/**
 * The biggest image the bridge will send. Generous, because a note can hold a scan of a
 * whole page, but bounded: this reads the file into memory before writing it.
 */
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

/** The biggest PDF `…/attachments/:key/file` will send: Clew's own import cap for a file. */
const MAX_FILE_BYTES = 64 * 1024 * 1024;

/** An attachment's file on disk. `getFilePathAsync` resolves linked files too. */
async function filePathOf(attachment: any): Promise<string | null> {
  try {
    if (typeof attachment.getFilePathAsync === "function") {
      return (await attachment.getFilePathAsync()) || null;
    }
    return attachment.getFilePath?.() || null;
  } catch {
    return null;
  }
}

/** Shared tail of both image routes: exists, is not enormous, goes out as bytes. */
async function sendImage(ctx: RouteContext, path: string | null, contentType: string): Promise<void> {
  if (!path || !(await IOUtils.exists(path))) {
    return sendError(ctx.response, 404, "no_image_file", "No image file for this item", ctx.origin);
  }
  const { size } = await IOUtils.stat(path);
  if ((size ?? 0) > MAX_IMAGE_BYTES) {
    return sendError(ctx.response, 413, "image_too_large", `Image is over ${MAX_IMAGE_BYTES} bytes`, ctx.origin);
  }
  sendBytes(ctx.response, await IOUtils.read(path), contentType, ctx.origin);
}

function noteSummary(note: any): Record<string, unknown> {
  return {
    key: note.key,
    parentKey: note.parentItem?.key ?? null,
    dateModified: note.dateModified,
    tags: note.getTags().map((t: any) => t.tag),
    html: note.getNote(),
  };
}

/** `Zotero.Attachments.LINK_MODE_*` as the wire's lower-case, underscored names. */
function linkModeName(mode: unknown): string {
  switch (mode) {
    case Zotero.Attachments.LINK_MODE_IMPORTED_FILE:
      return "imported_file";
    case Zotero.Attachments.LINK_MODE_IMPORTED_URL:
      return "imported_url";
    case Zotero.Attachments.LINK_MODE_LINKED_FILE:
      return "linked_file";
    case Zotero.Attachments.LINK_MODE_LINKED_URL:
      return "linked_url";
    case Zotero.Attachments.LINK_MODE_EMBEDDED_IMAGE:
      return "embedded_image";
    default:
      return "unknown";
  }
}

/**
 * Metadata only — never bytes. A linked URL attachment has no file, so `filename` is `""`
 * and `isFile` is false; every other link mode names a file on disk (imported, a snapshot,
 * linked-in-place, or an embedded image), so `isFile` is true for the rest.
 */
function attachmentSummary(attachment: any): Record<string, unknown> {
  let linkMode: unknown = null;
  try {
    linkMode = attachment.attachmentLinkMode;
  } catch {
    linkMode = null;
  }
  const isFile = linkMode !== Zotero.Attachments.LINK_MODE_LINKED_URL;
  let filename = "";
  if (isFile) {
    try {
      filename = attachment.attachmentFilename || "";
    } catch {
      filename = "";
    }
  }
  let title = "";
  try {
    title = attachment.getField ? attachment.getField("title") || "" : "";
  } catch {
    title = "";
  }
  return {
    key: attachment.key,
    title,
    filename,
    contentType: String(attachment.attachmentContentType ?? ""),
    linkMode: linkModeName(linkMode),
    isFile,
  };
}

function annotationSummary(annotation: any, attachment: any): Record<string, unknown> {
  return {
    key: annotation.key,
    attachmentKey: attachment?.key ?? null,
    dateModified: annotation.dateModified,
    annotationType: annotation.annotationType,
    text: annotation.annotationText ?? "",
    comment: annotation.annotationComment ?? "",
    pageLabel: annotation.annotationPageLabel ?? "",
    color: annotation.annotationColor ?? "",
    position: annotation.annotationPosition,
    tags: annotation.getTags().map((t: any) => t.tag),
  };
}

/** Child notes of an item that carry `column` as a tag; `""` means "no tags at all". */
function notesForColumn(item: any, column: string): any[] {
  const notes: any[] = [];
  for (const noteID of item.getNotes(false)) {
    const note: any = Zotero.Items.get(noteID);
    if (!note) continue;
    const tags = note.getTags().map((t: any) => t.tag);
    if (column === "" ? tags.length === 0 : tags.includes(column)) notes.push(note);
  }
  return notes;
}

/**
 * Which capability a request needs, decided from the method and the path alone.
 *
 * One table rather than a check inside twenty handlers: a route that forgets to ask is the
 * way a permission model quietly stops being one, and here a new route cannot forget —
 * anything not named below is gated by its method, which fails closed.
 *
 * `null` means the handshake, which needs nothing: `/status` is how a page learns what it
 * may do, so requiring a capability to ask would be a riddle.
 */
function capabilityFor(method: string, path: string): Capability | null {
  if (path === "/status") return null;

  // Running one, and collecting its answer afterwards. The answer is behind `ai` too: a page
  // that may not start a command has no business reading what another one came back with.
  if (path === "/commands" || path.startsWith("/commands/")) return "ai";

  // The catalogue is a read. A page without `ai` still gets the list, with every entry
  // unavailable and a reason saying so - being told why is the difference between a setting
  // somebody can find and a feature that looks broken.

  // The table's own display settings. Reading them is a read; writing them is `arrange`,
  // which is deliberately not `write`: rearranging somebody's table is not rewriting their
  // notes, and a page that may do the first need not be trusted with the second.
  if (/^\/ze-notes\/v1\/collections\/[A-Z0-9]+\/settings$/i.test(path)) {
    return method === "PUT" ? "arrange" : "read";
  }

  // A whole file out of the library is its own consent, not a kind of read (FILES column).
  if (/^\/zotero\/v1\/attachments\/[A-Z0-9]+\/file$/i.test(path)) return "files";

  if (method === "GET") return "read";
  return "write";
}

const Routes = {
  async handle(ctx: RouteContext): Promise<void> {
    const { request, response, origin } = ctx;
    const method = request.method;
    const path = request.path;

    // What this page may do, asked once and before any work. `authorise()` has already said
    // it may talk to us at all; this says what talking gets it.
    const can = capabilities(origin);
    const needed = capabilityFor(method, path);
    if (needed !== null && !can[needed]) {
      return sendError(
        response,
        403,
        DENIED_CODE[needed],
        `This origin is not allowed to ${needed} — Ze-Notes settings, Browser bridge`,
        origin,
      );
    }

    if (method === "GET" && path === "/status") return this.status(ctx);
    if (method === "GET" && path === "/capabilities") return this.capabilities(ctx, can.ai);

    if (path.startsWith("/commands/")) {
      const rest = path.slice("/commands/".length);
      const jobId = rest.match(/^jobs\/([A-Za-z0-9]+)$/);
      if (method === "GET" && jobId) return this.job(ctx, jobId[1]!);
      if (method === "POST" && rest !== "" && !rest.includes("/")) {
        return this.runCommand(ctx, decodeURIComponent(rest));
      }
    }

    if (path.startsWith("/ze-notes/v1/")) {
      const rest = path.slice("/ze-notes/v1/".length);

      if (method === "GET" && rest === "collections") return this.collections(ctx);
      if (method === "GET" && rest === "changes") return this.changes(ctx);
      if (method === "GET" && rest === "presets") {
        return sendError(response, 404, "not_implemented", "Saved presets are Milestone 2; see API.md", origin);
      }

      const matrix = rest.match(/^collections\/([A-Z0-9]+)\/matrix$/i);
      if (method === "GET" && matrix) return this.matrix(ctx, matrix[1]);

      const settings = rest.match(/^collections\/([A-Z0-9]+)\/settings$/i);
      if (method === "GET" && settings) return this.settings(ctx, settings[1]);
      if (method === "PUT" && settings) return this.putSettings(ctx, settings[1]);

      const cells = rest.match(/^collections\/([A-Z0-9]+)\/cells$/i);
      if (method === "PUT" && cells) return this.putCell(ctx, cells[1]);

      const notes = rest.match(/^collections\/([A-Z0-9]+)\/notes$/i);
      if (method === "POST" && notes) return this.postNote(ctx, notes[1]);
    }

    if (path.startsWith("/zotero/v1/")) {
      const rest = path.slice("/zotero/v1/".length);

      const notes = rest.match(/^items\/([A-Z0-9]+)\/notes$/i);
      if (method === "GET" && notes) return this.itemNotes(ctx, notes[1]);

      const annotations = rest.match(/^items\/([A-Z0-9]+)\/annotations$/i);
      if (method === "GET" && annotations) return this.itemAnnotations(ctx, annotations[1]);

      const attachments = rest.match(/^items\/([A-Z0-9]+)\/attachments$/i);
      if (method === "GET" && attachments) return this.itemAttachments(ctx, attachments[1]);

      const item = rest.match(/^items\/([A-Z0-9]+)$/i);
      if (method === "GET" && item) return this.item(ctx, item[1]);

      const note = rest.match(/^notes\/([A-Z0-9]+)$/i);
      if (method === "PATCH" && note) return this.patchNote(ctx, note[1]);
      if (method === "DELETE" && note) return this.deleteNote(ctx, note[1]);

      const annotation = rest.match(/^annotations\/([A-Z0-9]+)$/i);
      if (method === "PATCH" && annotation) return this.patchAnnotation(ctx, annotation[1]);

      // The image routes. Reads, so deliberately *not* behind "Allow writes" — but behind
      // the Host, Origin and token gate like everything else, because `authorise()` has
      // already run by the time any of this is reached.
      const annotationImage = rest.match(/^annotations\/([A-Z0-9]+)\/image$/i);
      if (method === "GET" && annotationImage) return this.annotationImage(ctx, annotationImage[1]);

      const attachmentImage = rest.match(/^attachments\/([A-Z0-9]+)\/image$/i);
      if (method === "GET" && attachmentImage) return this.attachmentImage(ctx, attachmentImage[1]);

      // A PDF, whole. Behind `files`, which `capabilityFor()` has already asked.
      const attachmentFile = rest.match(/^attachments\/([A-Z0-9]+)\/file$/i);
      if (method === "GET" && attachmentFile) return this.attachmentFile(ctx, attachmentFile[1]);
    }

    return sendError(response, 404, "no_route", `No route for ${method} ${path}`, origin);
  },

  status(ctx: RouteContext): void {
    sendJson(
      ctx.response,
      200,
      {
        plugin: "ze-notes",
        pluginVersion: ctx.pluginVersion,
        zoteroVersion: Zotero.version,
        // 2 added the two `…/image` routes; 3 added deleting a note and editing an
        // annotation comment; 4 added column widths in the settings contract and
        // `GET …/items/:key/attachments`; 5 keys the untagged column's colours `""` like
        // every other mention of it, instead of under the renameable label; 6 adds
        // `userLibraryUri`; 7 adds `/capabilities` and the command routes; 8 adds
        // `POST …/collections/:key/notes`, which is how a new row is made. A client that only
        // knows an earlier number keeps working: it simply never offers what it has not heard
        // of, and a write it sends under the old label key is still understood.
        // `can.files` (no version): `GET …/attachments/:key/file`. A bridge without the route
        // never lists the key.
        bridgeApi: 8,
        userLibraryUri: userLibraryUri(),
        bootId: ctx.bootId,
        seq: Changes.seq,
        // What this page may do, so it can offer only what will work. `writeEnabled` is the
        // same answer as `can.write` and stays because clients read it; it now means "this
        // page may write" rather than "writes are on for everybody", which is what a client
        // always wanted it to mean.
        can: capabilities(ctx.origin),
        writeEnabled: capabilities(ctx.origin).write,
        tokenRequired: BridgePrefs.requireToken(),
        streams: Changes.streamCount(),
      },
      ctx.origin,
    );
  },

  /**
   * What this Zotero can be asked to run.
   *
   * The whole list either way. `allowed` is whether this page has the `ai` box ticked, and a
   * page that has not still sees the commands, greyed, with the reason: somebody who cannot
   * see that "Summarise" exists goes looking for a bug instead of for a checkbox.
   */
  async capabilities(ctx: RouteContext, allowed: boolean): Promise<void> {
    const commands = (await catalogue()).map((command) => ({
      id: command.id,
      label: command.label,
      available: allowed && command.available,
      ...(allowed
        ? command.why
          ? { why: command.why }
          : {}
        : { why: "This page is not allowed to run commands - Ze-Notes settings, Browser bridge" }),
    }));
    sendJson(ctx.response, 200, { commands }, ctx.origin);
  },

  /**
   * Runs one command on a list of targets.
   *
   * In order: the allowlist, then the targets, then the cap, then the work. An id that is not
   * in the catalogue is a 404 and is never looked at again - nothing a page sends reaches an
   * evaluator, a prompt, or a provider, and the only strings that travel inbound are ids from
   * that list and Zotero keys.
   */
  async runCommand(ctx: RouteContext, id: string): Promise<void> {
    const { response, origin } = ctx;

    const spec = (await catalogue()).find((command) => command.id === id);
    if (!spec) return sendError(response, 404, "unknown_command", `No command ${id}`, origin);
    if (!spec.available) {
      return sendError(response, 409, "command_unavailable", spec.why ?? "That command cannot run", origin);
    }

    const body = readBody(ctx.request);
    if (body === null) return sendError(response, 413, "too_large", "Request body is over 2 MB", origin);

    let parsed: any;
    try {
      parsed = JSON.parse(body);
    } catch (e) {
      return sendError(response, 400, "bad_json", String(e), origin);
    }

    const targets: TargetRef[] = Array.isArray(parsed?.targets)
      ? parsed.targets.flatMap((raw: any) => {
          const key = typeof raw?.key === "string" ? raw.key : "";
          if (!key) return [];
          const part = typeof raw?.part === "string" ? raw.part : undefined;
          return [{ key, ...(part === undefined ? {} : { part }), ...(raw?.quote === true ? { quote: true } : {}) }];
        })
      : [];
    if (targets.length === 0) {
      return sendError(response, 400, "bad_request", "targets is required and must name at least one key", origin);
    }

    // Resolved here, in the order the page gave them: that order is the page's own reading of
    // its table and the answer depends on it, which is the whole reason the list comes from
    // there rather than being worked out at this end.
    const pieces: Piece[] = [];
    for (const target of targets) {
      const piece = pieceFor(itemFor(ctx.request, target.key), target);
      if (piece) pieces.push(piece);
    }
    if (pieces.length === 0) {
      return sendError(response, 404, "not_found", "None of those keys holds any text", origin);
    }

    const size = pieces.reduce((total, piece) => total + piece.value.length, 0);
    const cap = characterCap();
    if (size > cap) {
      // Refused rather than trimmed: a summary of whichever half happened to fit is worse
      // than no summary, and only this end knows what the model will take.
      return sendError(
        response,
        413,
        "too_large",
        `That is ${size} characters and the limit is ${cap}`,
        origin,
      );
    }

    const started = start(spec, pieces);
    sendJson(response, 200, { jobId: started.jobId, pieces: pieces.length, characters: size }, origin);
  },

  /** How a job is getting on, and what it came to. */
  job(ctx: RouteContext, jobId: string): void {
    const found = job(jobId);
    if (!found) return sendError(ctx.response, 404, "not_found", `No job ${jobId}`, ctx.origin);
    sendJson(
      ctx.response,
      200,
      {
        jobId: found.jobId,
        state: found.state,
        done: found.done,
        total: found.total,
        ...(found.state === "done" ? { answer: found.answer } : {}),
        ...(found.state === "failed"
          ? { error: { code: "command_failed", message: found.message } }
          : {}),
      },
      ctx.origin,
    );
  },

  collections(ctx: RouteContext): void {
    const collections: Array<Record<string, unknown>> = [];
    for (const library of Zotero.Libraries.getAll()) {
      for (const collection of Zotero.Collections.getByLibrary(library.libraryID, true)) {
        const c: any = collection;
        collections.push({
          key: c.key,
          name: c.name,
          libraryID: c.libraryID,
          parentKey: c.parentKey || null,
        });
      }
    }
    sendJson(ctx.response, 200, { collections }, ctx.origin);
  },

  async matrix(ctx: RouteContext, key: string): Promise<void> {
    const collection = collectionFor(ctx.request, key);
    if (!collection) {
      return sendError(ctx.response, 404, "not_found", "No such collection", ctx.origin);
    }
    sendJson(ctx.response, 200, await buildMatrix(collection), ctx.origin);
  },

  async settings(ctx: RouteContext, key: string): Promise<void> {
    const collection = collectionFor(ctx.request, key);
    if (!collection) {
      return sendError(ctx.response, 404, "not_found", "No such collection", ctx.origin);
    }
    const { value, redacted } = redact(await readSettings(collection));
    sendJson(ctx.response, 200, { ...(value as object), redacted }, ctx.origin);
  },

  /**
   * Changes what the table shows. This writes the very rows Ze-Notes' own menus write, so
   * the plugin and this page always agree; an open table picks the change up on its next
   * reload, and every client hears about it on the change stream.
   */
  async putSettings(ctx: RouteContext, key: string): Promise<void> {
    const { response, origin } = ctx;
    const collection = collectionFor(ctx.request, key);
    if (!collection) return sendError(response, 404, "not_found", "No such collection", origin);

    const raw = readBody(ctx.request);
    if (raw === null) {
      return sendError(response, 413, "too_large", "Request body is over 2 MB", origin);
    }
    let body: unknown;
    try {
      body = JSON.parse(raw);
    } catch (e) {
      return sendError(response, 400, "bad_json", String(e), origin);
    }

    const ifRev = (body as Record<string, unknown>)?.["ifRev"];
    try {
      const saved = await writeSettings(collection, patchFrom(body), typeof ifRev === "string" ? ifRev : undefined);
      Changes.settingsChanged(String(collection.id));
      const { value, redacted } = redact(saved);
      sendJson(response, 200, { ...(value as object), redacted }, origin);
    } catch (e) {
      if (e instanceof RevisionMismatch) {
        const { value } = redact(e.current);
        return sendJson(
          response,
          409,
          {
            error: { code: "stale", message: "The settings changed since that revision" },
            current: value,
          },
          origin,
        );
      }
      throw e;
    }
  },

  changes(ctx: RouteContext): void {
    const since = parseInt(query(ctx.request).get("since") ?? "0", 10) || 0;
    const bootId = query(ctx.request).get("bootId");
    const result = Changes.since(since, bootId);
    sendJson(ctx.response, 200, { bootId: Changes.bootId, seq: Changes.seq, ...result }, ctx.origin);
  },

  item(ctx: RouteContext, key: string): void {
    const item = itemFor(ctx.request, key);
    if (!item) return sendError(ctx.response, 404, "not_found", "No such item", ctx.origin);
    sendJson(
      ctx.response,
      200,
      {
        key: item.key,
        libraryID: item.libraryID,
        itemType: Zotero.ItemTypes.getName(item.itemTypeID),
        dateModified: item.dateModified,
        tags: item.getTags().map((t: any) => t.tag),
        csl: (() => {
          try {
            const u = (Zotero.Utilities as any).Item;
            return u?.itemToCSLJSON ? u.itemToCSLJSON(item) : null;
          } catch {
            return null;
          }
        })(),
      },
      ctx.origin,
    );
  },

  itemNotes(ctx: RouteContext, key: string): void {
    const item = itemFor(ctx.request, key);
    if (!item) return sendError(ctx.response, 404, "not_found", "No such item", ctx.origin);
    const notes = item
      .getNotes(false)
      .map((id: number) => Zotero.Items.get(id))
      .filter(Boolean)
      .map((note: any) => noteSummary(note));
    sendJson(ctx.response, 200, { itemKey: item.key, notes }, ctx.origin);
  },

  itemAnnotations(ctx: RouteContext, key: string): void {
    const item = itemFor(ctx.request, key);
    if (!item) return sendError(ctx.response, 404, "not_found", "No such item", ctx.origin);
    const annotations: Array<Record<string, unknown>> = [];
    if (!item.isAttachment()) {
      for (const attachmentID of item.getAttachments(false)) {
        const attachment: any = Zotero.Items.get(attachmentID);
        if (!attachment?.isFileAttachment()) continue;
        for (const annotation of attachment.getAnnotations(false)) {
          annotations.push(annotationSummary(annotation, attachment));
        }
      }
    } else {
      for (const annotation of item.getAnnotations(false)) {
        annotations.push(annotationSummary(annotation, item));
      }
    }
    sendJson(ctx.response, 200, { itemKey: item.key, annotations }, ctx.origin);
  },

  /**
   * An item's attachments, metadata only — since API 4. This exists so a browser client can
   * offer "open this file in Zotero" (a `zotero://` link it builds itself from `key`); it
   * must never be a way to read a file's bytes out of the library, which is the same
   * boundary the two `…/image` routes draw. `getAttachments()` only exists on a regular
   * item, so a note or an attachment key simply answers an empty list.
   */
  itemAttachments(ctx: RouteContext, key: string): void {
    const item = itemFor(ctx.request, key);
    if (!item) return sendError(ctx.response, 404, "not_found", "No such item", ctx.origin);
    const attachments: Array<Record<string, unknown>> = [];
    if (typeof item.getAttachments === "function") {
      for (const attachmentID of item.getAttachments(false)) {
        const attachment: any = Zotero.Items.get(attachmentID);
        if (!attachment) continue;
        attachments.push(attachmentSummary(attachment));
      }
    }
    sendJson(ctx.response, 200, { attachments }, ctx.origin);
  },

  /**
   * Replace the note behind one cell.
   *
   * A cell can hold several notes; this route only edits an unambiguous one. When the cell
   * holds more than one note it answers 409 with their keys, and the client edits the one
   * it means through `PATCH /zotero/v1/notes/:key`. An empty cell gets a new child note
   * tagged with the column, which is what Ze-Notes' own "create note" does before it opens
   * the editor.
   */
  /**
   * Creates a note — always creates, never replaces.
   *
   * Two shapes, and the difference is one optional field:
   *
   * - **with `itemKey`**: a child note of that item, which is a new thing in that item's row.
   * - **without**: a **standalone note in the collection**, which is a new **row**. Zotero has
   *   no note that belongs to a collection rather than to an item, but it does let a note sit
   *   in a collection on its own, and `Data.collectionitems` returns those like any other item
   *   — `Format.tagged` then has a branch for exactly this case, where the note is its own
   *   cell. So a standalone note already shows up as a row in Ze-Notes' table; this is the way
   *   to make one.
   *
   * `column` is the tag that decides which column it lands in; `""` leaves it untagged, which
   * is the untagged column.
   *
   * Deliberately not `PUT …/cells`: that route means "this cell should say this", so it
   * *replaces* the note already in the cell. An answer from a command is never a replacement
   * for something somebody wrote, and a route that sometimes overwrites is the wrong tool for
   * something a page asks for after a five-minute wait.
   */
  async postNote(ctx: RouteContext, collectionKey: string): Promise<void> {
    const { response, origin } = ctx;
    const collection: any = collectionFor(ctx.request, collectionKey);
    if (!collection) return sendError(response, 404, "not_found", "No such collection", origin);

    const body = readBody(ctx.request);
    if (body === null) return sendError(response, 413, "too_large", "Request body is over 2 MB", origin);

    let parsed: any;
    try {
      parsed = JSON.parse(body);
    } catch (e) {
      return sendError(response, 400, "bad_json", String(e), origin);
    }

    const html = typeof parsed?.html === "string" ? parsed.html : null;
    const column = typeof parsed?.column === "string" ? parsed.column : "";
    const itemKey = typeof parsed?.itemKey === "string" ? parsed.itemKey : "";
    if (html === null || html.trim() === "") {
      return sendError(response, 400, "bad_request", "html is required", origin);
    }

    const note: any = new Zotero.Item("note");
    note.libraryID = collection.libraryID;
    note.setNote(html);

    if (itemKey !== "") {
      const item: any = itemFor(ctx.request, itemKey);
      if (!item) return sendError(response, 404, "not_found", "No such item", origin);
      note.parentID = item.id;
    } else {
      // A note with a parent cannot be in a collection of its own, and one without a parent
      // has to be, or it lands in the library and in no table at all.
      note.setCollections([collection.id]);
    }

    if (column !== "") note.addTag(column);
    await note.saveTx();

    const created: any = Zotero.Items.get(note.id);
    sendJson(
      response,
      200,
      { created: true, key: created.key, dateModified: created.dateModified, row: itemKey === "" },
      origin,
    );
  },

  async putCell(ctx: RouteContext, collectionKey: string): Promise<void> {
    const { response, origin } = ctx;

    const collection = collectionFor(ctx.request, collectionKey);
    if (!collection) {
      return sendError(response, 404, "not_found", "No such collection", origin);
    }

    const raw = readBody(ctx.request);
    if (raw === null) {
      return sendError(response, 413, "too_large", "Request body is over 2 MB", origin);
    }
    let payload: Record<string, unknown>;
    try {
      payload = JSON.parse(raw) as Record<string, unknown>;
    } catch (e) {
      return sendError(response, 400, "bad_json", String(e), origin);
    }

    const itemKey = typeof payload["itemKey"] === "string" ? payload["itemKey"] : "";
    const column = typeof payload["column"] === "string" ? payload["column"] : "";
    const html = typeof payload["html"] === "string" ? payload["html"] : null;
    const ifDateModified = typeof payload["ifDateModified"] === "string" ? payload["ifDateModified"] : null;

    if (!itemKey || html === null) {
      return sendError(response, 400, "bad_request", "itemKey and html are required", origin);
    }

    const item = itemFor(ctx.request, itemKey);
    if (!item) return sendError(response, 404, "not_found", "No such item", origin);

    const notes = notesForColumn(item, column);

    if (notes.length > 1) {
      return sendJson(
        response,
        409,
        {
          error: { code: "ambiguous_cell", message: "This cell holds more than one note" },
          notes: notes.map((n: any) => ({ key: n.key, dateModified: n.dateModified })),
        },
        origin,
      );
    }

    if (notes.length === 1) {
      const note = notes[0];
      if (ifDateModified && ifDateModified !== note.dateModified) {
        return sendJson(
          response,
          409,
          {
            error: { code: "stale", message: "ifDateModified does not match" },
            current: { key: note.key, dateModified: note.dateModified, html: note.getNote() },
          },
          origin,
        );
      }
      await NoteActions.applynote(note.id, html);
      const saved: any = Zotero.Items.get(note.id);
      return sendJson(response, 200, { created: false, key: saved.key, dateModified: saved.dateModified }, origin);
    }

    if (ifDateModified) {
      return sendJson(
        response,
        409,
        {
          error: { code: "stale", message: "The cell is empty; it has no dateModified" },
          current: null,
        },
        origin,
      );
    }

    const note = new Zotero.Item("note");
    note.setNote(html);
    note.parentID = item.id;
    if (column !== "") note.addTag(column);
    await note.saveTx();
    const created: any = Zotero.Items.get(note.id);
    return sendJson(response, 200, { created: true, key: created.key, dateModified: created.dateModified }, origin);
  },

  async patchNote(ctx: RouteContext, key: string): Promise<void> {
    const { response, origin } = ctx;

    const raw = readBody(ctx.request);
    if (raw === null) {
      return sendError(response, 413, "too_large", "Request body is over 2 MB", origin);
    }
    let payload: Record<string, unknown>;
    try {
      payload = JSON.parse(raw) as Record<string, unknown>;
    } catch (e) {
      return sendError(response, 400, "bad_json", String(e), origin);
    }

    const html = typeof payload["html"] === "string" ? payload["html"] : null;
    const ifDateModified = typeof payload["ifDateModified"] === "string" ? payload["ifDateModified"] : null;
    if (html === null) {
      return sendError(response, 400, "bad_request", "html is required", origin);
    }

    const note: any = itemFor(ctx.request, key);
    if (!note || !note.isNote()) {
      return sendError(response, 404, "not_found", "No such note", origin);
    }
    if (ifDateModified && ifDateModified !== note.dateModified) {
      return sendJson(
        response,
        409,
        {
          error: { code: "stale", message: "ifDateModified does not match" },
          current: { key: note.key, dateModified: note.dateModified, html: note.getNote() },
        },
        origin,
      );
    }

    await NoteActions.applynote(note.id, html);
    const saved: any = Zotero.Items.get(note.id);
    sendJson(response, 200, { key: saved.key, dateModified: saved.dateModified }, origin);
  },

  /**
   * Deletes one note. The table's own "Delete note" asks first through `window.confirm`;
   * a page cannot be trusted to have asked, so nothing here softens it — the client owns
   * the confirmation, and this is behind "Allow writes" like every other write.
   */
  async deleteNote(ctx: RouteContext, key: string): Promise<void> {
    const { response, origin } = ctx;

    const note: any = itemFor(ctx.request, key);
    if (!note || !note.isNote()) {
      return sendError(response, 404, "not_found", "No such note", origin);
    }

    const ifDateModified = query(ctx.request).get("ifDateModified");
    if (ifDateModified && ifDateModified !== note.dateModified) {
      return sendJson(
        response,
        409,
        {
          error: { code: "stale", message: "ifDateModified does not match" },
          current: { key: note.key, dateModified: note.dateModified, html: note.getNote() },
        },
        origin,
      );
    }

    await Zotero.Items.erase(note.id);
    sendJson(response, 200, { key, deleted: true }, origin);
  },

  /**
   * Replaces an annotation's comment.
   *
   * **Replaces**, like the note routes and unlike `NoteActions.updateannotation`, which
   * appends a titled block — that is a different operation and the bridge does not use it.
   *
   * `annotationText` is deliberately not writable: it is the words on the page, and editing
   * it would make the excerpt disagree with the PDF.
   */
  async patchAnnotation(ctx: RouteContext, key: string): Promise<void> {
    const { response, origin } = ctx;

    const raw = readBody(ctx.request);
    if (raw === null) {
      return sendError(response, 413, "too_large", "Request body is over 2 MB", origin);
    }
    let payload: Record<string, unknown>;
    try {
      payload = JSON.parse(raw) as Record<string, unknown>;
    } catch (e) {
      return sendError(response, 400, "bad_json", String(e), origin);
    }

    const comment = typeof payload["comment"] === "string" ? payload["comment"] : null;
    const ifDateModified =
      typeof payload["ifDateModified"] === "string" ? payload["ifDateModified"] : null;
    if (comment === null) {
      return sendError(response, 400, "bad_request", "comment is required", origin);
    }

    const annotation: any = itemFor(ctx.request, key);
    if (!annotation?.isAnnotation?.()) {
      return sendError(response, 404, "not_found", "No such annotation", origin);
    }
    if (ifDateModified && ifDateModified !== annotation.dateModified) {
      return sendJson(
        response,
        409,
        {
          error: { code: "stale", message: "ifDateModified does not match" },
          current: {
            key: annotation.key,
            dateModified: annotation.dateModified,
            comment: annotation.annotationComment ?? "",
          },
        },
        origin,
      );
    }

    annotation.annotationComment = comment;
    await annotation.saveTx({ skipSelect: true });
    const saved: any = Zotero.Items.get(annotation.id);
    sendJson(response, 200, { key: saved.key, dateModified: saved.dateModified }, origin);
  },

  /**
   * An image annotation's own rendering — the picture Ze-Notes' `AnnotationElement` shows,
   * from the same path `Format.image()` puts on every annotation row.
   *
   * Zotero renders that cache lazily, so a miss is ordinary rather than a fault: a highlight
   * has no cache image at all, and an image annotation has none until something has drawn
   * it. Both answer 404 and the client keeps its placeholder.
   */
  async annotationImage(ctx: RouteContext, key: string): Promise<void> {
    const annotation: any = itemFor(ctx.request, key);
    if (!annotation?.isAnnotation?.()) {
      return sendError(ctx.response, 404, "not_found", `No annotation ${key}`, ctx.origin);
    }
    const path = Zotero.Annotations.getCacheImagePath(annotation);
    return sendImage(ctx, path, "image/png");
  },

  /** An image attached to a note (`<img data-attachment-key="…">`). Images only. */
  async attachmentImage(ctx: RouteContext, key: string): Promise<void> {
    const attachment: any = itemFor(ctx.request, key);
    if (!attachment?.isAttachment?.()) {
      return sendError(ctx.response, 404, "not_found", `No attachment ${key}`, ctx.origin);
    }
    const contentType = String(attachment.attachmentContentType ?? "");
    // The one rule that keeps this route from being a way to read a PDF out of the library —
    // that is `…/file`, behind FILES.
    if (!contentType.startsWith("image/")) {
      return sendError(ctx.response, 415, "not_an_image", `${key} is not an image`, ctx.origin);
    }
    return sendImage(ctx, await filePathOf(attachment), contentType);
  },

  /**
   * An attachment's PDF, whole, for a page that has FILES ticked. PDFs only: widening it to
   * EPUB or snapshots is a new decision, not this one.
   */
  async attachmentFile(ctx: RouteContext, key: string): Promise<void> {
    const attachment: any = itemFor(ctx.request, key);
    if (!attachment?.isAttachment?.()) {
      return sendError(ctx.response, 404, "not_found", `No attachment ${key}`, ctx.origin);
    }
    if (String(attachment.attachmentContentType ?? "") !== "application/pdf") {
      return sendError(ctx.response, 415, "not_a_pdf", `${key} is not a PDF`, ctx.origin);
    }
    // `filePathOf` is null for a linked URL; a synced file never downloaded is not on disk.
    const path = await filePathOf(attachment);
    if (!path || !(await IOUtils.exists(path))) {
      return sendError(
        ctx.response,
        404,
        "no_file",
        "The file is not on this computer. Open it once in Zotero to download it.",
        ctx.origin,
      );
    }
    const { size } = await IOUtils.stat(path);
    if ((size ?? 0) > MAX_FILE_BYTES) {
      return sendError(ctx.response, 413, "file_too_large", `File is over ${MAX_FILE_BYTES} bytes`, ctx.origin);
    }
    sendBytes(ctx.response, await IOUtils.read(path), "application/pdf", ctx.origin);
  },

  /** The SSE stream. Left unfinished on purpose; `Changes` owns the response from here. */
  events(ctx: RouteContext): boolean {
    const last = parseInt(header(ctx.request, "Last-Event-ID") ?? "0", 10) || 0;
    return Changes.openStream(ctx.response, ctx.origin, last);
  },

  preflight(response: BridgeResponse, request: BridgeRequest, origin: string | null): void {
    response.setStatusLine("1.1", 204, "No Content");
    response.setHeader("Content-Length", "0", false);
    if (origin) {
      response.setHeader("Access-Control-Allow-Origin", origin, false);
      response.setHeader("Vary", "Origin", false);
      response.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS", false);
      response.setHeader("Access-Control-Allow-Headers", "Authorization, Content-Type", false);
      response.setHeader("Access-Control-Max-Age", "600", false);
      if (header(request, "Access-Control-Request-Private-Network") === "true") {
        response.setHeader("Access-Control-Allow-Private-Network", "true", false);
      }
    }
  },
};

export default Routes;
