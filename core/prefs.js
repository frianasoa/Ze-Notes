Prefs = {
	get(pref, default_value="") {
        var v = Zotero.Prefs.get('extensions.zenotes.' + pref, true);
        if(v==null)
        {
            return default_value;
        }
        return v;
    },
	set(pref, value) {       
        Zotero.Prefs.set('extensions.zenotes.' + pref, value, true);
    }
}