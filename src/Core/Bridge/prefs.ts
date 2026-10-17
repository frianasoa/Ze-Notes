/**
 * The bridge's own preferences, and the list of preferences it must never serve.
 *
 * Everything lives under the existing `extensions.zenotes.v1.` prefix through `ZPrefs`, so
 * the settings pane binds to it the same way it binds to every other field. The bridge is
 * off, closed to every origin and read-only until the user says otherwise.
 */
import ZPrefs from "../ZPrefs";

export const PREF = {
  enabled: "bridge-enabled",
  port: "bridge-port",
  /** The old free-text list, one origin per line. Read only to migrate it; never written. */
  origins: "bridge-origins",
  /** What replaced it: one JSON array of `OriginRule`, one entry per origin. */
  originRules: "bridge-origin-rules",
  /** Retired: read once, by the migration, to seed each row's Write box. */
  allowWrites: "bridge-allow-writes",
  requireToken: "bridge-require-token",
  token: "bridge-token",
} as const;

export const DEFAULT_PORT = 23120;

/**
 * What one page may do. Named capabilities rather than one "allowed" flag, because the
 * things a page can ask for are not equally serious and a person should be able to say so:
 *
 * - `read`   the matrix, the collections, the change stream, an item's files, an image.
 * - `arrange` the table's own display settings — hide a column, colour it, widen it, sort.
 *   Separate from `write` on purpose: letting a page tidy your table is not letting it
 *   rewrite your notes.
 * - `write`  notes and annotation comments. Also needs the master "Allow writes" switch.
 * - `ai`     run a command (AI, translation, OCR) through this Zotero. This is the one that
 *   spends the user's own API quota, so it is off unless it is asked for by name.
 * - `files`  hand an attachment's file (PDF) to the page. Not a kind of `read`: reading a
 *   table of notes and carrying whole files out of the library are not the same trust, so it
 *   is off for every page until it is ticked.
 */
export const CAPABILITIES = ["read", "arrange", "write", "ai", "files"] as const;

export type Capability = (typeof CAPABILITIES)[number];

/** One origin and what it may do. The origin is matched as a whole string, as it always was. */
export type OriginRule = { origin: string } & Record<Capability, boolean>;

function rule(origin: string, granted: Partial<Record<Capability, boolean>> = {}): OriginRule {
  return {
    origin,
    read: granted.read === true,
    arrange: granted.arrange === true,
    write: granted.write === true,
    ai: granted.ai === true,
    files: granted.files === true,
  };
}

/**
 * Preferences that hold a secret. None of them is ever serialised into a response; a
 * response that would have carried one carries `"***"` and names the field it redacted.
 *
 * `custom-ai-options` can interpolate `${apikey}` and `custom-ai-format` is a JavaScript
 * string Ze-Notes evaluates, so both are treated as secrets even though neither is a key.
 */
export const SECRET_PREFS: readonly string[] = [
  "openai-api-key",
  "gemini-api-key",
  "deepseek-api-key",
  "deepseek-apikey",
  "claude-api-key",
  "custom-ai-api-key",
  "deepl-api-key",
  "google-translate-api-key",
  "dropbox-client-id",
  "dropbox-client-secret",
  "dropbox-access-token",
  "dropbox-refresh-token",
  "dropbox-last-target",
  "bridge-token",
];

/** Field names inside a stored JSON blob that are secrets wherever they appear. */
export const SECRET_FIELDS: readonly string[] = ["apikey", "api_key", "token", "options", "format"];

export const REDACTED = "***";

/** Zotero writes checkboxes as booleans and text fields as strings; accept both. */
function truthy(value: unknown): boolean {
  return value === true || value === "true" || value === "TRUE" || value === "1";
}

export const BridgePrefs = {
  enabled(): boolean {
    return truthy(ZPrefs.get(PREF.enabled, false));
  },

  port(): number {
    const raw = parseInt(String(ZPrefs.get(PREF.port, DEFAULT_PORT)), 10);
    return Number.isFinite(raw) && raw > 0 && raw < 65536 ? raw : DEFAULT_PORT;
  },

  /** The old field: one origin per line, trimmed; blanks and `#` comments ignored. */
  legacyOrigins(): string[] {
    return String(ZPrefs.get(PREF.origins, ""))
      .split(/[\r\n]+/)
      .map((line) => line.trim())
      .filter((line) => line !== "" && !line.startsWith("#"));
  },

  /**
   * The rules, one per origin.
   *
   * Stored as one JSON array in a Zotero preference rather than a row each in Ze-Notes'
   * database, the way Custom AI keeps its presets. This is read on **every request**, before
   * any work is done, and a permission check must not wait on a database or have to decide
   * what to do when one will not open. `ZPrefs` is a synchronous read of something already in
   * memory, and there is no answer it can fail to give.
   *
   * Anything malformed is dropped rather than guessed at: a rule that cannot be read is a
   * rule nobody wrote, and the safe reading of "I do not understand this permission" is not
   * to grant it.
   */
  rules(): OriginRule[] {
    const raw = String(ZPrefs.get(PREF.originRules, ""));
    if (raw.trim() !== "") {
      try {
        const parsed: unknown = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          return parsed.flatMap((entry) => {
            if (typeof entry !== "object" || entry === null) return [];
            const e = entry as Record<string, unknown>;
            const origin = typeof e["origin"] === "string" ? e["origin"].trim() : "";
            if (origin === "") return [];
            return [
              rule(origin, {
                read: truthy(e["read"]),
                arrange: truthy(e["arrange"]),
                write: truthy(e["write"]),
                ai: truthy(e["ai"]),
                // A row stored before FILES existed has no key, so it reads false: nobody is
                // granted it by the upgrade.
                files: truthy(e["files"]),
              }),
            ];
          });
        }
      } catch {
        /* fall through to the old list, which is better than locking the user out */
      }
    }
    return this.migratedRules();
  },

  /**
   * What the old free-text list means in the new model, for a profile that has not been
   * through the settings pane since this arrived.
   *
   * Every origin that could connect can still read and arrange, and can write exactly when
   * the old "Allow writes" switch said so — which is what it could do yesterday. Converting
   * that global answer into a column is the whole of why the switch could then be retired.
   *
   * **`ai` is never granted by migration**: nobody has ever agreed to let a page spend their
   * API quota, and a migration is not the place to decide that they did. Nor is `files`,
   * for the same reason: nobody agreed to let a page carry PDFs out of the library.
   */
  migratedRules(): OriginRule[] {
    const writes = this.allowWrites();
    return this.legacyOrigins().map((origin) =>
      rule(origin, { read: true, arrange: true, write: writes, ai: false, files: false }),
    );
  },

  /** Every origin that may connect at all. A rule with no capability may still handshake. */
  origins(): string[] {
    return this.rules().map((r) => r.origin);
  },

  /** Writes the whole table. The settings pane is the only caller. */
  setRules(rules: OriginRule[]): void {
    const clean = rules
      .filter((r) => typeof r.origin === "string" && r.origin.trim() !== "")
      .map((r) =>
        rule(r.origin.trim(), {
          read: r.read === true,
          arrange: r.arrange === true,
          write: r.write === true,
          ai: r.ai === true,
          files: r.files === true,
        }),
      );
    ZPrefs.set(PREF.originRules, JSON.stringify(clean));
  },

  /**
   * What this request may do.
   *
   * `origin` is null for a local script vouched for by the pairing token, which has no name
   * to hang a rule on. It keeps read, arrange and write, and never gets `ai`: a command
   * spends real money, and the only honest way to consent to that is against something you
   * can point at. A script that needs it can be given an origin of its own to send. It does
   * get `files`, like `read`: it is not a browser page, and the token already vouches for it.
   *
   * **The row is the whole answer.** There was a master "Allow writes" switch above this
   * table; it is gone. Two gates saying different things about one row is how a person comes
   * to read `WRITE ☑` on the screen while writes are refused — the exact "looks like a bug,
   * is a setting" trap this pane's status line exists to prevent. Untick the box, or take
   * the row out; **Enable bridge** off is still the one click that stops everything.
   */
  can(origin: string | null): Record<Capability, boolean> {
    if (origin === null) return { read: true, arrange: true, write: true, ai: false, files: true };
    const found = this.rules().find((r) => r.origin === origin);
    if (!found) return { read: false, arrange: false, write: false, ai: false, files: false };
    return { read: found.read, arrange: found.arrange, write: found.write, ai: found.ai, files: found.files };
  },

  /**
   * The retired master switch. Read in one place only — `migratedRules()` — to turn what a
   * profile used to mean into a Write column. Nothing else asks it, and the pane no longer
   * shows it.
   */
  allowWrites(): boolean {
    return truthy(ZPrefs.get(PREF.allowWrites, false));
  },

  requireToken(): boolean {
    return truthy(ZPrefs.get(PREF.requireToken, false));
  },

  async token(): Promise<string> {
    return await ZPrefs.getb(PREF.token, "");
  },

  /** 32 random bytes, base64url. Replaces any existing token. */
  async regenerateToken(): Promise<string> {
    const bytes = new Uint8Array(32);
    crypto.getRandomValues(bytes);
    let binary = "";
    for (const byte of bytes) binary += String.fromCharCode(byte);
    const token = btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
    await ZPrefs.setb(PREF.token, token);
    return token;
  },

  /** The token, creating one the first time it is needed. */
  async ensureToken(): Promise<string> {
    const existing = await this.token();
    return existing || (await this.regenerateToken());
  },
};

/**
 * Replaces every secret in a value with `"***"`, recursively, and reports what it hid.
 * Keys are matched case-insensitively against `SECRET_PREFS` and `SECRET_FIELDS`, and a key
 * that merely *contains* "apikey", "api-key", "secret" or "token" is redacted too, so a
 * preference added later is hidden by default rather than served by accident.
 */
export function redact(value: unknown): { value: unknown; redacted: string[] } {
  const hidden = new Set<string>();

  const isSecretKey = (key: string): boolean => {
    const k = key.toLowerCase();
    if (SECRET_PREFS.some((p) => k === p || k.endsWith("/" + p))) return true;
    if (SECRET_FIELDS.includes(k)) return true;
    return /apikey|api[-_]key|secret|token|password|refresh[-_]?token/.test(k);
  };

  const walk = (input: unknown, path: string): unknown => {
    if (Array.isArray(input)) return input.map((item, i) => walk(item, `${path}[${i}]`));
    if (input !== null && typeof input === "object") {
      const out: Record<string, unknown> = {};
      for (const [key, inner] of Object.entries(input as Record<string, unknown>)) {
        const here = path ? `${path}.${key}` : key;
        if (isSecretKey(key)) {
          out[key] = REDACTED;
          hidden.add(here);
        } else {
          out[key] = walk(inner, here);
        }
      }
      return out;
    }
    return input;
  };

  return { value: walk(value, ""), redacted: [...hidden].sort() };
}
