import Config from "../Config";
import Crypto from "./Crypto";

const ZPrefs = {
  prefix: "extensions."+Config.slug+".",
  set(key: string, value: string) {
    return Zotero.Prefs.set(this.prefix + key, value, true);
  },

  get(key: string, default_value: any = "") {
    return Zotero.Prefs.get(this.prefix + key, true) ?? default_value;
  },
  
  clear(key: string)
  {
    Zotero.Prefs.clear(this.prefix + key, true);
  },
  
  async setb(key: string, value: string) {
    try {
      const encryptedValue = Crypto.encrypt(value, Config.znkey);
      return this.set(key, encryptedValue);
    } catch (e) {
      Zotero.log(e);
      return false;
    }
  },

  async getb(key: string, default_value: string = "") {
    const value = this.get(key);
    if (!value) {
      return default_value;
    }
    try {
      return Crypto.decrypt(value, Config.znkey);
    } catch (e) {
      Zotero.log(e);
      return default_value;
    }
  },
};

export default ZPrefs;
