/**
 * Every request passes through here before any work is done.
 *
 * The order is fixed: Host, then Origin, then token, then (for a write) the write switch.
 * A CORS preflight (`OPTIONS`) from an allowed origin stops after Origin, because browsers
 * never send credentials on one; it serves only CORS headers. A request that fails any of them never reaches a handler, and a request from a
 * disallowed origin gets no CORS headers at all, so the browser reports it as a CORS
 * failure rather than letting the page read the body.
 *
 * Note on Host: `httpd.sys.mjs` validates the Host header against its own registered
 * identities and answers 400 before this code runs, so the check below is defence in depth
 * and its 403 is only reachable for a host httpd accepts but we do not.
 */
import { BridgePrefs } from "./prefs";
import type { Capability } from "./prefs";
import type { BridgeRequest } from "./http";
import { header, query } from "./http";

export interface Allowed {
  ok: true;
  /** The origin to echo in `Access-Control-Allow-Origin`, or null when there is none. */
  origin: string | null;
}

export interface Denied {
  ok: false;
  status: number;
  code: string;
  message: string;
  /** Echo CORS on a denial only when the origin itself was allowed. */
  origin: string | null;
}

export type Decision = Allowed | Denied;

/** Length-independent comparison, so a wrong token leaks nothing through timing. */
export function constantTimeEquals(a: string, b: string): boolean {
  if (typeof a !== "string" || typeof b !== "string") return false;
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function bearer(request: BridgeRequest): string | null {
  const auth = header(request, "Authorization");
  if (auth && auth.startsWith("Bearer ")) return auth.slice(7);
  return null;
}

/**
 * The token a request offers. `Authorization: Bearer` everywhere; `?token=` is accepted
 * only for the SSE stream, because `EventSource` cannot set a header.
 */
function offeredToken(request: BridgeRequest, isStream: boolean): string | null {
  const fromHeader = bearer(request);
  if (fromHeader) return fromHeader;
  if (isStream) return query(request).get("token");
  return null;
}

export async function authorise(request: BridgeRequest, port: number, isStream: boolean): Promise<Decision> {
  const deny = (status: number, code: string, message: string, origin: string | null): Denied => ({
    ok: false,
    status,
    code,
    message,
    origin,
  });

  // 1. Host: loopback, this port, nothing else.
  const host = header(request, "Host") ?? "";
  if (host !== `127.0.0.1:${port}` && host !== `localhost:${port}`) {
    return deny(403, "bad_host", "Host header is not a loopback address for this port", null);
  }

  // 2. Origin: exact string match against the allow list. `null` is never allowed.
  const origin = header(request, "Origin");
  const allowedOrigins = BridgePrefs.origins();
  const originAllowed = origin !== null && origin !== "null" && allowedOrigins.some((o) => o === origin);

  const tokenRequired = BridgePrefs.requireToken();
  const offered = offeredToken(request, isStream);
  const expected = tokenRequired ? await BridgePrefs.token() : "";
  const tokenValid = tokenRequired && expected !== "" && constantTimeEquals(offered ?? "", expected);

  if (origin === null) {
    // No Origin at all: a local script, not a page. Only token mode can vouch for it.
    if (!tokenValid) {
      return deny(403, "origin_required", "No Origin header and no valid token", null);
    }
  } else if (!originAllowed) {
    return deny(403, "origin_not_allowed", "Origin is not in the allow list", null);
  }

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
    return deny(401, "unauthorized", "Missing or invalid bearer token", echo);
  }

  return { ok: true, origin: echo };
}

/**
 * What the page behind this request may do — its row in the origins table, with the master
 * "Allow writes" switch already folded into `write`.
 *
 * Every route asks this rather than reading a preference of its own, so there is one place
 * where "may it?" is answered and one place to look when the answer surprises somebody.
 */
export function capabilities(origin: string | null): Record<Capability, boolean> {
  return BridgePrefs.can(origin);
}

/**
 * The refusal for a capability the caller has not got, in the shape the routes send.
 *
 * `writes_disabled` keeps its name from when writes were one switch for everyone: clients
 * match on that code, and a rename would break them to say the same thing. The other three
 * are new and say which capability was missing, because "403" on its own sends a person
 * looking through the wrong settings.
 */
export const DENIED_CODE: Record<Capability, string> = {
  read: "read_not_allowed",
  arrange: "arrange_not_allowed",
  write: "writes_disabled",
  ai: "commands_not_allowed",
  files: "files_not_allowed",
};

