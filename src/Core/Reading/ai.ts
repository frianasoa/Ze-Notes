/**
 * Which AIs the reading pass can use, and how it asks each one — AI zone.
 *
 * The same AIs Ze-Notes' own menus offer, from the person's settings, read-only:
 *
 * - the built-in providers (`../Ai/Providers.ts`), each usable when it has an API key **and** a
 *   model (OpenAI, for one, has no default model, and a key alone would fail on the first request);
 * - the default Custom AI, when its URL is set, and every saved Custom AI preset with "Use" ticked,
 *   the list `ReaderMenu.ts` and the bridge's commands offer.
 *
 * A Custom AI is reached through its own request template: the reading pass's prompt goes into
 * the template's `${systemmessage}`, `${userprompt}` and `${data}`, exactly where the preset's own
 * texts would go, and the preset's `format` reads the answer.
 *
 * What cannot be used is not offered: it is named, with the reason, so the person finds out
 * before running rather than after.
 */
import Ai from "../Ai";
import Request from "../Request";
import ZPrefs from "../ZPrefs";

export interface ReadingAi {
  id: string;
  label: string;
  /** The model or the endpoint, so the person sees what will run. */
  detail: string;
  ask(system: string, user: string): Promise<string>;
}

export interface NotUsable {
  label: string;
  why: string;
}

const joined = (reply: unknown): string => (Array.isArray(reply) ? reply.join("\n") : String(reply ?? ""));

/** A Custom AI, asked through its own template with the reading pass's texts put in. */
function customAi(key: string, label: string, detail: string): ReadingAi {
  return {
    id: `custom:${key}`,
    label,
    detail,
    async ask(system, user) {
      const params: any = await Ai.CustomAI.params(key);
      params.systemmessage = system;
      params.userprompt = "Reply with the JSON array only, as the system message says.";
      params.data = user;
      let options: any;
      try {
        options = JSON.parse(String(params.options ?? "").split("\n").join(" "));
      } catch (e) {
        throw new Error(`The request options of "${label}" are not valid JSON: ${e}`);
      }
      options = Ai.CustomAI.applyvar(options, params);
      options.body = JSON.stringify(options.body);
      return joined(await Request.send(params.url, options, params.format));
    },
  };
}

function hostOf(url: string): string {
  const m = /^[a-z]+:\/\/([^/]+)/i.exec(url);
  return m ? m[1]! : url;
}

export async function readingAis(): Promise<{ usable: ReadingAi[]; notUsable: NotUsable[] }> {
  const usable: ReadingAi[] = [];
  const notUsable: NotUsable[] = [];

  for (const config of Object.values(Ai.Providers.configs)) {
    const apikey = await Ai.Providers.apikey(config);
    const model = String(ZPrefs.get(config.modelpref, config.defaultmodel) || "");
    if (!apikey) {
      notUsable.push({ label: config.label, why: "no API key" });
      continue;
    }
    if (!model) {
      notUsable.push({ label: config.label, why: "no model chosen" });
      continue;
    }
    usable.push({
      id: config.id,
      label: config.label,
      detail: model.replace(/^models\//, ""),
      async ask(system, user) {
        return joined(await Ai.Providers.request(config, { system, usercontents: [user] }));
      },
    });
  }

  const url = String(ZPrefs.get("custom-ai-url", "") || "").trim();
  if (url) {
    const model = String(ZPrefs.get("custom-ai-model", "") || "");
    usable.push(customAi("custom-ai", "Custom AI (default)", model || hostOf(url)));
  }

  try {
    const presets = await Ai.CustomAI.settinglist();
    for (const key of Object.keys(presets).sort()) {
      const preset = presets[key];
      if (!preset?.use) continue;
      if (!String(preset.url ?? "").trim()) {
        notUsable.push({ label: String(preset.name ?? key), why: "no URL" });
        continue;
      }
      usable.push(
        customAi(key, String(preset.name ?? key), String(preset.model || hostOf(String(preset.url)))),
      );
    }
  } catch {
    // A preset list that will not load costs those entries and nothing else.
  }

  return { usable, notUsable };
}
