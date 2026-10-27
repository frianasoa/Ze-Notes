/**
 * The browser bridge: a small HTTP server on loopback that lets a web page Ze-Notes trusts
 * read its matrix and write back through Ze-Notes' own code.
 *
 * Off by default. With "Enable bridge" off the socket is closed, the Notifier observer is
 * unregistered and nothing in Ze-Notes behaves differently from a build without this folder.
 *
 * The server is an instance of Mozilla's `httpd.sys.mjs`, which Zotero already ships and
 * uses for its own server on 23119. We run our own instance on our own port rather than
 * touching `Zotero.Server`: that one refuses browsers by design and sends CORS headers only
 * for Zotero's bookmarklet origin, so a page could never talk to it.
 *
 * Wiring, in full:
 *   - `../Extensions.ts`               calls `Bridge.init()` at startup and `Bridge.stop()` at
 *                                      shutdown (`src/index.ts` and `appbase.js` call it)
 *   - `parts/bridge.xhtml`             calls `Bridge.restart()` when a setting changes
 */
import pkg from "../../../package.json";
import Changes from "./changes";
import Routes from "./routes";
import type { RouteContext } from "./routes";
import { BridgePrefs, CAPABILITIES } from "./prefs";
import type { OriginRule } from "./prefs";
import { authorise, capabilities, DENIED_CODE } from "./security";
import type { BridgeRequest, BridgeResponse } from "./http";
import { sendError } from "./http";

interface HttpServerInstance {
  registerPrefixHandler(prefix: string, handler: (req: any, res: any) => void): void;
  start(port: number): void;
  stop(): Promise<void>;
}

export type BridgeState = "stopped" | "listening" | "error";

const EVENTS_PATH = "/ze-notes/v1/events";

const Bridge = {
  server: null as HttpServerInstance | null,
  state: "stopped" as BridgeState,
  message: "",
  port: 0,
  bootId: "",

  /** Called once at startup. Starts the server only if the user has switched it on. */
  init(): void {
    if (!BridgePrefs.enabled()) {
      this.state = "stopped";
      return;
    }
    void this.start();
  },

  async start(): Promise<void> {
    if (this.server) return;

    const port = BridgePrefs.port();
    try {
      const { HttpServer } = ChromeUtils.importESModule("chrome://remote/content/server/httpd.sys.mjs") as {
        HttpServer: new () => HttpServerInstance;
      };

      this.bootId = Zotero.Utilities.randomString(12);
      Changes.start(this.bootId);

      const server = new HttpServer();
      server.registerPrefixHandler("/", (request: BridgeRequest, response: BridgeResponse) => {
        this.dispatch(request, response);
      });
      server.start(port);

      this.server = server;
      this.port = port;
      this.state = "listening";
      this.message = `127.0.0.1:${port}`;
      Zotero.log(`ZeNotes bridge: listening on 127.0.0.1:${port}`);
    } catch (e) {
      Changes.stop();
      this.server = null;
      this.state = "error";
      this.message = String(e);
      Zotero.log("ZeNotes bridge: could not start - " + e);
    }
  },

  async stop(): Promise<void> {
    Changes.stop();
    const server = this.server;
    this.server = null;
    this.state = "stopped";
    this.message = "";
    if (!server) return;
    try {
      await server.stop();
      Zotero.log("ZeNotes bridge: stopped");
    } catch (e) {
      Zotero.log("ZeNotes bridge: error while stopping - " + e);
    }
  },

  /** Apply a settings change: stop, then start again if it is still switched on. */
  async restart(): Promise<BridgeState> {
    await this.stop();
    if (BridgePrefs.enabled()) await this.start();
    return this.state;
  },

  /**
   * What the settings pane shows on its status line. `origins` is there so the pane can say
   * that a running bridge still cannot be reached, which is the one mistake that otherwise
   * looks like a bug: enabled, listening, and nothing allowed to connect.
   */
  status(): {
    state: BridgeState;
    message: string;
    port: number;
    streams: number;
    origins: number;
    writes: boolean;
    /** How many origins have `ai`: the one permission worth naming on the status line. */
    commands: number;
  } {
    const rules = BridgePrefs.rules();
    return {
      state: this.state,
      message: this.message,
      port: this.port,
      streams: Changes.streamCount(),
      origins: rules.length,
      writes: rules.some((r) => r.write),
      commands: rules.filter((r) => r.ai).length,
    };
  },

  /**
   * The origins table, for the settings pane: who may connect and what each may do.
   *
   * A change takes effect on the next request — every check reads the preference live — so
   * neither adding an origin nor ticking a box restarts the server, and an open event stream
   * is not dropped because somebody changed a different page's permissions.
   */
  rules(): OriginRule[] {
    return BridgePrefs.rules();
  },

  setRules(rules: OriginRule[]): void {
    BridgePrefs.setRules(rules);
  },

  /** The capability names, so the pane draws a column per capability without hard-coding them. */
  capabilities(): readonly string[] {
    return CAPABILITIES;
  },

  /** Used by the settings pane's "Regenerate" button. */
  async regenerateToken(): Promise<string> {
    return await BridgePrefs.regenerateToken();
  },

  async token(): Promise<string> {
    return await BridgePrefs.ensureToken();
  },

  /**
   * One request. `httpd.sys.mjs` cannot await a handler, so the response is put into async
   * mode straight away and finished when the work is done — except for the SSE stream,
   * which `Changes` keeps open.
   */
  dispatch(request: BridgeRequest, response: BridgeResponse): void {
    response.processAsync();
    void this.run(request, response)
      .then((keepOpen) => {
        if (!keepOpen) response.finish();
      })
      .catch((e) => {
        Zotero.log("ZeNotes bridge: handler failed - " + e);
        try {
          sendError(response, 500, "internal", "The bridge failed to handle this request", null);
        } catch {
          // The response may already be partly written; nothing more we can do.
        }
        try {
          response.finish();
        } catch {
          // Already finished.
        }
      });
  },

  /** Resolves true when the response must stay open (SSE). */
  async run(request: BridgeRequest, response: BridgeResponse): Promise<boolean> {
    const isStream = request.path === EVENTS_PATH;
    const decision = await authorise(request, this.port, isStream);

    if (!decision.ok) {
      sendError(response, decision.status, decision.code, decision.message, decision.origin);
      return false;
    }

    if (request.method === "OPTIONS") {
      Routes.preflight(response, request, decision.origin);
      return false;
    }

    if (isStream) {
      if (request.method !== "GET") {
        sendError(response, 404, "no_route", "The event stream is GET only", decision.origin);
        return false;
      }
      // The stream never reaches the route table, so its `read` gate is here. A page that
      // may not read must not be told when the library changes either.
      if (!capabilities(decision.origin).read) {
        sendError(
          response,
          403,
          DENIED_CODE.read,
          "This origin is not allowed to read - Ze-Notes settings, Browser bridge",
          decision.origin,
        );
        return false;
      }
      const opened = Routes.events({
        request,
        response,
        origin: decision.origin,
        bootId: this.bootId,
        pluginVersion: pkg.version,
      });
      if (!opened) {
        sendError(response, 503, "too_many_streams", "Too many open streams", decision.origin);
        return false;
      }
      return true;
    }

    const ctx: RouteContext = {
      request,
      response,
      origin: decision.origin,
      bootId: this.bootId,
      pluginVersion: pkg.version,
    };
    await Routes.handle(ctx);
    return false;
  },
};

export default Bridge;
