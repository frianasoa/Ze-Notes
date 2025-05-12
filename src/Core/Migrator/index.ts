import One from './One'
import ZPrefs from '../ZPrefs'
import Prefs from '../Prefs'
import Database from '../Database'
import TablePrefs from '../TablePrefs'
import CustomAI from '../Ai/CustomAI'

const Migrator = {
  init()
  {

  },

  async createcustom()
  {
    const openaikey = ZPrefs.get("openai-api-key");
    const geminikey = ZPrefs.get("gemini-api-key");

    let key = "";
    let url = "";
    let model = "";
    let options = "";
    let format = "";
    let message = "";
    let prompts = [];

    if(openaikey)
    {
      key = openaikey;
      url = "https://api.openai.com/v1/chat/completions";
      model = ZPrefs.get("openai-model");
      options = "{\n  \"method\": \"POST\",\n  \"headers\": {\n    \"Authorization\": \"Bearer ${apikey}\",\n    \"Content-Type\": \"application/json\"\n  },\n  \"body\": {\n    \"model\": \"${model}\",\n    \"messages\": [\n      { \"role\": \"system\", \"content\": \"${systemmessage}\" },\n      { \"role\": \"user\", \"content\": \"${userprompt}\" },\n      { \"role\": \"user\", \"content\": \"${data}\" }\n    ]\n  }\n}";
      format = "(data) => {\n  return data.choices.map(function(e) {\n      return e.message.content;\n  });\n};";

      prompts = [
        {label: "Summarize (OpenAI)", prompt: "Use paragraphs to summarize the data below."},
        {label: "Paraphrase (OpenAI)", prompt: "Use paragraphs to paraphrase the data below."}
      ];
    }
    else if(geminikey)
    {
      key = geminikey;
      url = "https://generativelanguage.googleapis.com/v1beta/${model}:generateContent?key=${apikey}";
      model = ZPrefs.get("gemini-ai-model");
      options = "{ \"method\": \"${method}\", \"headers\": { \"Content-Type\": \"application/json\" }, \"body\": { \"model\": \"${model}\", \"system_instruction\": { \"parts\": [ { \"text\": \"${systemmessage}\" } ] }, \"contents\": [ { \"parts\": [ { \"text\": \"${userprompt}\" }, { \"text\": \"${text}\" } ] } ], \"messages\": [ { \"role\": \"system\", \"content\": \"${systemmessage}\" }, { \"role\": \"user\", \"content\": \"${userprompt}\" }, { \"role\": \"user\", \"content\": \"${text}\" } ] } }";
      format = "(data) => {       if (data.candidates && data.candidates.length > 0) {         return data.candidates.map((e) => e.content?.parts?.map((p) => p.text).join('') || '');       }       return [];}";

      prompts = [
        {label: "Summarize (Gemini)", prompt: "Summarize the data below."},
        {label: "Paraphrase (Gemini)", prompt: "Paraphrase the data below."}
      ];
    }
    else
    {
      return;
    }

    ZPrefs.set("custom-ai-api-key", key);
    ZPrefs.set("custom-ai-url", url);
    ZPrefs.set("custom-ai-model", model);
    ZPrefs.set("custom-ai-options", options);
    ZPrefs.set("custom-ai-format", format);
    ZPrefs.set("custom-ai-system-message", message);

    prompts.forEach(p=>{
      ZPrefs.set("custom-ai-user-prompt", p.prompt);
      CustomAI.savesettings(p.label);
    });
  },
  
  async ismigrated()
  {
    return (await Prefs.get("database-version") == Database.version);
  },
  
  async setmigrated()
  {
    await Prefs.set("database-version", Database.version);
  },

  async migrateprefs(data: any)
  {
    const ismigrated = await Migrator.ismigrated();
    if(ismigrated)
    {
      return;
    }
    
    for (const { key, value, encrypt } of Object.values(data) as any)
    {
      if(encrypt)
      {
        await ZPrefs.setb(key, value);
      }
      else
      {
        ZPrefs.set(key, value);
      }
    }
    await this.createcustom();
    try {
      await TablePrefs.migrate();
    }
    catch(e)
    {
      Zotero.log("Migrator.migrateprefs: "+e);
    }
    await Migrator.setmigrated();
  }
}

export default Migrator;
