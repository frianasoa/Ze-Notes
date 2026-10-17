/**
 * What changed, and how a client hears about it.
 *
 * One `Zotero.Notifier` observer feeds an in-memory ring buffer with a monotonic sequence
 * number. Clients either poll `/changes?since=` or hold an SSE stream open; both read the
 * same buffer, so a client can start with one and fall back to the other without gaps.
 *
 * `bootId` is new on every server start. A client that sends a stale `bootId`, or a `since`
 * that has already fallen out of the ring, is told to `reset` and re-read from scratch —
 * the buffer is memory only and nothing survives a restart.
 */
import type { BridgeResponse } from "./http";
import { setCors, utf8Writer } from "./http";

export interface ChangeEvent {
  seq: number;
  event: string;
  type: string;
  keys: string[];
  libraryID: number | null;
  time: number;
}

const RING_MAX = 5000;
const MAX_STREAMS = 10;
const HEARTBEAT_MS = 25000;

interface Stream {
  write: (text: string) => void;
  response: BridgeResponse;
  heartbeat: ReturnType<typeof setInterval>;
}

/** The ids a Notifier event carries, turned into Zotero keys where we can. */
function keysFor(type: string, ids: Array<string | number>): string[] {
  return ids.map((raw) => {
    const id = String(raw);
    try {
      if (type === "item") {
        const item = Zotero.Items.get(Number(id));
        return item?.key ?? id;
      }
      if (type === "collection") {
        const collection: any = Zotero.Collections.get(Number(id));
        return collection?.key ?? id;
      }
      // "collection-item" is "<collectionID>-<itemID>", "item-tag" is "<itemID>-<tagID>".
      const [first] = id.split("-");
      if (type === "collection-item") {
        const collection: any = Zotero.Collections.get(Number(first));
        return collection?.key ?? id;
      }
      if (type === "item-tag") {
        const item = Zotero.Items.get(Number(first));
        return item?.key ?? id;
      }
    } catch {
      // A deleted object cannot be looked up; the raw id still tells the client something.
    }
    return id;
  });
}

const Changes = {
  bootId: "",
  seq: 0,
  ring: [] as ChangeEvent[],
  streams: [] as Stream[],
  observerID: null as string | null,

  start(bootId: string): void {
    this.bootId = bootId;
    this.seq = 0;
    this.ring = [];
    if (this.observerID) return;
    const observer = {
      notify: (event: string, type: string, ids: Array<string | number>) => {
        try {
          this.push(event, type, keysFor(type, ids ?? []));
        } catch (e) {
          Zotero.log("ZeNotes bridge: notifier error " + e);
        }
      },
    };
    this.observerID = Zotero.Notifier.registerObserver(
      observer as any,
      ["item", "collection", "collection-item", "item-tag"],
      "zenotes-bridge",
    );
  },

  stop(): void {
    for (const stream of this.streams) {
      try {
        clearInterval(stream.heartbeat);
        stream.response.finish();
      } catch {
        // The client may already be gone.
      }
    }
    this.streams = [];
    if (this.observerID) {
      try {
        Zotero.Notifier.unregisterObserver(this.observerID);
      } catch {
        // Already gone.
      }
      this.observerID = null;
    }
  },

  /** Records an event and pushes it to every open stream. */
  push(event: string, type: string, keys: string[], libraryID: number | null = null): ChangeEvent {
    this.seq += 1;
    const record: ChangeEvent = {
      seq: this.seq,
      event,
      type,
      keys,
      libraryID,
      time: Date.now(),
    };
    this.ring.push(record);
    if (this.ring.length > RING_MAX) this.ring.shift();

    const frame = `id: ${record.seq}\ndata: ${JSON.stringify(record)}\n\n`;
    for (let i = this.streams.length - 1; i >= 0; i--) {
      try {
        this.streams[i].write(frame);
      } catch {
        this.drop(i);
      }
    }
    return record;
  },

  /**
   * Ze-Notes settings changed. Nothing in the plugin's own UI calls this yet — the settings
   * write paths are Milestone 2 — but the bridge calls it whenever it writes, so a client
   * that made a change hears about it like any other.
   */
  settingsChanged(collectionID: string): ChangeEvent {
    return this.push("modify", "zenotes-settings", [collectionID]);
  },

  /** Events after `since`, or a reset instruction when the client is too far behind. */
  since(since: number, bootId: string | null): { reset: true } | { events: ChangeEvent[] } {
    if (bootId && bootId !== this.bootId) return { reset: true };
    if (this.ring.length > 0 && since < this.ring[0].seq - 1) return { reset: true };
    return { events: this.ring.filter((e) => e.seq > since) };
  },

  drop(index: number): void {
    const [stream] = this.streams.splice(index, 1);
    if (stream) {
      try {
        clearInterval(stream.heartbeat);
      } catch {
        // Nothing to do.
      }
    }
  },

  /**
   * Opens an SSE stream. The response is left unfinished on purpose: the connection stays
   * open until the client goes away or the bridge stops. Returns false when the stream
   * limit is reached, and the caller answers 503.
   */
  openStream(response: BridgeResponse, origin: string | null, lastEventID: number): boolean {
    if (this.streams.length >= MAX_STREAMS) return false;

    response.setStatusLine("1.1", 200, "OK");
    response.setHeader("Content-Type", "text/event-stream; charset=utf-8", false);
    response.setHeader("Cache-Control", "no-cache", false);
    setCors(response, origin);

    const write = utf8Writer(response);
    write(`: ze-notes bridge, boot ${this.bootId}\n\n`);
    for (const event of this.ring.filter((e) => e.seq > lastEventID)) {
      write(`id: ${event.seq}\ndata: ${JSON.stringify(event)}\n\n`);
    }

    const heartbeat = setInterval(() => {
      try {
        write(": heartbeat\n\n");
      } catch {
        const index = this.streams.findIndex((s) => s.response === response);
        if (index >= 0) this.drop(index);
      }
    }, HEARTBEAT_MS);

    this.streams.push({ write, response, heartbeat });
    return true;
  },

  streamCount(): number {
    return this.streams.length;
  },
};

export default Changes;
