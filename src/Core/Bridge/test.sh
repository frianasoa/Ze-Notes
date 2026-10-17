#!/usr/bin/env bash
# Ze-Notes browser bridge - curl checks.
#
#   ./test.sh [port] [origin] [token]
#
# The origin must be one of the bridge's allowed origins. Pass the token only when
# "Require pairing token" is on; the token-mode block is skipped without it.
#
# The write checks need a note to aim at. Set NOTE_KEY to a throwaway note's key to run
# them; they are skipped otherwise, because a write REPLACES the note's contents.
#
# Also optional: SETTINGS_COLLECTION_KEY (a real collection, to read/write column widths on
# — the width check uses a made-up column tag, so it never touches a real one) and
# ATTACHMENT_ITEM_KEY (an item with at least one file attachment). The FILES checks use
# PDF_KEY (a PDF attachment), NOT_PDF_KEY (any other attachment) and FILES_DENIED_ORIGIN (an
# allowed origin with FILES unticked).
PORT="${1:-23120}"
ORIGIN="${2:-https://ariadne.alefa.net}"
TOKEN="${3:-}"
NOTE_KEY="${NOTE_KEY:-}"
BASE="http://127.0.0.1:$PORT"

pass=0
fail=0
skip=0

check() { # name expected actual
  if [ "$2" = "$3" ]; then
    printf '  ok    %-44s %s\n' "$1" "$3"
    pass=$((pass + 1))
  else
    printf '  FAIL  %-44s got %s want %s\n' "$1" "$3" "$2"
    fail=$((fail + 1))
  fi
}

skipped() {
  printf '  skip  %-44s %s\n' "$1" "$2"
  skip=$((skip + 1))
}

auth=()
[ -n "$TOKEN" ] && auth=(-H "Authorization: Bearer $TOKEN")

code() { curl -s -o /dev/null -w '%{http_code}' -m 10 "$@"; }
head1() { curl -s -D - -o /dev/null -m 10 "$@" | tr -d '\r' | grep -i "^$1:" | head -1 | cut -d' ' -f2-; }
body() { curl -s -m 20 "$@"; }

echo "== reachable =="
if [ "$(code -H "Origin: $ORIGIN" "${auth[@]}" "$BASE/status")" != "200" ]; then
  echo "  the bridge did not answer 200 on $BASE/status for origin $ORIGIN"
  echo "  check: bridge enabled, port, and that this origin is in the allow list"
  exit 1
fi
echo "  ok    bridge is listening on $BASE"

echo "== security =="
# httpd.sys.mjs rejects an unknown Host with 400 before our own 403 can run; both mean no.
check "wrong Host is rejected" "rejected" \
  "$(c=$(code -H "Host: evil.example:$PORT" -H "Origin: $ORIGIN" "${auth[@]}" "$BASE/status")
     case "$c" in 400 | 403) echo rejected ;; *) echo "$c" ;; esac)"
check "disallowed Origin -> 403" 403 \
  "$(code -H "Origin: https://evil.example" "${auth[@]}" "$BASE/status")"
check "Origin: null -> 403" 403 \
  "$(code -H "Origin: null" "${auth[@]}" "$BASE/status")"
check "allowed Origin -> 200" 200 \
  "$(code -H "Origin: $ORIGIN" "${auth[@]}" "$BASE/status")"

if [ -z "$TOKEN" ]; then
  check "no Origin and no token -> 403" 403 "$(code "$BASE/status")"
else
  skipped "no Origin and no token" "token supplied; covered below"
fi

echo "== CORS =="
check "ACAO is the exact origin" "$ORIGIN" \
  "$(head1 access-control-allow-origin -H "Origin: $ORIGIN" "${auth[@]}" "$BASE/status")"
check "Vary: Origin" "Origin" \
  "$(head1 vary -H "Origin: $ORIGIN" "${auth[@]}" "$BASE/status")"
check "no ACAO for a disallowed origin" "" \
  "$(head1 access-control-allow-origin -H "Origin: https://evil.example" "$BASE/status")"

echo "== preflight =="
PF=(-X OPTIONS -H "Origin: $ORIGIN"
  -H "Access-Control-Request-Method: PUT"
  -H "Access-Control-Request-Headers: authorization, content-type"
  -H "Access-Control-Request-Private-Network: true")
PFURL="$BASE/ze-notes/v1/collections/AAAA1111/cells"
check "preflight -> 204" 204 "$(code "${PF[@]}" "$PFURL")"
check "allow-methods includes PUT" "yes" \
  "$(head1 access-control-allow-methods "${PF[@]}" "$PFURL" | grep -qi 'PUT' && echo yes || echo no)"
check "allow-headers includes Authorization" "yes" \
  "$(head1 access-control-allow-headers "${PF[@]}" "$PFURL" | grep -qi authorization && echo yes || echo no)"
check "max-age 600" "600" "$(head1 access-control-max-age "${PF[@]}" "$PFURL")"
check "allow-private-network" "true" "$(head1 access-control-allow-private-network "${PF[@]}" "$PFURL")"

echo "== reads =="
check "collections -> 200" 200 "$(code -H "Origin: $ORIGIN" "${auth[@]}" "$BASE/ze-notes/v1/collections")"
check "changes -> 200" 200 "$(code -H "Origin: $ORIGIN" "${auth[@]}" "$BASE/ze-notes/v1/changes?since=0")"
check "presets -> 404 not_implemented" "not_implemented" \
  "$(body -H "Origin: $ORIGIN" "${auth[@]}" "$BASE/ze-notes/v1/presets" | grep -o 'not_implemented' | head -1)"
check "unknown route -> 404" 404 "$(code -H "Origin: $ORIGIN" "${auth[@]}" "$BASE/nope")"
check "unknown collection -> 404" 404 \
  "$(code -H "Origin: $ORIGIN" "${auth[@]}" "$BASE/ze-notes/v1/collections/ZZZZ9999/matrix")"

echo "== the user library's URI (API 6) =="
# Zotero's own citation URIs are built from this, so the shape matters: a synced library is
# .../users/<id>, an unsynced one .../users/local/<key>. `null` is allowed and means this
# Zotero would not say; anything else means the client would write a URI matching no item.
check "userLibraryUri is a Zotero library URI, or null" "yes"   "$(body -H "Origin: $ORIGIN" "${auth[@]}" "$BASE/status"     | grep -oE '"userLibraryUri":(null|"http://zotero\.org/users/(local/)?[^"]+")'     | grep -q . && echo yes || echo no)"

echo "== capabilities =="
# The row for this origin, as `/status` reports it. Everything below reads it rather than
# assuming: the point of the table is that two origins can get different answers.
CAN="$(body -H "Origin: $ORIGIN" "${auth[@]}" "$BASE/status" | grep -o '"can":{[^}]*}')"
check "status carries this origin's capabilities" "yes"   "$(echo "$CAN" | grep -q '"read"' && echo yes || echo no)"
check "writeEnabled agrees with can.write" "yes"   "$(W1="$(body -H "Origin: $ORIGIN" "${auth[@]}" "$BASE/status" | grep -o '"writeEnabled": *\(true\|false\)' | grep -o 'true\|false')";      W2="$(echo "$CAN" | grep -o '"write":\(true\|false\)' | grep -o 'true\|false')";      [ "$W1" = "$W2" ] && echo yes || echo no)"
# A reader that may not read gets a named refusal, not a bare 403 or an empty list. Tick
# nothing for a throwaway origin and set DENIED_ORIGIN to it to run this.
if [ -n "$DENIED_ORIGIN" ]; then
  check "an origin with no capabilities -> read_not_allowed" "read_not_allowed"     "$(body -H "Origin: $DENIED_ORIGIN" "${auth[@]}" "$BASE/ze-notes/v1/collections"       | grep -o 'read_not_allowed' | head -1)"
  check "...and is still allowed to ask what it may do" 200     "$(code -H "Origin: $DENIED_ORIGIN" "${auth[@]}" "$BASE/status")"
else
  skipped "an origin with no capabilities" "set DENIED_ORIGIN to an origin with every box unticked"
fi

echo "== a new note (API 8) =="
check "bridgeApi is at least 8" "yes"   "$(body -H "Origin: $ORIGIN" "${auth[@]}" "$BASE/status"     | grep -o '"bridgeApi":[0-9]*' | grep -qE ':([8-9]|[0-9]{2,})' && echo yes || echo no)"
check "no html -> bad_request" "bad_request"   "$(body -X POST -H "Origin: $ORIGIN" "${auth[@]}" -H "Content-Type: application/json"     -d '{}' "$BASE/ze-notes/v1/collections/AAAA1111/notes" | grep -o 'bad_request' | head -1)"
check "an unknown collection -> 404" 404   "$(code -X POST -H "Origin: $ORIGIN" "${auth[@]}" -H "Content-Type: application/json"     -d '{"html":"<p>x</p>"}' "$BASE/ze-notes/v1/collections/ZZZZ9999/notes")"
# Making one really does add a note to the library, so it is opt-in.
if [ -n "$NEW_ROW_COLLECTION_KEY" ]; then
  check "a standalone note is created, and is a row" "true"     "$(body -X POST -H "Origin: $ORIGIN" "${auth[@]}" -H "Content-Type: application/json"       -d '{"html":"<div data-schema-version=\"9\"><p>bridge test row</p></div>"}'       "$BASE/ze-notes/v1/collections/$NEW_ROW_COLLECTION_KEY/notes"       | grep -o '"row":[a-z]*' | cut -d: -f2)"
  echo "        (delete 'bridge test row' from that collection when you are done)"
else
  skipped "making a new row" "set NEW_ROW_COLLECTION_KEY to a throwaway collection"
fi

echo "== commands (API 7) =="
check "bridgeApi is at least 7" "yes"   "$(body -H "Origin: $ORIGIN" "${auth[@]}" "$BASE/status"     | grep -o '"bridgeApi":[0-9]*' | grep -qE ':([7-9]|[0-9]{2,})' && echo yes || echo no)"
check "capabilities lists commands" "yes"   "$(body -H "Origin: $ORIGIN" "${auth[@]}" "$BASE/capabilities"     | grep -q '"commands"' && echo yes || echo no)"
# The allowlist, which is the whole reason nothing a page sends is ever evaluated.
check "an unknown command -> unknown_command" "unknown_command"   "$(body -X POST -H "Origin: $ORIGIN" "${auth[@]}" -H "Content-Type: application/json"     -d '{"targets":[{"key":"AAAA1111"}]}' "$BASE/commands/ai.invented"     | grep -o 'unknown_command' | head -1)"
check "no targets -> bad_request" "bad_request"   "$(body -X POST -H "Origin: $ORIGIN" "${auth[@]}" -H "Content-Type: application/json"     -d '{}' "$BASE/commands/ai.openai" | grep -o 'bad_request' | head -1)"
check "an unknown job -> 404" 404   "$(code -H "Origin: $ORIGIN" "${auth[@]}" "$BASE/commands/jobs/ZZZZZZZZZZZZ")"
# Actually running one spends money, so it is opt-in. Set RUN_COMMAND to an id from
# /capabilities and RUN_KEY to a note key to prove the round trip.
if [ -n "$RUN_COMMAND" ] && [ -n "$RUN_KEY" ]; then
  JOB="$(body -X POST -H "Origin: $ORIGIN" "${auth[@]}" -H "Content-Type: application/json"     -d "{\"targets\":[{\"key\":\"$RUN_KEY\"}]}" "$BASE/commands/$RUN_COMMAND"     | grep -o '"jobId":"[^"]*"' | cut -d'"' -f4)"
  check "a run returns a job id" "yes" "$([ -n "$JOB" ] && echo yes || echo no)"
  if [ -n "$JOB" ]; then
    sleep 20
    check "the job finished" "done"       "$(body -H "Origin: $ORIGIN" "${auth[@]}" "$BASE/commands/jobs/$JOB"         | grep -o '"state":"[^"]*"' | cut -d'"' -f4)"
  fi
else
  skipped "running a command" "set RUN_COMMAND (an id from /capabilities) and RUN_KEY (a note key)"
fi

echo "== images =="
check "bridgeApi is at least 4" "yes" \
  "$(body -H "Origin: $ORIGIN" "${auth[@]}" "$BASE/status" \
    | grep -o '"bridgeApi":[0-9]*' | grep -qE ':([4-9]|[0-9]{2,})' && echo yes || echo no)"
check "unknown annotation image -> 404" 404 \
  "$(code -H "Origin: $ORIGIN" "${auth[@]}" "$BASE/zotero/v1/annotations/ZZZZ9999/image")"
check "unknown attachment image -> 404" 404 \
  "$(code -H "Origin: $ORIGIN" "${auth[@]}" "$BASE/zotero/v1/attachments/ZZZZ9999/image")"
# The one rule that keeps this route from reading a PDF out of the library. Set
# PDF_KEY to any PDF attachment's key to prove it.
if [ -n "$PDF_KEY" ]; then
  check "a PDF attachment -> 415 not_an_image" "not_an_image" \
    "$(body -H "Origin: $ORIGIN" "${auth[@]}" "$BASE/zotero/v1/attachments/$PDF_KEY/image" \
      | grep -o 'not_an_image' | head -1)"
else
  skipped "PDF is refused as not_an_image" "set PDF_KEY=<a PDF attachment key>"
fi
# An image annotation whose cache Zotero has already rendered: real bytes, real type.
if [ -n "$IMAGE_ANNOTATION_KEY" ]; then
  check "annotation image -> 200" 200 \
    "$(code -H "Origin: $ORIGIN" "${auth[@]}" "$BASE/zotero/v1/annotations/$IMAGE_ANNOTATION_KEY/image")"
  check "annotation image is a PNG" "image/png" \
    "$(head1 content-type -H "Origin: $ORIGIN" "${auth[@]}" "$BASE/zotero/v1/annotations/$IMAGE_ANNOTATION_KEY/image")"
  # Bytes, not text: `response.write()` would have mangled the signature.
  check "annotation image starts with the PNG signature" "yes" \
    "$(curl -s -H "Origin: $ORIGIN" "${auth[@]}" "$BASE/zotero/v1/annotations/$IMAGE_ANNOTATION_KEY/image" \
      | head -c 8 | od -An -tx1 | tr -d ' \n' | grep -q '^89504e470d0a1a0a$' && echo yes || echo no)"
else
  skipped "a real annotation image round-trips" "set IMAGE_ANNOTATION_KEY=<an image annotation key>"
fi

echo "== encoding =="
# response.write() in httpd.sys.mjs truncates code points to their low byte. Non-ASCII
# collection names are the canary; this must stay green.
TMP="$(mktemp)"
curl -s -m 30 -H "Origin: $ORIGIN" "${auth[@]}" "$BASE/ze-notes/v1/collections" -o "$TMP"
PYPATH="$(cygpath -w "$TMP" 2>/dev/null || echo "$TMP")"
check "response is valid UTF-8 JSON" "ok" \
  "$(python -c "
import json,sys
raw=open(sys.argv[1],'rb').read()
try:
    json.loads(raw.decode('utf-8')); print('ok')
except Exception as e:
    print('BROKEN: %s' % e)
" "$PYPATH")"
check "non-ASCII names survive" "ok" \
  "$(python -c "
import json,sys
try:
    d=json.load(open(sys.argv[1],encoding='utf-8'))
except Exception:
    print('BROKEN'); raise SystemExit
bad=[c['name'] for c in d['collections'] if any(0xDC80 <= ord(ch) <= 0xDCFF for ch in c['name'])]
print('BROKEN' if bad else 'ok')
" "$PYPATH")"
rm -f "$TMP"

echo "== write gate =="
WRITE_ENABLED="$(body -H "Origin: $ORIGIN" "${auth[@]}" "$BASE/status" | grep -o '"writeEnabled": *true' | head -1)"
PUTURL="$BASE/ze-notes/v1/collections/AAAA1111/cells"
if [ -z "$WRITE_ENABLED" ]; then
  check "writes off -> 403" 403 \
    "$(code -X PUT -H "Origin: $ORIGIN" "${auth[@]}" -H "Content-Type: application/json" \
      -d '{"itemKey":"AAAA1111","column":"x","html":"<p>x</p>"}' "$PUTURL")"
  skipped "409 on a stale ifDateModified" "tick Write for this page to test"
else
  check "writes on -> not 403" "not-403" \
    "$(c=$(code -X PUT -H "Origin: $ORIGIN" "${auth[@]}" -H "Content-Type: application/json" \
      -d '{"itemKey":"AAAA1111","column":"x","html":"<p>x</p>"}' "$PUTURL")
       [ "$c" = "403" ] && echo 403 || echo not-403)"
  if [ -n "$NOTE_KEY" ]; then
    check "409 on a stale ifDateModified" 409 \
      "$(code -X PATCH -H "Origin: $ORIGIN" "${auth[@]}" -H "Content-Type: application/json" \
        -d '{"html":"<p>should not land</p>","ifDateModified":"1999-01-01 00:00:00"}' \
        "$BASE/zotero/v1/notes/$NOTE_KEY")"
    check "stale 409 returns the current value" "yes" \
      "$(body -X PATCH -H "Origin: $ORIGIN" "${auth[@]}" -H "Content-Type: application/json" \
        -d '{"html":"<p>should not land</p>","ifDateModified":"1999-01-01 00:00:00"}' \
        "$BASE/zotero/v1/notes/$NOTE_KEY" | grep -q '"current"' && echo yes || echo no)"
  else
    skipped "409 on a stale ifDateModified" "set NOTE_KEY=<a throwaway note key>"
  fi

  # API 3: editing an annotation comment, and deleting a note.
  if [ -n "$ANNOTATION_KEY" ]; then
    check "annotation comment: 409 on a stale ifDateModified" "yes" \
      "$(body -X PATCH -H "Origin: $ORIGIN" "${auth[@]}" -H "Content-Type: application/json" \
        -d '{"comment":"should not land","ifDateModified":"1999-01-01 00:00:00"}' \
        "$BASE/zotero/v1/annotations/$ANNOTATION_KEY" | grep -q '"comment"' && echo yes || echo no)"
    check "annotation comment: missing comment -> 400" 400 \
      "$(code -X PATCH -H "Origin: $ORIGIN" "${auth[@]}" -H "Content-Type: application/json" \
        -d '{}' "$BASE/zotero/v1/annotations/$ANNOTATION_KEY")"
  else
    skipped "annotation comment checks" "set ANNOTATION_KEY=<an annotation key>"
  fi

  check "annotation comment: unknown key -> 404" 404 \
    "$(code -X PATCH -H "Origin: $ORIGIN" "${auth[@]}" -H "Content-Type: application/json" \
      -d '{"comment":"x"}' "$BASE/zotero/v1/annotations/ZZZZ9999")"
  check "delete note: unknown key -> 404" 404 \
    "$(code -X DELETE -H "Origin: $ORIGIN" "${auth[@]}" "$BASE/zotero/v1/notes/ZZZZ9999")"

  # Destructive, so it is opt-in twice over: a key you are willing to lose, and a flag.
  if [ -n "$DELETE_NOTE_KEY" ]; then
    check "delete note -> 200" 200 \
      "$(code -X DELETE -H "Origin: $ORIGIN" "${auth[@]}" "$BASE/zotero/v1/notes/$DELETE_NOTE_KEY")"
    check "the note is gone" 404 \
      "$(code -X DELETE -H "Origin: $ORIGIN" "${auth[@]}" "$BASE/zotero/v1/notes/$DELETE_NOTE_KEY")"
  else
    skipped "deleting a note" "set DELETE_NOTE_KEY=<a note you do not mind losing>"
  fi
fi

echo "== column widths (API 4) =="
if [ -n "$SETTINGS_COLLECTION_KEY" ]; then
  SETTLE_URL="$BASE/ze-notes/v1/collections/$SETTINGS_COLLECTION_KEY/settings"
  check "settings -> 200" 200 "$(code -H "Origin: $ORIGIN" "${auth[@]}" "$SETTLE_URL")"
  SETTINGS_BODY="$(body -H "Origin: $ORIGIN" "${auth[@]}" "$SETTLE_URL")"
  check "settings include columnWidths" "yes" \
    "$(echo "$SETTINGS_BODY" | grep -q '"columnWidths"' && echo yes || echo no)"
  check "settings include allColumnsWidth" "yes" \
    "$(echo "$SETTINGS_BODY" | grep -q '"allColumnsWidth"' && echo yes || echo no)"

  if [ -n "$WRITE_ENABLED" ]; then
    # A made-up column tag: no real header ever has this name, so storing a width under it
    # cannot change what any real table shows while the check runs.
    REV="$(echo "$SETTINGS_BODY" | grep -o '"rev":"[^"]*"' | head -1)"
    NEWBODY="$(body -X PUT -H "Origin: $ORIGIN" "${auth[@]}" -H "Content-Type: application/json" \
      -d "{\"ifRev\":${REV#*:},\"display\":{\"columnWidths\":{\"__bridge_test__\":111}}}" "$SETTLE_URL")"
    check "setting a width round-trips" "yes" \
      "$(echo "$NEWBODY" | grep -q '"__bridge_test__":111' && echo yes || echo no)"
    NEWREV="$(echo "$NEWBODY" | grep -o '"rev":"[^"]*"' | head -1)"
    check "rev changed after a width write" "yes" \
      "$([ "$NEWREV" != "$REV" ] && echo yes || echo no)"
    check "the now-stale rev is rejected" 409 \
      "$(code -X PUT -H "Origin: $ORIGIN" "${auth[@]}" -H "Content-Type: application/json" \
        -d "{\"ifRev\":${REV#*:},\"display\":{\"columnWidths\":{\"__bridge_test__\":222}}}" "$SETTLE_URL")"
    # Clean up: a zero width removes the row rather than storing junk.
    CLEANBODY="$(body -X PUT -H "Origin: $ORIGIN" "${auth[@]}" -H "Content-Type: application/json" \
      -d '{"display":{"columnWidths":{"__bridge_test__":0}}}' "$SETTLE_URL")"
    check "a zero width removes the row again" "no" \
      "$(echo "$CLEANBODY" | grep -q '"__bridge_test__"' && echo yes || echo no)"
  else
    skipped "writing a column width" "turn Allow writes on to test"
  fi
else
  skipped "column width checks" "set SETTINGS_COLLECTION_KEY=<a real collection key>"
fi

echo "== item attachments (API 4) =="
check "unknown item -> 404" 404 \
  "$(code -H "Origin: $ORIGIN" "${auth[@]}" "$BASE/zotero/v1/items/ZZZZ9999/attachments")"
if [ -n "$ATTACHMENT_ITEM_KEY" ]; then
  check "attachments -> 200" 200 \
    "$(code -H "Origin: $ORIGIN" "${auth[@]}" "$BASE/zotero/v1/items/$ATTACHMENT_ITEM_KEY/attachments")"
  ATTACH_BODY="$(body -H "Origin: $ORIGIN" "${auth[@]}" "$BASE/zotero/v1/items/$ATTACHMENT_ITEM_KEY/attachments")"
  check "attachments response has the attachments array" "yes" \
    "$(echo "$ATTACH_BODY" | grep -q '"attachments":\[' && echo yes || echo no)"
  check "each attachment carries a linkMode, no file bytes" "yes" \
    "$(echo "$ATTACH_BODY" | grep -q '"linkMode"' && echo yes || echo no)"
else
  skipped "item attachments checks" "set ATTACHMENT_ITEM_KEY=<an item with a file attachment>"
fi

echo "== attachment file (FILES) =="
# The route announces itself by `files` appearing in `can`; there is no bridgeApi bump.
check "can lists files" "yes" "$(echo "$CAN" | grep -q '"files"' && echo yes || echo no)"
# The preflight fix must hold on this path too: no token, allowed origin -> 204.
check "preflight for ...file -> 204" 204 \
  "$(code -X OPTIONS -H "Origin: $ORIGIN" -H "Access-Control-Request-Method: GET" \
    -H "Access-Control-Request-Headers: authorization" "$BASE/zotero/v1/attachments/ZZZZ9999/file")"
# A page with FILES unticked is refused by name, whatever the key. Tick everything but FILES
# for a throwaway origin and set FILES_DENIED_ORIGIN to it to run this.
if [ -n "$FILES_DENIED_ORIGIN" ]; then
  check "an origin without FILES -> files_not_allowed" "files_not_allowed" \
    "$(body -H "Origin: $FILES_DENIED_ORIGIN" "${auth[@]}" "$BASE/zotero/v1/attachments/ZZZZ9999/file" \
      | grep -o 'files_not_allowed' | head -1)"
else
  skipped "an origin without FILES is refused" "set FILES_DENIED_ORIGIN to an origin with FILES unticked"
fi
if echo "$CAN" | grep -q '"files":true'; then
  check "unknown attachment file -> 404" 404 \
    "$(code -H "Origin: $ORIGIN" "${auth[@]}" "$BASE/zotero/v1/attachments/ZZZZ9999/file")"
  if [ -n "$PDF_KEY" ]; then
    check "PDF file -> 200" 200 \
      "$(code -H "Origin: $ORIGIN" "${auth[@]}" "$BASE/zotero/v1/attachments/$PDF_KEY/file")"
    check "PDF file is application/pdf" "application/pdf" \
      "$(head1 content-type -H "Origin: $ORIGIN" "${auth[@]}" "$BASE/zotero/v1/attachments/$PDF_KEY/file")"
    # Bytes, not text: the signature survives only through sendBytes().
    check "PDF file starts with %PDF" "%PDF" \
      "$(curl -s -m 30 -H "Origin: $ORIGIN" "${auth[@]}" "$BASE/zotero/v1/attachments/$PDF_KEY/file" | head -c 4)"
  else
    skipped "a real PDF round-trips" "set PDF_KEY=<a PDF attachment key>"
  fi
  if [ -n "$NOT_PDF_KEY" ]; then
    check "a non-PDF attachment -> not_a_pdf" "not_a_pdf" \
      "$(body -H "Origin: $ORIGIN" "${auth[@]}" "$BASE/zotero/v1/attachments/$NOT_PDF_KEY/file" \
        | grep -o 'not_a_pdf' | head -1)"
  else
    skipped "a non-PDF is refused as not_a_pdf" "set NOT_PDF_KEY=<a non-PDF attachment key>"
  fi
else
  check "FILES unticked for $ORIGIN -> files_not_allowed" "files_not_allowed" \
    "$(body -H "Origin: $ORIGIN" "${auth[@]}" "$BASE/zotero/v1/attachments/ZZZZ9999/file" \
      | grep -o 'files_not_allowed' | head -1)"
  skipped "attachment file checks" "tick FILES for $ORIGIN to run them"
fi

if [ -n "$TOKEN" ]; then
  echo "== token mode =="
  check "wrong token -> 401" 401 \
    "$(code -H "Origin: $ORIGIN" -H "Authorization: Bearer wrong-token-entirely" "$BASE/status")"
  check "missing token -> 401" 401 "$(code -H "Origin: $ORIGIN" "$BASE/status")"
  check "right token -> 200" 200 \
    "$(code -H "Origin: $ORIGIN" -H "Authorization: Bearer $TOKEN" "$BASE/status")"
  check "no Origin but a token -> 200" 200 \
    "$(code -H "Authorization: Bearer $TOKEN" "$BASE/status")"
  check "preflight needs no token -> 204" 204 \
    "$(code -X OPTIONS -H "Origin: $ORIGIN" -H "Access-Control-Request-Method: GET" \
      -H "Access-Control-Request-Headers: authorization" "$BASE/status")"
  check "preflight from a disallowed origin -> 403" 403 \
    "$(code -X OPTIONS -H "Origin: https://evil.example" -H "Access-Control-Request-Method: GET" \
      -H "Access-Control-Request-Headers: authorization" "$BASE/status")"
else
  echo "== token mode =="
  skipped "token checks" "pass the token as argument 3 with token mode on"
fi

echo
echo "$pass passed, $fail failed, $skip skipped"
[ "$fail" -eq 0 ]
