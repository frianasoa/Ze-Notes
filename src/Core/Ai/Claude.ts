import ZPrefs from "../ZPrefs";
import Request from "../Request";

const Claude = {
  async prompt(data: string) {
    const apikey = await ZPrefs.getb("claude-api-key");
    const model = ZPrefs.get("claude-model", "claude-sonnet-4-6");
    const maxtoken = parseInt(ZPrefs.get("claude-max-token", "0"));
    const systemmessage = ZPrefs.get("claude-system-message", "You are an academic assistant helping in literature review.");
    const userprompt = ZPrefs.get("claude-user-prompt", "Summarize the following information (the input format is json).");

    const payload: any = {
      model,
      max_tokens: maxtoken > 0 ? maxtoken : 1024,
      system: systemmessage,
      messages: [
        { role: "user", content: userprompt + "\n\n" + data },
      ],
    };

    const options = {
      method: "POST",
      headers: {
        "x-api-key": apikey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify(payload),
    };

    const format = (data: any) => data.content.map((e: any) => e.text);
    return Request.send("https://api.anthropic.com/v1/messages", options, format);
  },

  async models() {
    const apikey = await ZPrefs.getb("claude-api-key");
    const options = {
      headers: {
        "x-api-key": apikey,
        "anthropic-version": "2023-06-01",
      },
    };
    try {
      return Request.send("https://api.anthropic.com/v1/models", options);
    } catch(e) {
      return { data: [{ id: "claude-api-key-error" }] };
    }
  }
};

export default Claude;
