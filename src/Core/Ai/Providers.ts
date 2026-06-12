import ZPrefs from "../ZPrefs";
import Request from "../Request";

export const CORRECTION_PROMPT = `You are an OCR correction specialist.

Given raw OCR output from a scanned document, output ONLY the corrected text — no explanations, no commentary, no preamble, no labels. Do not describe what you changed. If the text needs no correction, output it as-is.

Corrections to apply:
1. Fix OCR errors and typos
2. Remove erroneous spaces or line breaks inserted by OCR
3. Preserve the original meaning and structure
4. Preserve the original language — do not translate. Do not paraphrase.`;

const ACADEMIC_SYSTEM = "You are an academic assistant helping in literature review.";
const SUMMARIZE_USER = "Summarize the following information (the input format is json).";

const configs: Record<string, zty.AiProviderConfig> = {
  openai: {
    id: "openai",
    label: "OpenAI",
    apikeypref: "openai-api-key",
    modelpref: "openai-model",
    defaultmodel: "",
    maxtokenpref: "openai-max-token",
    systempref: "openai-system-message",
    defaultsystem: ACADEMIC_SYSTEM,
    userpref: "openai-user-prompt",
    defaultuser: SUMMARIZE_USER,
    url: () => "https://api.openai.com/v1/chat/completions",
    headers: (apikey) => ({
      "Authorization": "Bearer " + apikey,
      "Content-Type": "application/json",
    }),
    payload: ({ model, system, usercontents, maxtoken }) => {
      const payload: any = {
        model: model,
        messages: [
          { role: "system", content: system },
          ...usercontents.map((content) => ({ role: "user", content })),
        ],
      };
      if (maxtoken > 0) {
        payload["max_tokens"] = maxtoken;
      }
      return payload;
    },
    format: (data: any) => data.choices.map((e: any) => e.message.content),
    modelsurl: () => "https://api.openai.com/v1/models",
    modelsheaders: (apikey) => ({
      "Authorization": "Bearer " + apikey,
      "Content-Type": "application/json",
    }),
    errormodels: { data: [{ id: "gpt-api-key-error" }] },
  },

  gemini: {
    id: "gemini",
    label: "Gemini",
    apikeypref: "gemini-api-key",
    modelpref: "gemini-model",
    defaultmodel: "models/gemini-2.0-flash",
    systempref: "gemini-system-message",
    defaultsystem: ACADEMIC_SYSTEM,
    userpref: "gemini-user-prompt",
    defaultuser: SUMMARIZE_USER,
    url: (model, apikey) => `https://generativelanguage.googleapis.com/v1beta/${model}:generateContent?key=${apikey}`,
    headers: () => ({
      "Content-Type": "application/json",
    }),
    payload: ({ system, usercontents }) => ({
      "system_instruction": { parts: [{ text: system }] },
      contents: [{ parts: usercontents.map((text) => ({ text })) }],
    }),
    format: (data: any) => {
      if (data.candidates && data.candidates.length > 0) {
        return data.candidates.map((e: any) => e.content?.parts?.map((p: any) => p.text).join("") || "");
      }
      return [];
    },
    modelsurl: (apikey) => `https://generativelanguage.googleapis.com/v1beta/models?pageSize=100&key=${apikey}`,
    modelsheaders: () => ({
      "Content-Type": "application/json",
    }),
    errormodels: { data: [{ id: "gemini-api-key-error" }] },
  },

  deepseek: {
    id: "deepseek",
    label: "DeepSeek",
    apikeypref: "deepseek-apikey",
    modelpref: "deepseek-model",
    defaultmodel: "deepseek-chat",
    systempref: "deepseek-system-message",
    defaultsystem: "You are a helpful assistant.",
    userpref: "deepseek-user-prompt",
    defaultuser: SUMMARIZE_USER,
    url: () => "https://api.deepseek.com/chat/completions",
    headers: (apikey) => ({
      "Authorization": "Bearer " + apikey,
      "Content-Type": "application/json",
    }),
    payload: ({ model, system, usercontents }) => ({
      model: model,
      messages: [
        { role: "system", content: system },
        ...usercontents.map((content) => ({ role: "user", content })),
      ],
      stream: false,
    }),
    format: (data: any) => data.choices.map((e: any) => e.message.content),
    staticmodels: { data: [{ id: "deepseek-chat" }, { id: "deepseek-reasoner" }] },
    errormodels: { data: [{ id: "deepseek-api-key-error" }] },
  },

  claude: {
    id: "claude",
    label: "Claude",
    apikeypref: "claude-api-key",
    modelpref: "claude-model",
    defaultmodel: "claude-sonnet-4-6",
    maxtokenpref: "claude-max-token",
    systempref: "claude-system-message",
    defaultsystem: ACADEMIC_SYSTEM,
    userpref: "claude-user-prompt",
    defaultuser: SUMMARIZE_USER,
    url: () => "https://api.anthropic.com/v1/messages",
    headers: (apikey) => ({
      "x-api-key": apikey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    }),
    payload: ({ model, system, usercontents, maxtoken }) => ({
      model,
      max_tokens: maxtoken > 0 ? maxtoken : 1024,
      system: system,
      messages: [
        { role: "user", content: usercontents.join("\n\n") },
      ],
    }),
    format: (data: any) => data.content.map((e: any) => e.text),
    modelsurl: () => "https://api.anthropic.com/v1/models",
    modelsheaders: (apikey) => ({
      "x-api-key": apikey,
      "anthropic-version": "2023-06-01",
    }),
    errormodels: { data: [{ id: "claude-api-key-error" }] },
  },
};

const Providers = {
  configs,

  async request(config: zty.AiProviderConfig, params: { system: string; usercontents: string[] }): Promise<string[]> {
    const apikey = await ZPrefs.getb(config.apikeypref);
    const model = ZPrefs.get(config.modelpref, config.defaultmodel);
    const maxtoken = config.maxtokenpref ? parseInt(ZPrefs.get(config.maxtokenpref, "0")) : 0;

    const payload = config.payload({ model, system: params.system, usercontents: params.usercontents, maxtoken });
    const options = {
      method: "POST",
      headers: config.headers(apikey),
      body: JSON.stringify(payload),
    };
    return Request.send(config.url(model, apikey), options, config.format);
  },

  async prompt(config: zty.AiProviderConfig, data: string): Promise<string[]> {
    const system = ZPrefs.get(config.systempref, config.defaultsystem);
    const user = ZPrefs.get(config.userpref, config.defaultuser);
    return Providers.request(config, { system, usercontents: [user, data] });
  },

  async correct(config: zty.AiProviderConfig, text: string): Promise<string> {
    const result = await Providers.request(config, { system: CORRECTION_PROMPT, usercontents: [text] });
    return Array.isArray(result) ? result[0] : result;
  },

  async models(config: zty.AiProviderConfig): Promise<any> {
    if (!config.modelsurl) {
      return config.staticmodels ?? { data: [] };
    }
    const apikey = await ZPrefs.getb(config.apikeypref);
    try {
      return await Request.send(config.modelsurl(apikey), { headers: config.modelsheaders?.(apikey) ?? {} });
    } catch (e) {
      return config.errormodels ?? { data: [] };
    }
  },
};

export default Providers;
