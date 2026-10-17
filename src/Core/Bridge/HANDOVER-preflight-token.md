# Handover: token mode refuses the browser's preflight

> **TL;DR**
> 1. With **Require pairing token** ticked, no browser page can use the bridge. Every request
>    that carries the token fails as a network error. Clew shows "Zotero did not answer".
> 2. Cause: `authorise()` in `security.ts` asks the CORS preflight (`OPTIONS`) for the token.
>    Browsers never put credentials on a preflight, so it gets 401 and the browser drops the
>    real request.
> 3. Fix: answer an `OPTIONS` from an allowed origin before the token check. Six lines, below.
>    No `bridgeApi` change, and Clew needs nothing.
> 4. Security does not change. The preflight serves no data, disallowed origins are still
>    refused, and every real request still needs the token.
> 5. Not caused by Zotero 11 or today's rebuild. The bug has been there since the bridge was
>    written. Nobody saw it because every run so far had the token not required.
>
> Rule here: **never commit** (`.claude.md`). The user commits.

## 1. What the user saw (2026-10-17)

The user rotated the token in Ze-Notes and pasted the new one into Clew's **Ze-Notes token**
form. Clew answered: "Zotero did not answer. Check that it is running, that the Ze-Notes
bridge is on, and that the port is right." Zotero was running and the token was right.

Settings at the time: bridge enabled, port 23120, allowed origins `http://localhost:5173` and
`https://clew.alefa.net` with all four boxes ticked, **Require pairing token ticked**.

## 2. Proof

Run against the user's running Zotero 11 with token mode on:

```
$ curl -i -X OPTIONS http://127.0.0.1:23120/ze-notes/v1/status \
    -H "Origin: http://localhost:5173" -H "Access-Control-Request-Method: GET" \
    -H "Access-Control-Request-Headers: authorization"
HTTP/1.1 401 Unauthorized
access-control-allow-origin: http://localhost:5173
{"error":{"code":"unauthorized","message":"Missing or invalid bearer token"}}
```

A preflight has to answer 2xx, or the browser never sends the real request. The page only
gets a `TypeError: Failed to fetch`, the same error it gets when Zotero is closed.

A request **without** a token needs no preflight, so its 401 reaches the page. That is why
Clew could first say "the saved token is refused", and then "Zotero did not answer" once the
right token was typed.

## 3. Why it went unnoticed (checked, not guessed)

- `security.ts` and `index.ts` are unchanged since 2026-09-21. They were committed as they
  were in `c89665d` (2026-10-17 16:06). `index.ts` → `run()` has always called `authorise()`
  before its `OPTIONS` branch.
- Today's uncommitted rebuild (`engine.js`, `strict_max_version` → `11.*`, the exceljs
  `bare` alias in `commands/settings.mjs`) is for Zotero 11. It does not touch the bridge's
  checks. Zotero 11 does not cause this either: the **browser** decides what a preflight
  carries.
- `test.sh`'s preflight check sends no token and expects 204. That only passes with token
  mode off. Its token-mode block uses curl, which never sends a preflight.
- The one recorded run against a real Zotero (Clew `docs/06-ze-notes-bridge.md`) shows
  `"tokenRequired": false`.
- Likely reason it "used to work with a token": Clew had a token saved while the box was
  unticked. The preflight passed, and the bridge ignored the token.

## 4. The change

### 4.1 `src/Core/Bridge/security.ts`, in `authorise()`

Between the origin check and step 3. The surrounding lines are shown so the place is
unambiguous:

```ts
  const echo = originAllowed ? origin : null;

  // A CORS preflight never carries credentials - the browser strips `Authorization` from it
  // by design - so asking it for the token refuses every request that would carry one, and
  // the page sees a network failure, not a 401. It is answered on the origin alone and serves
  // no data; the request it clears still has to bring the token below.
  if (request.method === "OPTIONS" && echo !== null) {
    return { ok: true, origin: echo };
  }

  // 3. Token, when the user asked for one.
  if (tokenRequired && !tokenValid) {
```

`index.ts` already passes an allowed `OPTIONS` to `Routes.preflight(response, request,
decision.origin)` straight after `authorise()`. Nothing else needs to change.

The header comment of `security.ts` says "The order is fixed: Host, then Origin, then token…".
Add a sentence there: a preflight from an allowed origin stops after Origin.

### 4.2 `src/Core/Bridge/API.md`, "Security", step 3

Append: "A CORS preflight (`OPTIONS`) from an allowed origin is answered without the token —
browsers never send credentials on one — and serves only the CORS headers."

### 4.3 `src/Core/Bridge/test.sh`, the token-mode block

Inside `if [ -n "$TOKEN" ]; then`, after "no Origin but a token -> 200", add the check that
would have caught this:

```bash
  check "preflight needs no token -> 204" 204 \
    "$(code -X OPTIONS -H "Origin: $ORIGIN" -H "Access-Control-Request-Method: GET" \
      -H "Access-Control-Request-Headers: authorization" "$BASE/status")"
  check "preflight from a disallowed origin -> 403" 403 \
    "$(code -X OPTIONS -H "Origin: https://evil.example" -H "Access-Control-Request-Method: GET" \
      -H "Access-Control-Request-Headers: authorization" "$BASE/status")"
```

The existing "missing token -> 401" check stays as it is. It is a `GET`, and a `GET` must
still be refused.

## 5. Why it is safe

| Request | Before | After |
|---|---|---|
| `OPTIONS`, allowed origin, no token | 401 | 204 with CORS headers only, no data |
| `OPTIONS`, disallowed origin | 403, no CORS headers | unchanged |
| `OPTIONS`, no `Origin` | 403 unless a valid token | unchanged (the `origin === null` branch runs first) |
| any other method without a valid token | 401 | unchanged |

`Routes.preflight` (`routes.ts`, checked 2026-10-17) sends a 204 with an empty body and only
`Access-Control-Allow-Origin`, `Vary`, `Access-Control-Allow-Methods`,
`Access-Control-Allow-Headers`, `Access-Control-Max-Age` and, when asked,
`Access-Control-Allow-Private-Network`. It sends no library data.

## 6. Verify

1. Apply 4.1–4.3. Run `npm run build`, then restart Zotero.
2. `./src/Core/Bridge/test.sh 23120 http://localhost:5173 <token>`: every check passes,
   including the two new preflight checks.
3. In Clew, open the literature matrix. If it shows "Ze-Notes refuses the saved token",
   press **Change token**. Otherwise use **Settings → Zotero (Ze-Notes)**. Paste the token,
   then **Check and save**. Expected: "Zotero accepted it. Every linked collection uses it
   now." Then **Refresh** the matrix and open the full table.
4. Untick **Require pairing token**. Clew should still work. Tick it again.

## 7. The Clew side (done, merged and pushed, nothing to do)

- `projects/literature/src/ConnectionForm.tsx` sets the port and token for every link at
  once. It appears in the matrix's "token refused" chip and in **Settings → Zotero (Ze-Notes)**.
- `preflightRefused()` in `projects/literature/src/data/bridge.ts` recognises this bug. When
  the token-carrying request fails as unreachable but a tokenless `/status` returns a
  readable 401, Clew says the token is being stopped before it reaches Zotero, and suggests
  unticking the box until Ze-Notes is fixed. After the fix this message should never appear.
- Clew's copy of this proposal: `docs/patches/ze-notes-bridge-preflight-token.md`.
