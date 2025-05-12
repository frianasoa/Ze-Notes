if (typeof Services == 'undefined') {
	var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");
}
var CryptoJS = null;

var Migrate = {
  version: "0to1",
  znkey: "W0phdmFTY3JpcHQgRXJyb3I6ICJSZWZlcmVuY2VFcnJvcjogZmV0Y2ggaXMgbm90IGRlZmluZWQiIHtmaWxlOiAicmVzb3VyY2U6Ly9ncm",
  init(rootURI, data) {
    Services.scriptloader.loadSubScript(rootURI + '/chrome/core/migrate/aes.js');
    this.CryptoJS = CryptoJS;
    this.data = data;
  },
  encrypt(value)
	{
		var bvalue = this.CryptoJS.AES.encrypt(value, this.znkey);
		return bvalue.toString();
	},
  decrypt(value)
	{
		return this.CryptoJS.AES.decrypt(value, this.znkey).toString(this.CryptoJS.enc.Utf8);
	},
  
  async run()
  {
    const {prefix, data} = this.data;
    for (const [k, { key, encrypt }] of Object.entries(data))
    {
      const fullkey = prefix+k;
      let v = Zotero.Prefs.get(fullkey, true);
      if(encrypt)
      {
        v = this.decrypt(v);
      }
      data[k]["value"] = v;
    }
    await Zotero.AppBase.Engine.Core.Migrator.migrateprefs(data);
  }
}
