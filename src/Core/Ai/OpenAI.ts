import Providers from "./Providers";

const OpenAI = {
  async prompt(data: string) {
    return Providers.prompt(Providers.configs.openai, data);
  },

  async models() {
    return Providers.models(Providers.configs.openai);
  }
};

export default OpenAI;
