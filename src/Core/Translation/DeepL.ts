import Format from "./Format";
import Request from "../Request";
import { Translator } from "./Translator";
import ZPrefs from "../ZPrefs";


const DeepL:Translator = {
  async keyisvalid(apikey: string) {
    const url = "https://api-free.deepl.com/v2/usage";
    const options = {method: 'POST', 
      headers: {
        "Authorization": "DeepL-Auth-Key "+apikey,
				"Content-Type": "application/json",
      }
    };
    try {
      const usage = await Request.send(url, options);
      if(usage.character_count>=usage.character_limit)
      {
        throw "Usage limit reached!";
        return false;
      }
      return true;
    }
    catch(e)
    {
      throw e;
      return false;
    }
  },
  
  async translate(sentence: string, language: string)
  {
    const apikey = await ZPrefs.getb("deepl-api-key");    
		const url = "https://api-free.deepl.com/v2/translate";
    var payload = {text: [sentence], target_lang: language.toUpperCase()};
    
    const options = {method: 'POST', 
      headers: {
        "Authorization": "DeepL-Auth-Key "+apikey,
				"Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    };
    return Request.send(url, options, Format.deepl);
  }
}

export default DeepL;