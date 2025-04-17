import Base from "./Base";
import ZPrefs from "../ZPrefs";
import Request from "../Request";

const OpenAI = {
  async prompt(data: string) {
    const url = "https://api.openai.com/v1/chat/completions";
    const method = "POST";
    const apikey = await ZPrefs.getb("openai-apikey");
    const model = ZPrefs.get("openai-model");
    const maxtoken = parseInt(ZPrefs.get("openai-max-token", "0"));
        
    const systemmessage = ZPrefs.get("openai-system-message", "You are an academic assistant helping in literature review.");
    const userprompt = ZPrefs.get("openai-user-prompt", "Summarize the following information (the input format is json).");
    
    const payload: any = {
      model: model,
			messages: [
				{role: "system", content: systemmessage},
				{role: "user", content: userprompt},
				{role: "user", content: data},
			],
    }
    
    if(maxtoken>0)
    {
      payload["max_tokens"] = maxtoken;
    }
    
    var options = {
			method: method,
			headers: {
				"Authorization": "Bearer "+apikey,
				"Content-Type": "application/json",
			},
			body: JSON.stringify(payload),
		}
    
    const format = (data: any) => {
      return data.choices.map(function(e: any) {
          return e.message.content;
      });
    };

    return Request.send(url, options, format);
  },
  
  async models()
  {
    const apikey = await ZPrefs.getb("openai-apikey");
    const url = "https://api.openai.com/v1/models";
    const options = {
      headers: {
        'Authorization': 'Bearer '+apikey,
        'Content-Type': 'application/json',
      }
    }
    try {
      return Request.send(url, options);
    }
    catch(e) {
      return {
        data: [{id: "gpt-api-key-error"}]
      }
    }
  }
};

export default OpenAI;
