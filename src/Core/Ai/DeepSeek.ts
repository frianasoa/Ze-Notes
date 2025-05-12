import Base from "./Base";
import ZPrefs from "../ZPrefs";
import Request from "../Request";

const DeepSeek = {
  async prompt(data: string) {
    const url = "https://api.deepseek.com/chat/completions";
    const method = "POST";
    const apikey = await ZPrefs.getb("deepseek-apikey");
    const model = ZPrefs.get("deepseek-model", "deepseek-chat");
    const systemmessage = ZPrefs.get("deepseek-system-message", "You are a helpful assistant.");
    const userprompt = ZPrefs.get("deepseek-user-prompt", "Summarize the following information (the input format is json).");

    const payload: any = {
      model: model,
      messages: [
        { role: "system", content: systemmessage },
        { role: "user", content: userprompt },
        { role: "user", content: data },
      ],
      stream: false
    };

    const options = {
      method: method,
      headers: {
        "Authorization": "Bearer " + apikey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    };

    const format = (data: any) => {
      return data.choices.map((e: any) => e.message.content);
    };

    return Request.send(url, options, format);
  },

  async models() {
    try {
      return {
        data: [{ id: "deepseek-chat" }, {id: "deepseek-reasoner"}]
      };
    } catch (e) {
      return {
        data: [{ id: "deepseek-api-key-error" }]
      };
    }
  }
};

export default DeepSeek;
