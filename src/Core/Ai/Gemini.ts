import Providers from "./Providers";

const Gemini = {
  async prompt(text: string) {
    return Providers.prompt(Providers.configs.gemini, text);
  },

  async models() {
    return Providers.models(Providers.configs.gemini);
  }
};

export default Gemini;
