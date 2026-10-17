# Ze-Notes browser bridge — API

> **TL;DR** A small HTTP server Ze-Notes runs on `127.0.0.1:23120`, so a web page you name
> can read your Ze-Notes matrix and write back through Ze-Notes' own code. Off by default,
> closed to every origin by default, read-only by default. Zotero's own server on 23119
> cannot do this: it drops browser requests and sends CORS headers only for Zotero's
> bookmarklet origin. This file is the contract Clew is built against.

- **API version:** 8 (`bridgeApi` in `/status`)
- **Implementation:** `src/Core/Bridge/`
- **Milestone 1** is everything under "Routes". **Milestone 2** is designed at the end and
  not implemented; those routes answer `404 not_implemented` today.

## Turning it on

Ze-Notes → Settings → **Browser bridge**:

| Setting | Default | Meaning |
|---|---|---|
| Enable bridge | **off** | Off closes the socket and unregisters the change observer. |
| Port | `23120` | Loopback only. |
| Pages allowed in | *(empty)* | A table: one row per origin, matched as an exact string, with a checkbox per capability. Empty allows nothing. |
| Require pairing token | **off** | On demands `Authorization: Bearer <token>`. |
| Token | generated | 32 random bytes, base64url. Copy / Regenerate. |

### Capabilities

Each allowed origin carries four, and every request needs exactly one of them. They are stored
as one JSON array in `extensions.zenotes.v1.bridge-origin-rules` and read synchronously on each
request: a permission check must not wait on a database, or have to decide what to do when one
will not open.

| Capability | Covers | Refusal |
|---|---|---|
| `read` | the matrix, collections, an item's notes / annotations / attachments, the images, the change stream | `403 read_not_allowed` |
| `arrange` | `PUT …/settings` — hiding, ordering, colouring, widths, sort | `403 arrange_not_allowed` |
| `write` | notes and annotation comments | `403 writes_disabled` |
| `ai` | running a command through this Zotero (AI, translation, OCR) | `403 commands_not_allowed` |

`arrange` is deliberately not `write`: letting a page tidy your table is not letting it rewrite
your notes, and the two are worth saying separately.

`ai` is the only one that spends the user's own API quota, so **nothing grants it implicitly** —
not a new origin, not the migration from the old one-per-line list, not the pairing token.

A profile that predates the table keeps working: each line of the old `bridge-origins` list
becomes a row with `read` and `arrange` on and `write` set to whatever the master switch said.
The old preference is then left alone and never written again.

A request with **no Origin at all** — a local script vouched for by the pairing token — has no
row to look up. It keeps `read`, `arrange` and `write` as it always had, and never gets `ai`:
consent to spend money has to point at something.

There is no master "Allow writes" switch any more. The row is the whole answer: two gates
disagreeing about one row is how a person comes to read `WRITE ☑` while writes are refused.
**Enable bridge** off remains the one control that stops everything at once. A profile that had
the old switch keeps its meaning — the migration copies it into each row's Write box once, and
then the preference is never read again.

With "Enable bridge" off, Ze-Notes behaves exactly as a build without this folder.

## Security

Every request is checked in this order, before any work is done.

1. **Host** must be exactly `127.0.0.1:<port>` or `localhost:<port>`, else `403 bad_host`.
   `httpd.sys.mjs` validates the Host header against its own registered identities first and
   answers a bare `400` for anything it does not recognise, so **either 400 or 403 means
   rejected** — `test.sh` accepts both.
2. **Origin**
   - Present: must equal one of the allowed origins, compared as whole strings. No
     substring, suffix or wildcard matching. The literal `null` is always rejected.
   - Absent: rejected, *unless* token mode is on and a valid token is supplied. This is what
     lets `curl` and local scripts work without pretending to be a page.
3. **Token**, when token mode is on: `Authorization: Bearer <token>`, compared in constant
   time. The **only** exception is the SSE stream, which may pass `?token=` because
   `EventSource` cannot set headers.
4. **Capability**: the route's capability must be ticked for that origin, else `403` with the
   code from the table above. `/status` is the one route that needs none — it is how a page
   learns what it may do, so asking cannot itself require permission. A route not named in the
   capability map is gated by its method: `GET` needs `read`, anything else needs `write`, so a
   route added later fails closed rather than open.
5. **CORS**
   - Allowed origin: `Access-Control-Allow-Origin: <that exact origin>` and `Vary: Origin`.
     Never `*`.
   - `OPTIONS`: `204` with `Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE,
     OPTIONS`, `Access-Control-Allow-Headers: Authorization, Content-Type`,
     `Access-Control-Max-Age: 600`. A preflight carrying
     `Access-Control-Request-Private-Network: true` also gets
     `Access-Control-Allow-Private-Network: true`.
   - Disallowed origin: `403` and **no CORS headers at all**, so the browser reports a CORS
     failure and the page cannot read the body.

Limits: headers are capped by `httpd.sys.mjs`; bodies at 2 MB (`413 too_large`); at most 10
concurrent SSE streams (`503 too_many_streams`). Responses carry `Connection: close`.

### Redaction

The bridge never serves a secret. Values are replaced with `"***"` and the response lists
what it hid in a `redacted` array.

Always redacted, by name: `openai-api-key`, `gemini-api-key`, `deepseek-api-key`,
`deepseek-apikey`, `claude-api-key`, `custom-ai-api-key`, `deepl-api-key`,
`google-translate-api-key`, `dropbox-client-id`, `dropbox-client-secret`,
`dropbox-access-token`, `dropbox-refresh-token`, `dropbox-last-target` (an email address),
`bridge-token`.

Also redacted wherever they appear inside a stored blob: `apikey`, `api_key`, `token`,
`options` and `format`. The last two matter because `custom-ai-options` interpolates
`${apikey}` and `custom-ai-format` is JavaScript that Ze-Notes evaluates. Any key matching
`/apikey|api[-_]key|secret|token|password|refresh[-_]?token/i` is redacted too, so a
preference added later is hidden by default rather than served by accident.

Nothing — no token, no pref value, no note content — is ever written to the Zotero log.

### Text encoding

All output is UTF-8 bytes written through `nsIBinaryOutputStream`. `response.write()` from
`httpd.sys.mjs` is **never** used: it calls `bodyOutputStream.write(str, str.length)`, which
writes bytes but counts UTF-16 code units, so every code point above U+00FF is truncated to
its low byte. Japanese text comes back corrupt, and a truncated byte landing on `"` breaks
the JSON structurally. `test.sh` asserts this stays fixed.

## Errors

```json
{ "error": { "code": "origin_not_allowed", "message": "Origin is not in the allow list" } }
```

`bad_host` · `origin_required` · `origin_not_allowed` · `unauthorized` · `read_not_allowed` ·
`arrange_not_allowed` · `writes_disabled` · `commands_not_allowed` · `unknown_command` ·
`command_unavailable` · `command_failed` ·
`not_found` · `no_route` · `not_implemented` · `bad_json` · `bad_request` · `too_large` ·
`stale` · `ambiguous_cell` · `too_many_streams` · `internal`

`writes_disabled` keeps its name from when writes were one switch for everyone: clients match on
that code, and renaming it would break them in order to say the same thing.

## Routes

`:key` is a Zotero **key**, not a numeric id. Ze-Notes stores its per-collection settings
under the numeric collection id internally; the bridge translates. Add `?library=<id>` to
address a group library; the default is the user library.

### `GET /status`

```json
{ "plugin": "ze-notes", "pluginVersion": "1.2.0", "zoteroVersion": "9.0.6",
  "bridgeApi": 8, "userLibraryUri": "http://zotero.org/users/local/AbCdEfGh",
  "bootId": "MHMsg1tFscuv", "seq": 0,
  "can": { "read": true, "arrange": true, "write": false, "ai": false },
  "writeEnabled": false, "tokenRequired": false, "streams": 0 }
```

`bootId` is new on every server start.

`can` is **this caller's** row in the origins table, so a page can offer only what will work
rather than finding out by being refused. It is additive and carries no version of its own: a
client that has never heard of it behaves exactly as before.

`writeEnabled` is the same answer as `can.write` and stays because clients read it. It now means
"this page may write" rather than "writes are on for everybody" — which is what a client always
wanted it to mean.

`userLibraryUri`, **since API 6**, is the user library's own Zotero URI —
`http://zotero.org/users/12345` when this Zotero syncs, `http://zotero.org/users/local/<key>`
when it does not, and `null` when Zotero will not say. It is the one identifier a client cannot
work out for itself: every item's **key** already arrives with the item, and a group library's
id arrives with it too, so only the user library's number (or local key) is missing, and it
lives only inside this Zotero.

It exists so a client can write a citation that Zotero matches back to a library item. Zotero's
own Word plugin stores a citation against exactly this URI plus the item key; a document
written by another program without it carries the citation's data but no link, and Zotero must
ask which item was meant. It names a library rather than a person — no username, no key
material, and nothing that is not already inside every `.docx` Zotero itself writes.

`bridgeApi` is **8**. Version 2 added the two image routes; version 3 added
`DELETE …/notes/:key` and `PATCH …/annotations/:key`; version 4 added `columnWidths` /
`allColumnsWidth` to the settings contract and `GET …/items/:key/attachments`; version 5
keys the untagged column `""` in `columnColors` and `columnTextColors` as well, so every
mention of that column on the wire now agrees; version 6 adds `userLibraryUri`; version 7 adds
`/capabilities` and the command routes; version 8 adds `POST …/collections/:key/notes`, which is
how a new row is made. A client
written against an earlier version keeps working unchanged — it simply never offers what it has
not heard of.

Version 5 is the one exception worth spelling out, because it changes a field rather than
adding one. What it changes is a *read*: the two colour maps come back keyed `""` instead of
keyed by the renameable label. A client that has not heard of version 5 and looks a colour
up under the label finds nothing for the untagged column and draws it plain — the label-keyed
original is still in `raw`, for anything that wants it. **Writes take either keying**, so a
client that echoes back a map it read under version 4 sets the colour it meant to set.

**A client may refuse a bridge *newer* than it knows.** Clew's `LinkPanel` does, rather
than guess at a contract it has not seen, so a client has to learn a version *before* the
bridge starts announcing it. Raising this number without raising the client's
`SUPPORTED_BRIDGE_API` first breaks linking outright, not just the new routes.

### `GET /ze-notes/v1/collections`

```json
{ "collections": [
  { "key": "R3DXDTPK", "name": "Literature review", "libraryID": 1, "parentKey": null }
] }
```

### `GET /ze-notes/v1/collections/:key/settings`

What the Ze-Notes table shows for that collection: the same `tableoptions` rows the plugin's
own menus read, normalised.

```json
{ "collection": { "key": "R3DXDTPK", "id": 209, "name": "Literature review", "libraryID": 1 },
  "untaggedLabel": "Untagged",
  "rev": "1f3c9a20b4d7e611",
  "display": {
    "hiddenColumns": ["Methodology", ""],
    "hiddenRows": ["MSVFDR4C"],
    "columnOrder": ["Objectives", "Methodology"],
    "sort": [{ "field": "date", "reversed": true }],
    "columnColors": { "Objectives": "#fff3c4", "": "#e8f0ff" },
    "columnTextColors": {},
    "filter": "all",
    "columnWidths": { "Objectives": 320, "": 180 },
    "allColumnsWidth": null
  },
  "raw": { "hide-key": "[\"Methodology\",\"Untagged\"]", "row-hide-key": "[\"1234\"]" },
  "redacted": [] }
```

Two translations happen here so a browser client never meets Zotero's internals:

- **`hiddenRows` are item keys.** Ze-Notes stores numeric item ids (`Visibility.hiderow`
  pushes `celldata.itemid`, `Table.tsx` compares `String(r.itemid)`). The bridge translates
  both ways. An id whose item has been deleted is dropped from `hiddenRows` but left in
  storage, so restoring the item in Zotero restores the setting.
- **`""` is the untagged column**, as in the matrix. Ze-Notes stores it under the display
  label from `untagged-column-label`, which the user can rename. Since API 5 this holds for
  every field that names a column — `hiddenColumns`, `columnOrder`, `columnWidths` **and**
  `columnColors` / `columnTextColors`. Until API 5 the two colour maps were the exception:
  they went out keyed by the label, so a client had to key one object two ways and would
  quietly lose the colour the moment the label was renamed.

`filter` is `all`, `withTags` or `withoutTags` (stored lower-case as `all` / `withtags` /
`withouttags`). `raw` is exactly what is stored, for anyone who needs to see through the
translation.

**`columnWidths` and `allColumnsWidth`, since API 4.** Column widths are not `tableoptions`
rows at all — the table's own resizer (`ColumnResizer.tsx`, `TableHooks.tsx`) stores them as
plain preferences, one row per column plus a global fallback, under
`column-width/<collectionid>/<label>` and `column-width/<collectionid>/-all-columns-`. The
bridge reads and writes those same rows. `columnWidths` is keyed exactly like `columnColors`
(`""` is the untagged column, the label underneath can be renamed); values are CSS pixels.
`allColumnsWidth` is the `-all-columns-` global, or `null` when nothing has set it.

**The colour keys, since API 5.** `columnColors` and `columnTextColors` are keyed exactly
like `hiddenColumns` and `columnWidths`: `""` for the untagged column, the tag for every
other. Underneath, the stored `column-bgcolor` / `column-fgcolor` rows keep the display
label as their key, because that is what Ze-Notes' own table looks a colour up by
(`Table.tsx` indexes them by the header it is drawing) — the translation happens on the
wire, not in storage, so nothing the plugin does changes and `rev` for an untouched
collection is what it always was. On a **write** either keying is accepted and lands on the
same stored row; if a map somehow carries both, `""` wins.

`rev` is a hash of the stored values, including the column widths. Send it back as `ifRev`
on a write to be told rather than silently overwrite a change made in Ze-Notes meanwhile.

### `PUT /ze-notes/v1/collections/:key/settings` — write

Changes what the table shows. Only the fields present are touched, so hiding one column does
not require sending everything else back.

```json
{ "ifRev": "1f3c9a20b4d7e611",
  "display": { "hiddenColumns": ["Methodology"], "filter": "withTags" } }
```

The reply is the full settings, exactly as `GET` returns them, with a new `rev`. A
`zenotes-settings` event goes out on the change stream, so other clients notice. An open
Ze-Notes table picks the change up on its next reload — the plugin reads these rows on every
render, so there is no cache to invalidate.

`409` when `ifRev` does not match, with the current settings under `current`:

```json
{ "error": { "code": "stale", "message": "The settings changed since that revision" },
  "current": { "rev": "…", "display": { } } }
```

Writes obey "Allow writes" like every other write route.

**Widths, since API 4.** Each entry of `columnWidths` sets that column's width; a value that
is zero, negative or not finite removes the row instead (back to whatever the global width
falls back to). Sending `"columnWidths": {}` resets every per-column width for this
collection — it does not touch `allColumnsWidth`, which is separate. `"allColumnsWidth":
null` removes the global row; a positive number sets it.

### `GET /ze-notes/v1/collections/:key/matrix`

The table, in the `clew-hub-json` v1 shape Clew already parses. Rows come from
Ze-Notes' own `Data.items()` — the same call the table makes — so the two cannot drift.

```json
{
  "format": "clew-hub-json",
  "version": 1,
  "exported": "2026-09-19T06:30:00.000Z",
  "collection": { "key": "R3DXDTPK", "name": "Literature review", "libraryID": 1 },
  "columns": [
    { "tag": "Objectives", "order": 0, "hidden": false, "color": "#fff3c4" },
    { "tag": "", "order": 1, "hidden": false }
  ],
  "rows": [
    {
      "itemKey": "MSVFDR4C",
      "csl": { "id": "...", "type": "article-journal", "title": "...", "author": [] },
      "cells": {
        "Objectives": [
          { "type": "annotation", "key": "P2WRZTAD", "dateModified": "2025-10-29 05:33:26",
            "attachmentKey": "ATTA0001", "annotationType": "highlight",
            "text": "Therefore, with the ongoing debates…", "comment": "",
            "pageLabel": "458", "position": { "pageIndex": 3, "rects": [] },
            "color": "#ffd400" }
        ],
        "": [
          { "type": "note", "key": "SW2UWGN9", "dateModified": "2025-10-29 05:24:56",
            "html": "<div data-schema-version=\"9\"><p>…</p></div>" }
        ]
      }
    }
  ]
}
```

Schema notes, all of which matter to a client:

- **A column is a Zotero tag**, carried by a child note or by an annotation on the item's
  PDF attachments — not a note title.
- **`tag: ""` is the untagged column.** Ze-Notes shows it under a label the user can rename
  (`untagged-column-label`, default "Untagged"). It is emitted as `""` so a collection with
  a real tag called "Untagged" still round-trips. `untaggedLabel` in `/settings` gives the
  display name.
- **Note cells carry raw `html`**, straight from `getNote()`. The table's own cell text has
  been HTML-escaped for display; writing that back would double-escape the note. `html` is
  also exactly what `PUT …/cells` expects to receive.
- **Annotation cells carry no `html`**; they carry `text`, `comment`, `pageLabel`, `color`
  and `position`. `position` may be an object or the JSON string Zotero stores — parse
  defensively.
- **`dateModified`** is the Zotero timestamp (`"YYYY-MM-DD HH:MM:SS"`, UTC). Pass it back as
  `ifDateModified` to make a write conditional.
- **`columns`** is ordered by Ze-Notes' saved `column-sort-key`, then anything else
  alphabetically. `hidden` mirrors `hide-key`. A hidden column is still sent; hiding is the
  client's decision to honour.
- **Rows include subcollections**, recursively, because `Data.items()` does.
- `csl` is `Zotero.Utilities.Item.itemToCSLJSON`, or `null` if that fails.

### `PUT /ze-notes/v1/collections/:key/cells` — write

```json
{ "itemKey": "MSVFDR4C", "column": "Objectives",
  "html": "<div data-schema-version=\"9\"><p>Rewritten</p></div>",
  "ifDateModified": "2025-10-29 05:24:56" }
```

`column: ""` means the untagged cell. `ifDateModified` is optional.

- **Replaces** the note's HTML. It does not append. (Ze-Notes' own `updatenote` appends a
  titled block; that is a different operation and the bridge does not use it.)
- Empty cell → a new child note is created, tagged with `column`, and the reply has
  `"created": true`. Sending `ifDateModified` for an empty cell is a `409`, since there is
  nothing to match.
- Cell with one note → that note is saved through `NoteActions.applynote()`, which is
  `setNote` + `saveTx`, so sync, undo and notifier events behave normally.
- Cell with several notes → `409 ambiguous_cell` listing their keys; edit the one you mean
  through `PATCH /zotero/v1/notes/:key`.

```json
{ "created": false, "key": "SW2UWGN9", "dateModified": "2026-09-19 06:31:02" }
```

`409` on a stale precondition returns the current value, so a client can merge:

```json
{ "error": { "code": "stale", "message": "ifDateModified does not match" },
  "current": { "key": "SW2UWGN9", "dateModified": "2026-09-19 06:20:11", "html": "<div>…</div>" } }
```

### `POST /ze-notes/v1/collections/:key/notes` — write, since API 8

```json
{ "html": "<div data-schema-version=\"9\"><p><b>[[Summary]]</b></p><p>…</p></div>",
  "column": "Objectives", "itemKey": "MSVFDR4C" }
```

**Always creates. Never replaces.** Two shapes, and the difference is one optional field:

- **with `itemKey`** — a child note of that item: a new thing in that item's row.
- **without** — a **standalone note in the collection**, which Ze-Notes shows as a **new row**.

That second one is worth spelling out, because it looks impossible and is not. Zotero has no
note that belongs to a collection rather than to an item — but a note *without a parent* can sit
in a collection on its own, and `Data.collectionitems` returns those like any other item.
`Format.tagged` then takes its own branch for them (`if (!item.isNote()) … else …`), where the
note is its own cell. So a standalone note is already a row in Ze-Notes' table, with its text in
whichever column its tags name; this route is how one gets made.

`column` is that tag. `""` (or absent) leaves the note untagged, which is the untagged column.

```json
{ "created": true, "key": "SW2UWGN9", "dateModified": "2026-09-21 10:02:11", "row": true }
```

`row` is true when a new row was made rather than a note inside an existing one.

**Why not `PUT …/cells`.** That route means "this cell should say this", so it *replaces* the
note already there. An answer from a command is never a replacement for something somebody
wrote, and a route that sometimes overwrites is the wrong tool for something a page asks for
after a five-minute wait.

### `GET /ze-notes/v1/presets`

`404 not_implemented`. See Milestone 2.

### `GET /ze-notes/v1/changes?since=<seq>&bootId=<id>`

```json
{ "bootId": "MHMsg1tFscuv", "seq": 42,
  "events": [ { "seq": 41, "event": "modify", "type": "item",
                "keys": ["SW2UWGN9"], "libraryID": null, "time": 1789712345678 } ] }
```

`{ "reset": true }` when `bootId` differs or `since` has fallen out of the ring buffer
(5000 events, memory only). On a reset, re-read the matrix from scratch.

Event `type` is one of `item`, `collection`, `collection-item`, `item-tag`, or
`zenotes-settings`. `keys` are Zotero keys where they can be resolved, raw ids otherwise —
a deleted object can no longer be looked up.

### `GET /ze-notes/v1/events` — SSE

The same events, pushed. `id:` is the sequence number, so `Last-Event-ID` resumes. A
comment heartbeat every 25 s keeps the connection alive. At most 10 streams.

```
: ze-notes bridge, boot MHMsg1tFscuv

id: 41
data: {"seq":41,"event":"modify","type":"item","keys":["SW2UWGN9"],"libraryID":null,"time":1789712345678}
```

In token mode use `?token=<token>`; `EventSource` cannot send an `Authorization` header.

### `GET /zotero/v1/items/:key`

```json
{ "key": "MSVFDR4C", "libraryID": 1, "itemType": "journalArticle",
  "dateModified": "2025-10-29 05:20:00", "tags": [], "csl": { } }
```

### `GET /zotero/v1/items/:key/notes`

```json
{ "itemKey": "MSVFDR4C", "notes": [
  { "key": "SW2UWGN9", "parentKey": "MSVFDR4C", "dateModified": "2025-10-29 05:24:56",
    "tags": ["Objectives"], "html": "<div…>" } ] }
```

### `GET /zotero/v1/items/:key/annotations`

Annotations on the item's file attachments (or on the item itself, if it is an attachment).

```json
{ "itemKey": "MSVFDR4C", "annotations": [
  { "key": "P2WRZTAD", "attachmentKey": "ATTA0001", "dateModified": "2025-10-29 05:33:26",
    "annotationType": "highlight", "text": "…", "comment": "", "pageLabel": "458",
    "color": "#ffd400", "position": { }, "tags": ["Objectives"] } ] }
```

### `GET /zotero/v1/items/:key/attachments` — since API 4

Metadata only — an item's attachments, so a browser client can offer "open this file in
Zotero" through a `zotero://` link it builds itself. This route never serves file bytes; that
boundary belongs to the two `…/image` routes below, and this one does not cross it.

```json
{ "attachments": [
  { "key": "ATTA0001", "title": "Full text PDF", "filename": "smith-2020.pdf",
    "contentType": "application/pdf", "linkMode": "imported_file", "isFile": true } ] }
```

`linkMode` is one of `imported_file`, `imported_url`, `linked_file`, `linked_url` or
`embedded_image` — `Zotero.Attachments.LINK_MODE_*`, spelled out. `filename` is `""` and
`isFile` is `false` only for `linked_url`: a link to somewhere else with no file behind it.
Every other link mode names a file on disk (imported, a cached snapshot, linked in place, or
an embedded image), so `isFile` is `true` and `filename` is whatever Zotero has.

### `PATCH /zotero/v1/notes/:key` — write

```json
{ "html": "<div data-schema-version=\"9\"><p>Rewritten</p></div>",
  "ifDateModified": "2025-10-29 05:24:56" }
```

Replaces the note through `NoteActions.applynote()` (`setNote` + `saveTx`). `409` on a stale
`ifDateModified`, with the current value, exactly as for cells.

### `DELETE /zotero/v1/notes/:key` — write, since API 3

Erases the note (`Zotero.Items.erase`). `?ifDateModified=<value>` makes it conditional and
answers the same `409` shape as the `PATCH`.

```json
{ "key": "SW2UWGN9", "deleted": true }
```

The table's own "Delete note" asks through `window.confirm` first. **The bridge does not
ask**, because it cannot know whether the page did — the client owns the confirmation.

### `PATCH /zotero/v1/annotations/:key` — write, since API 3

```json
{ "comment": "worth quoting\n[[Why]]\nit frames the argument",
  "ifDateModified": "2025-10-29 05:33:26" }
```

**Replaces** the comment, like the note routes and unlike `NoteActions.updateannotation`,
which appends a titled block — a different operation the bridge does not use. `409` on a
stale precondition carries `current.comment` rather than `current.html`.

`annotationText` is deliberately **not** writable: it is the words on the page, and changing
it would make the excerpt disagree with the PDF. `color` and `tags` are still Milestone 2.

### `GET /zotero/v1/annotations/:key/image` — since API 2

The picture an image annotation was cut from: the same file the table shows, read from
`Zotero.Annotations.getCacheImagePath()`.

```
→ 200  Content-Type: image/png   Cache-Control: no-store   <bytes>
→ 404  { "error": { "code": "not_found" } }       no such annotation
→ 404  { "error": { "code": "no_image_file" } }   nothing cached for it
→ 413  { "error": { "code": "image_too_large" } } over 8 MB
```

**`no_image_file` is ordinary, not a fault.** Zotero renders that cache lazily, and a
highlight has no cache image at all — which is why `AnnotationElement` checks
`IOUtils.exists` before using the path. A client shows its placeholder and moves on.

### `GET /zotero/v1/attachments/:key/image` — since API 2

An image attached to a note. A note stores these as `<img data-attachment-key="…">` with no
`src`, so this is what turns one into pixels outside Zotero.

```
→ 200  Content-Type: <the attachment's own type>   Cache-Control: no-store   <bytes>
→ 404  { "error": { "code": "not_found" } }        no such attachment
→ 404  { "error": { "code": "no_image_file" } }    no file on disk
→ 415  { "error": { "code": "not_an_image" } }     the attachment is not an image
→ 413  { "error": { "code": "image_too_large" } }  over 8 MB
```

Both routes:

- **Are reads**, so they are *not* behind "Allow writes" — but they are behind the Host,
  Origin and token gate like everything else, because `authorise()` runs before routing.
- **Serve images only.** `attachmentContentType` must start with `image/`. This is what
  stops the route being a way to read a PDF, or anything else, out of the library.
- Send bytes through `sendBytes()`, never `response.write()` — see the warning in `http.ts`.
  Most of a PNG is bytes above 0x7F, so `write()` would destroy it even more thoroughly than
  it destroys Japanese text.
- Are **not reachable from an `<img src>` in token mode**: `offeredToken()` accepts `?token=`
  only for the SSE stream. That is deliberate — a token in a URL lands in history and
  referrers. A client fetches the bytes with the bearer header and makes a blob URL, which
  is what Clew does in both modes.

## Testing

- `test.sh` — curl checks for the security model, CORS, preflight, the write gate, token
  mode, `409`, and UTF-8 integrity. `./test.sh 23120 https://example.org [token]`
- `test.html` — one self-contained page to host on an allowed origin: status, collections,
  matrix, edit a cell and re-read it, SSE with polling as a fallback, every request and
  response logged.

## Commands — since API 7

Running one of Ze-Notes' own actions on behalf of a page. The page names **keys**, never text:
it says *which* pieces of this library to work on, and this end resolves them, because a bridge
that accepted prose would be a way to post a prompt through somebody's paid API key.

Every route here needs the origin's **`ai`** box, except the catalogue, which needs `read`.

### `GET /capabilities`

```json
{ "commands": [
  { "id": "ai.openai", "label": "OpenAI", "available": true },
  { "id": "ai.gemini", "label": "Gemini", "available": false, "why": "No API key for Gemini" },
  { "id": "ai.custom.My prompt", "label": "My prompt", "available": true },
  { "id": "translate.deepl", "label": "DeepL → ja", "available": true } ] }
```

Built from what this Zotero has configured: one entry per AI provider with a key, one per saved
Custom AI preset whose "Use" box is ticked (the same ones the plugin's own menu offers), and the
translators. **This list is the allowlist** — an id not in it is a `404 unknown_command` before
anything is resolved.

A page whose `ai` box is unticked still gets the whole list, every entry `available: false` with
a `why` that says so. Being told why is the difference between a setting somebody can find and a
feature that looks broken.

OCR is not here. It works on a scanned page rather than on a piece of text, so it is a different
shape of command; an id that nothing implements would be a promise this bridge cannot keep.

### `POST /commands/:id`

```json
{ "targets": [ { "key": "ABCD1234", "part": "Method" },
               { "key": "EFGH5678" },
               { "key": "IJKL9012", "quote": true } ] }
```

→ `{ "jobId": "aB3kR9vQ2xLm", "pieces": 3, "characters": 1840 }`

A target is a key, optionally narrowed to one `[[Title]]` inside that key's own text (`part`),
or to an annotation's quoted text rather than its comment (`quote`). A note key resolves to its
note, an annotation key to its comment; the slicing is `Utils.splitcontents`, the same call the
plugin's table uses to draw those parts, so both ends mean the same thing by construction.

The pieces are kept **in the order the page sent them** and handed to the command as
`{ element, value }` objects — the shape `PromptFormat.zcontent` already gives the AI, so a
command over the bridge puts the same thing in front of the model as the right-click menu does.
`element` is the part's title, or `""` for a whole note or comment.

Order matters to the answer, and the order is the page's own reading of its table — which rows
and columns it is showing, and in what arrangement. That is why the list comes from there and is
not worked out at this end: **this end does not know what a table is.**

It answers as soon as the work is accepted, because a model takes seconds to minutes and an HTTP
request left open that long fails for reasons nobody can debug. Refusals:

| | |
|---|---|
| `404 unknown_command` | not in `/capabilities` |
| `409 command_unavailable` | in the list, but not runnable — no API key, no target language |
| `400 bad_request` | `targets` missing, or naming no key |
| `404 not_found` | none of those keys holds any text |
| `413 too_large` | over the character cap |

The cap is `extensions.zenotes.v1.bridge-command-cap`, **100 000 characters** by default and
deliberately without a control in the pane: it is a backstop, not a knob, and a page already
shows the size before it sends. It **refuses** rather than truncating — a summary of whichever
half happened to fit is worse than no summary.

### `GET /commands/jobs/:id`

```json
{ "jobId": "aB3kR9vQ2xLm", "state": "running", "done": 1, "total": 3 }
{ "jobId": "aB3kR9vQ2xLm", "state": "done", "done": 3, "total": 3, "answer": "…" }
{ "jobId": "aB3kR9vQ2xLm", "state": "failed", "done": 0, "total": 3,
  "error": { "code": "command_failed", "message": "…" } }
```

The last fifty jobs are kept, so a page that was closed mid-run can still come back for one.
`total` is 1 for an AI prompt, which is a single call however many pieces it was given, and the
number of pieces for a translation, which is one call each.

### On the change stream

`command.progress` and `command.done` are pushed as ordinary events, `type: "command"`, with the
job id as the single key — so a client hears that a job moved without asking. The events say
*that* it moved, never what it came to; the answer is only ever fetched from the job route
above. Progress is emitted only when the count actually changes, so a single-call command puts
one event on the stream rather than two.

A client that watches the stream for library changes should ignore `type: "command"`: a job of
its own is not a reason to re-read the matrix.

## Milestone 2 — designed, not implemented

Settings writing has since been built (see `PUT …/settings` above). The rest answer
`404 not_implemented` today.

- **`GET` / `PUT /ze-notes/v1/presets`** — the saved Custom AI settings
  (`custom-ai-settings/<name>` in the Ze-Notes SQLite `preferences` table). `GET` redacts
  `apikey`, `options` and `format`; `PUT` must refuse to write those three back, or a page
  could plant JavaScript that Ze-Notes later evaluates. Ze-Notes has **no** matrix presets
  today — this is the Custom AI list, nothing more.
- **`GET /zotero/v1/search`, `/collections/:key/children`, `/tags`** — full read access,
  paged with `?limit=&start=`. An item's own attachments are covered: `GET
  /zotero/v1/items/:key/attachments` (since API 4, metadata only, see above), alongside the
  existing `…/notes` and `…/annotations`. What is still missing is *browsing* — a
  collection's items and sub-collections, full-library search, and the tag list.
- **`PATCH /zotero/v1/annotations/:key`** — `color`, `tags` (`comment` has been writable
  since API 3, see above).
- **`POST /zotero/v1/annotations`** — create from client JSON via
  `Zotero.Annotations.saveFromJSON`.
- **`POST /ze-notes/v1/collections/:key/export`** — run a Ze-Notes export server-side and
  return the file, if that turns out to be more useful to Clew than exporting its own.
