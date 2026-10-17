/**
 * Running one of Ze-Notes' own actions on behalf of a page.
 *
 * The page names **keys**, never text (`docs/09-bridge-commands.md` in Clew, and the
 * "Commands" section of `API.md`). This module turns those keys back into the text this
 * Zotero already holds, hands it to the action the page asked for, and keeps the answer until
 * the page comes back for it. Nothing a page sends is ever evaluated, and no prompt, prose or
 * instruction crosses the socket inbound — only ids from the allowlist and Zotero keys.
 *
 * Why it works this way:
 *
 * - **The catalogue is the allowlist.** `catalogue()` is built from what this Zotero has
 *   configured; an id that is not in it is a 404 before anything is resolved.
 * - **The pieces are shaped like the plugin's own.** `PromptFormat.zcontent` gives the AI
 *   `{ element, value }` per piece and the menus send an array of them, so a command over the
 *   bridge puts the same thing in front of the model as the right-click menu does. A page
 *   asking about one part of a note gets what it would get from Ze-Notes itself.
 * - **The answer is held, not delivered.** `POST /commands/:id` returns as soon as the work
 *   is accepted, because a model takes seconds to minutes and an HTTP request that waits that
 *   long is a request that fails for reasons nobody can debug.
 */
import Ai from "../Ai";
import Translation from "../Translation";
import Utils from "../Utils";
import ZPrefs from "../ZPrefs";
import Changes from "./changes";

/** One piece of text a command runs on, shaped as `PromptFormat.zcontent` shapes it. */
export interface Piece {
  /** The `[[Title]]` this piece came from; `""` for a whole note or comment. */
  element: string;
  value: string;
}

export interface CommandSpec {
  id: string;
  label: string;
  available: boolean;
  /** Why it cannot run, in this Zotero's own words. Shown beside the greyed entry. */
  why?: string;
  run(pieces: Piece[], progress: (done: number, total: number) => void): Promise<string>;
}

/**
 * How much text a single command may be given, in characters.
 *
 * This end knows what the models cost and the page does not, so the refusal belongs here —
 * and it is a refusal rather than a silent truncation, because a summary of the half of a
 * table that happened to fit is worse than no summary. A hidden preference on purpose: it is
 * a backstop, not a knob, and the page already shows the size before it sends anything.
 */
const CAP_PREF = "bridge-command-cap";
const DEFAULT_CAP = 100000;

export function characterCap(): number {
  const raw = parseInt(String(ZPrefs.get(CAP_PREF, DEFAULT_CAP)), 10);
  return Number.isFinite(raw) && raw > 0 ? raw : DEFAULT_CAP;
}

/** The AI providers, as `/capabilities` entries. A provider with no key is shown, not hidden. */
async function aiCommands(): Promise<CommandSpec[]> {
  const out: CommandSpec[] = [];

  for (const config of Object.values(Ai.Providers.configs)) {
    const apikey = await Ai.Providers.apikey(config);
    out.push({
      id: `ai.${config.id}`,
      label: config.label,
      available: apikey !== "",
      ...(apikey === "" ? { why: `No API key for ${config.label}` } : {}),
      run: async (pieces) => {
        const answer = await Ai.Providers.prompt(config, JSON.stringify(pieces));
        return Array.isArray(answer) ? answer.join("\n\n") : String(answer);
      },
    });
  }

  // The saved Custom AI presets, exactly the ones the plugin's own menu offers: its
  // `CustomAiMenu` skips a preset whose "Use" box is unticked, and so does this.
  try {
    const settings = await Ai.CustomAI.settinglist();
    for (const key of Object.keys(settings).sort()) {
      const setting = settings[key];
      if (!setting?.use) continue;
      out.push({
        id: `ai.custom.${setting.name}`,
        label: String(setting.name),
        available: true,
        run: async (pieces) => {
          const answer = await Ai.CustomAI.prompt(JSON.stringify(pieces), key);
          return Array.isArray(answer) ? answer.join("\n\n") : String(answer);
        },
      });
    }
  } catch {
    // A preset list that will not load costs those entries and nothing else.
  }

  return out;
}

/**
 * Translation, one piece at a time.
 *
 * Unlike a prompt, this is not given JSON: a translator is asked for a sentence and answers
 * with a sentence, so each piece goes over on its own and the parts are put back together in
 * the order they arrived. That is also what makes progress worth reporting here and not for
 * the AI, which is a single call however many pieces it was given.
 */
async function translateCommands(): Promise<CommandSpec[]> {
  const language = String(ZPrefs.get("translation-language", "") || "");
  const providers: Array<{ id: string; label: string; pref: string; translate: (t: string, l: string) => Promise<any> }> =
    [
      { id: "deepl", label: "DeepL", pref: "deepl-api-key", translate: (t, l) => Translation.DeepL.translate(t, l) },
      {
        id: "google",
        label: "Google Translate",
        pref: "google-translate-api-key",
        translate: (t, l) => Translation.Google.translate(t, l),
      },
    ];

  const out: CommandSpec[] = [];
  for (const provider of providers) {
    const apikey = await ZPrefs.getb(provider.pref, "");
    const why = apikey === "" ? `No API key for ${provider.label}` : language === "" ? "No target language chosen" : "";
    out.push({
      id: `translate.${provider.id}`,
      label: `${provider.label} → ${language || "?"}`,
      available: why === "",
      ...(why ? { why } : {}),
      run: async (pieces, progress) => {
        const done: string[] = [];
        progress(0, pieces.length);
        for (const piece of pieces) {
          const answer = await provider.translate(piece.value, language);
          done.push(Array.isArray(answer) ? answer.join(" ") : String(answer));
          progress(done.length, pieces.length);
        }
        return done.join("\n\n");
      },
    });
  }
  return out;
}

/**
 * Everything this Zotero can be asked to run.
 *
 * OCR is deliberately absent rather than listed as unavailable: it works on a scanned page,
 * not on a piece of text, so it is not the same shape of command and advertising an id that
 * nothing implements would be a promise the bridge cannot keep.
 */
export async function catalogue(): Promise<CommandSpec[]> {
  return [...(await aiCommands()), ...(await translateCommands())];
}

// ------------------------------------------------------------------- jobs ---

export interface Job {
  jobId: string;
  state: "running" | "done" | "failed";
  done: number;
  total: number;
  answer: string;
  message: string;
  at: number;
}

/** Finished jobs are kept so a page that was closed mid-run can still come back for one. */
const MAX_JOBS = 50;
const jobs = new Map<string, Job>();

export function job(jobId: string): Job | null {
  return jobs.get(jobId) ?? null;
}

function remember(entry: Job): void {
  jobs.set(entry.jobId, entry);
  // Oldest first, because `Map` keeps insertion order and a long Zotero session would
  // otherwise hold every answer it ever gave.
  while (jobs.size > MAX_JOBS) {
    const oldest = jobs.keys().next();
    if (oldest.done) break;
    jobs.delete(oldest.value);
  }
}

/**
 * Starts one command and returns its id at once.
 *
 * The stream carries `command.progress` and `command.done` so a client does not have to ask
 * repeatedly; `GET /commands/jobs/:id` is what those events point at, and what a client that
 * missed one falls back to. Progress is only emitted when the count actually moves, so a
 * single-call command puts one event on the stream rather than two.
 */
export function start(spec: CommandSpec, pieces: Piece[]): Job {
  const jobId = Zotero.Utilities.randomString(12);
  const entry: Job = { jobId, state: "running", done: 0, total: 1, answer: "", message: "", at: Date.now() };
  remember(entry);

  const progress = (done: number, total: number): void => {
    if (entry.state !== "running") return;
    const moved = done !== entry.done || total !== entry.total;
    entry.done = done;
    entry.total = total;
    if (moved && done > 0) Changes.push("command.progress", "command", [jobId]);
  };

  // Deliberately not awaited: the route answers with the id while this runs on.
  void (async () => {
    try {
      const answer = await spec.run(pieces, progress);
      entry.answer = String(answer ?? "");
      entry.state = "done";
      entry.done = entry.total;
    } catch (e: any) {
      entry.state = "failed";
      // Whatever the provider said, in one line. `Request.send` rejects with the body it got,
      // which is where a "quota exceeded" or a bad key actually explains itself.
      entry.message = String(e?.error?.message || e?.message || e?.error || e || "").slice(0, 500);
    }
    Changes.push("command.done", "command", [jobId]);
  })();

  return entry;
}

// -------------------------------------------------------------- resolving ---

export interface TargetRef {
  key: string;
  part?: string;
  quote?: boolean;
}

/**
 * Turns one target into the piece of text it names, or null when it names nothing.
 *
 * The slicing is `Utils.splitcontents`, which is what the plugin's own table uses to draw the
 * parts — so "the part called Method" means the same thing on both sides by construction
 * rather than by agreement. A note is sliced as html and an annotation comment as plain text,
 * exactly as `splithtmlcomment` and `splitcomment` do.
 */
export function pieceFor(item: any, target: TargetRef): Piece | null {
  if (!item) return null;

  if (target.quote === true) {
    if (!item.isAnnotation?.()) return null;
    const quote = String(item.annotationText ?? "").trim();
    // A quote is the words on the page: never split, never titled.
    return quote === "" ? null : { element: "", value: quote };
  }

  const isNote = typeof item.isNote === "function" && item.isNote();
  const text = isNote ? String(item.getNote() ?? "") : String(item.annotationComment ?? "");
  if (text.trim() === "") return null;

  if (target.part === undefined) {
    return { element: "", value: isNote ? plain(text) : text };
  }

  const parts = isNote ? Utils.splithtmlcomment(text) : Utils.splitcomment(text);
  const body = parts[target.part];
  if (body === undefined) return null;
  return { element: target.part, value: isNote ? plain(body) : body };
}

/** A note is html; the model is given what a reader sees, as the plugin's own menu is. */
function plain(html: string): string {
  return Utils.removeHiddenText(html)
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|li|h[1-6]|blockquote|tr)>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/\r\n?/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
