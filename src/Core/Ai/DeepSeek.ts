import Providers from "./Providers";

const DeepSeek = {
  async prompt(data: string) {
    return Providers.prompt(Providers.configs.deepseek, data);
  },

  async models() {
    return Providers.models(Providers.configs.deepseek);
  },
};

export default DeepSeek;
