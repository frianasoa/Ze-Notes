import Base from "./Base";
import ZPrefs from "../ZPrefs";
import Prefs from "../Prefs";
import Request from "../Request";
import Config from "../../Config";
import Crypto from "../Crypto";

const CustomAi = {

  async params(key: string)
  {
    let data: Record<string, any> = {};
    if(key=="custom-ai")
    {
      data["url"] = ZPrefs.get("custom-ai-url", "");
      data["apikey"] = await ZPrefs.getb("custom-ai-apikey", "");
      data["model"] = ZPrefs.get("custom-ai-model", "");
      data["options"] = ZPrefs.get("custom-ai-options", "");
      data["systemmessage"] = ZPrefs.get("custom-ai-system-message", "You are an academic assistant helping in literature review.");
      data["userprompt"] = ZPrefs.get("custom-ai-user-prompt", "Summarize the following information (the format is json).");
      data["format"] = ZPrefs.get("custom-ai-format", "(data) => {return [data]}")
    }
    else if(key.startsWith("custom-ai-settings/"))
    {
      data = JSON.parse(await Prefs.get(key) || "{}");
      try {
        data["apikey"] = Crypto.decrypt(data["apikey"], Config.znkey);
      } catch (e) {
        Zotero.log(e);
      }
    }
    
    try {
      data["format"] = this.eval(data["format"], []);
    }
    catch(e)
    {
      throw "Please check Custom AI Format settings: \n"+e;
    }
    
    return data;
  },

  async prompt(data: string, key: string) {
    const params = await this.params(key) as any;    
    let options = params["options"]
		.replace("${apikey}", params["apikey"])
		.replace("${model}", params["model"])
		.replace("${systemmessage}", this.escapejson(params["systemmessage"]))
		.replace("${userprompt}", this.escapejson(params["userprompt"]))
		.replace("${data}", this.escapedata(data))
    .split("\n").join(" ")
    
    try {
      options = JSON.parse(options);
    }
    catch(e)
    {
      throw "Please check Custom AI options settings: \n"+e;
    }    
    return Request.send(params["url"], options, params["format"]);
  },
  
  async deletesetting(name: string)
  {
    return await Prefs.remove(name);
  },
  
  savesettings(name: string)
  {
    const url = ZPrefs.get("custom-ai-url", "");
    const apikey = ZPrefs.get("custom-ai-apikey", "");
    const model = ZPrefs.get("custom-ai-model", "");
    const options = ZPrefs.get("custom-ai-options", "");
    const format = ZPrefs.get("custom-ai-format", "");
      
    const systemmessage = ZPrefs.get("custom-ai-system-message", "");
    const userprompt = ZPrefs.get("custom-ai-user-prompt", "");
    const data = {name, url, apikey, model, options, systemmessage, userprompt, format};
    return Prefs.set("custom-ai-settings/"+name, JSON.stringify(data));
  },
  
  async settinglist()
  {
    const settings = await Prefs.search("custom-ai-settings/");
    return Object.fromEntries(
      Object.entries(settings).map(([key, value]) => [key, JSON.parse(value)])
    );
  },
  
  escapejson(str: string)
  {
    str = str.split("\"").join("\\\"");
		return str;
  },
  
  escapedata(str: string){
    str = str.split("'").join("\'");
    str = str.split("\"").join("'");
    return str;
  },
  
  eval(code: string, data: any)
	{
		var sb = new Zotero.Translate.SandboxManager();
		sb.sandbox.data = data;
		sb.eval("this.sandbox.data="+code, []);
		return sb.sandbox.data;
	},
};

export default CustomAi;
