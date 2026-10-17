/**
 * The thin HTTP layer: the shapes `httpd.sys.mjs` hands us, and the only sanctioned way to
 * put bytes on the wire.
 *
 * **Never call `response.write()`.** `httpd.sys.mjs` implements it as
 * `bodyOutputStream.write(str, str.length)`, which writes bytes but measures UTF-16 code
 * units, so every code point above U+00FF is truncated to its low byte. Japanese and
 * accented text come back corrupt, and a truncated byte that lands on `"` breaks the JSON
 * structurally. Everything here encodes to UTF-8 first and writes the bytes.
 */

/** The subset of `nsIHttpRequest` the bridge uses. */
export interface BridgeRequest {
  method: string;
  path: string;
  queryString: string;
  hasHeader(name: string): boolean;
  getHeader(name: string): string;
  bodyInputStream: { available(): number } | null;
}

/** The subset of `nsIHttpResponse` the bridge uses. */
export interface BridgeResponse {
  setStatusLine(httpVersion: string, code: number, description: string): void;
  setHeader(name: string, value: string, merge: boolean): void;
  processAsync(): void;
  finish(): void;
  bodyOutputStream: unknown;
}

export const STATUS_TEXT: Record<number, string> = {
  200: "OK",
  204: "No Content",
  400: "Bad Request",
  401: "Unauthorized",
  403: "Forbidden",
  404: "Not Found",
  409: "Conflict",
  413: "Payload Too Large",
  500: "Internal Server Error",
  503: "Service Unavailable",
};

/**
 * A UTF-8 writer bound to one response. Keep the returned function for a stream; call it
 * once and drop it for a normal body.
 */
export function utf8Writer(response: BridgeResponse): (text: string) => void {
  const stream = Cc["@mozilla.org/binaryoutputstream;1"].createInstance(Ci.nsIBinaryOutputStream);
  stream.setOutputStream(response.bodyOutputStream as nsIOutputStream);
  const encoder = new TextEncoder();
  return (text: string) => {
    const bytes = encoder.encode(text);
    // `writeByteArray` takes a sequence<octet>; a Uint8Array satisfies it.
    stream.writeByteArray(bytes as unknown as number[]);
  };
}

/**
 * Raw bytes: an image, and so far nothing else.
 *
 * The same stream `utf8Writer` uses, without the encoder. `response.write()` would mangle
 * these exactly as it mangles non-ASCII text, and far more visibly — most of a PNG is bytes
 * above 0x7F.
 */
export function sendBytes(
  response: BridgeResponse,
  bytes: Uint8Array,
  contentType: string,
  origin: string | null,
): void {
  response.setStatusLine("1.1", 200, STATUS_TEXT[200] ?? "OK");
  response.setHeader("Content-Type", contentType, false);
  response.setHeader("Content-Length", String(bytes.byteLength), false);
  response.setHeader("Cache-Control", "no-store", false);
  setCors(response, origin);
  const stream = Cc["@mozilla.org/binaryoutputstream;1"].createInstance(Ci.nsIBinaryOutputStream);
  stream.setOutputStream(response.bodyOutputStream as nsIOutputStream);
  stream.writeByteArray(bytes as unknown as number[]);
}

export function byteLength(text: string): number {
  return new TextEncoder().encode(text).length;
}

/** `Access-Control-Allow-Origin` is only ever the exact origin, never `*`. */
export function setCors(response: BridgeResponse, origin: string | null): void {
  if (!origin) return;
  response.setHeader("Access-Control-Allow-Origin", origin, false);
  response.setHeader("Vary", "Origin", false);
}

export function sendJson(response: BridgeResponse, code: number, body: unknown, origin: string | null): void {
  const text = JSON.stringify(body);
  response.setStatusLine("1.1", code, STATUS_TEXT[code] ?? "Error");
  response.setHeader("Content-Type", "application/json; charset=utf-8", false);
  response.setHeader("Content-Length", String(byteLength(text)), false);
  setCors(response, origin);
  utf8Writer(response)(text);
}

export function sendError(
  response: BridgeResponse,
  code: number,
  errorCode: string,
  message: string,
  origin: string | null,
): void {
  sendJson(response, code, { error: { code: errorCode, message } }, origin);
}

export function sendEmpty(response: BridgeResponse, code: number, origin: string | null): void {
  response.setStatusLine("1.1", code, STATUS_TEXT[code] ?? "OK");
  response.setHeader("Content-Length", "0", false);
  setCors(response, origin);
}

export const MAX_BODY_BYTES = 2 * 1024 * 1024;

/** The request body as text, or `null` when it is over the 2 MB cap (the caller sends 413). */
export function readBody(request: BridgeRequest): string | null {
  const stream = request.bodyInputStream;
  if (!stream) return "";
  let available = 0;
  try {
    available = stream.available();
  } catch {
    return "";
  }
  if (available > MAX_BODY_BYTES) return null;
  if (available === 0) return "";
  const { NetUtil } = ChromeUtils.importESModule("resource://gre/modules/NetUtil.sys.mjs") as {
    NetUtil: { readInputStreamToString(s: unknown, n: number, o: { charset: string }): string };
  };
  return NetUtil.readInputStreamToString(stream, available, { charset: "UTF-8" });
}

export function query(request: BridgeRequest): URLSearchParams {
  return new URLSearchParams(request.queryString || "");
}

export function header(request: BridgeRequest, name: string): string | null {
  return request.hasHeader(name) ? request.getHeader(name) : null;
}
