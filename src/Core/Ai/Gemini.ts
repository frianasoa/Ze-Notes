import Base from "./Base";
import ZPrefs from "../ZPrefs";
import Request from "../Request";

const Gemini = {
  async prompt(text: string) {
    const apikey = await ZPrefs.getb("gemini-api-key");
    const model = ZPrefs.get("gemini-model", "models/gemini-2.0-flash"); // default to Gemini Flash

    const systemmessage = ZPrefs.get("gemini-system-message", "You are an academic assistant helping in literature review.");
    const userprompt = ZPrefs.get("gemini-user-prompt", "Summarize the following information (the input format is json).");

    const url = `https://generativelanguage.googleapis.com/v1beta/${model}:generateContent?key=${apikey}`;
    const method = "POST";

    const payload = {
      "system_instruction": {
        "parts": [
          {
            "text": systemmessage
          }
        ]
      },
      contents: [
        {
          parts: [
            {
              text: userprompt,
            },
            {
              text: text,
            },
          ],
        },
      ]
    };

    const options = {
      method,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    };

    const format = (data: any) => {
      if (data.candidates && data.candidates.length > 0) {
        return data.candidates.map((e: any) => e.content?.parts?.map((p: any) => p.text).join("") || "");
      }
      return [];
    };

    return Request.send(url, options, format);
  },

  async models() {
    const apikey = await ZPrefs.getb("gemini-api-key");
    const url = `https://generativelanguage.googleapis.com/v1beta/models?pageSize=100&key=${apikey}`;

    const options = {
      headers: {
        "Content-Type": "application/json",
      },
    };

    try {
      return Request.send(url, options);
    } catch (e) {
      return {
        data: [{ id: "gemini-api-key-error" }],
      };
    }
  },
};

export default Gemini;
