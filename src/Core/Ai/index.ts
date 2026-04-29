import OpenAI from './OpenAI';
import Gemini from './Gemini';
import DeepSeek from './DeepSeek';
import CustomAI from './CustomAI';
import AiNotes from './AiNotes';
import Claude from './Claude';
import ZPrefs from '../ZPrefs';
import Request from '../Request';

const CORRECTION_PROMPT = `You are an OCR correction specialist.

Given raw OCR output from a scanned document, output ONLY the corrected text — no explanations, no commentary, no preamble, no labels. Do not describe what you changed. If the text needs no correction, output it as-is.

Corrections to apply:
1. Fix OCR errors and typos
2. Remove erroneous spaces or line breaks inserted by OCR
3. Preserve the original meaning and structure
4. Preserve the original language — do not translate. Do not paraphrase.`;

type AiType = {
  OpenAI: typeof OpenAI;
  Gemini: typeof Gemini;
  DeepSeek: typeof DeepSeek;
  CustomAI: typeof CustomAI;
  AiNotes: typeof AiNotes;
  Claude: typeof Claude;
  correct(text: string, provider: string): Promise<string>;
};

const Ai: AiType = {
  AiNotes,
  CustomAI,
  OpenAI,
  Gemini,
  DeepSeek,
  Claude,

  async correct(text: string, provider: string): Promise<string> {
    if (!provider) return text;

    if (provider === "openai") {
      const apikey = await ZPrefs.getb("openai-api-key");
      const model = ZPrefs.get("openai-model");
      const maxtoken = parseInt(ZPrefs.get("openai-max-token", "0"));
      const payload: any = {
        model,
        messages: [
          { role: "system", content: CORRECTION_PROMPT },
          { role: "user", content: text },
        ],
      };
      if (maxtoken > 0) payload["max_tokens"] = maxtoken;
      const format = (data: any) => data.choices.map((e: any) => e.message.content);
      const result = await Request.send("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { "Authorization": "Bearer " + apikey, "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }, format);
      return Array.isArray(result) ? result[0] : result;
    }

    if (provider === "gemini") {
      const apikey = await ZPrefs.getb("gemini-api-key");
      const model = ZPrefs.get("gemini-model", "models/gemini-2.0-flash");
      const url = `https://generativelanguage.googleapis.com/v1beta/${model}:generateContent?key=${apikey}`;
      const format = (data: any) =>
        (data.candidates || []).map((e: any) =>
          (e.content?.parts || []).map((p: any) => p.text).join("")
        );
      const result = await Request.send(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: CORRECTION_PROMPT }] },
          contents: [{ parts: [{ text: text }] }],
        }),
      }, format);
      return Array.isArray(result) ? result[0] : result;
    }

    if (provider === "deepseek") {
      const apikey = await ZPrefs.getb("deepseek-apikey");
      const model = ZPrefs.get("deepseek-model", "deepseek-chat");
      const format = (data: any) => data.choices.map((e: any) => e.message.content);
      const result = await Request.send("https://api.deepseek.com/chat/completions", {
        method: "POST",
        headers: { "Authorization": "Bearer " + apikey, "Content-Type": "application/json" },
        body: JSON.stringify({
          model,
          messages: [
            { role: "system", content: CORRECTION_PROMPT },
            { role: "user", content: text },
          ],
          stream: false,
        }),
      }, format);
      return Array.isArray(result) ? result[0] : result;
    }

    if (provider === "claude") {
      const apikey = await ZPrefs.getb("claude-api-key");
      const model = ZPrefs.get("claude-model", "claude-sonnet-4-6");
      const maxtoken = parseInt(ZPrefs.get("claude-max-token", "0"));
      const format = (data: any) => data.content.map((e: any) => e.text);
      const result = await Request.send("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": apikey,
          "anthropic-version": "2023-06-01",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          model,
          max_tokens: maxtoken > 0 ? maxtoken : 1024,
          system: CORRECTION_PROMPT,
          messages: [{ role: "user", content: text }],
        }),
      }, format);
      return Array.isArray(result) ? result[0] : result;
    }

    if (provider.startsWith("custom:")) {
      const key = provider.substring("custom:".length);
      const result = await CustomAI.prompt(text, key);
      return Array.isArray(result) ? result[0] : result;
    }

    return text;
  }
};

export default Ai;
