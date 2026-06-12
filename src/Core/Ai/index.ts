import OpenAI from "./OpenAI";
import Gemini from "./Gemini";
import DeepSeek from "./DeepSeek";
import CustomAI from "./CustomAI";
import AiNotes from "./AiNotes";
import Claude from "./Claude";
import Providers from "./Providers";

type AiType = {
  OpenAI: typeof OpenAI;
  Gemini: typeof Gemini;
  DeepSeek: typeof DeepSeek;
  CustomAI: typeof CustomAI;
  AiNotes: typeof AiNotes;
  Claude: typeof Claude;
  Providers: typeof Providers;
  correct(text: string, provider: string): Promise<string>;
};

const Ai: AiType = {
  AiNotes,
  CustomAI,
  OpenAI,
  Gemini,
  DeepSeek,
  Claude,
  Providers,

  async correct(text: string, provider: string): Promise<string> {
    if (!provider) return text;

    if (provider.startsWith("custom:")) {
      const key = provider.substring("custom:".length);
      const result = await CustomAI.prompt(text, key);
      return Array.isArray(result) ? result[0] : result;
    }

    const config = Providers.configs[provider];
    if (config) {
      return Providers.correct(config, text);
    }

    return text;
  },
};

export default Ai;
