import Providers from "./Providers";

const Claude = {
  async prompt(data: string) {
    return Providers.prompt(Providers.configs.claude, data);
  },

  async models() {
    return Providers.models(Providers.configs.claude);
  }
};

export default Claude;
