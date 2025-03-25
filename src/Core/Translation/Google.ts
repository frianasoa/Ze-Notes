import Format from "./Format";
import Request from "../Request";
import { Translator } from "./Translator";
import ZPrefs from "../ZPrefs";

const Google: Translator = {
  async keyisvalid(apikey: string){
    try {
      const r = await Google.translatewithkey?.("Manahoana", "en", apikey);
      return true;
    }
    catch(e) {
      throw e;
      return false;
    }
  },
  
  async translatewithkey(sentence: string, language: string, apikey:string|null=null) {
    if(!apikey)
    {
      apikey = await ZPrefs.getb("google-translate-api-key");
    }
    
    const url = `https://translation.googleapis.com/language/translate/v2?key=${apikey}`;
    var payload = {
      q: sentence,
      target: language
    };
    
    var options = {
      method: "POST",
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Accept": "application/json",
      },
      body: JSON.stringify(payload),
    };
    return Request.send(url, options, Format.google);
  },
  
  async translate(sentence: string, language: string) {
    return Google.translatewithkey?.(sentence, language, null)
    .catch
    (e=>{
      const url = "https://translate.googleapis.com/translate_a/single?client=gtx&dt=t&sl=auto&tl=" + language + "&q=" + encodeURIComponent(sentence);
      const options = { method: "POST", headers: {} };
      return Request.send(url, options, Format.google);
    });
  },
};

export default Google;