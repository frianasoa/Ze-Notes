Filter = {
	apply(txt, selectors = "", replacement=""){
		this.replacement = replacement
		txt = Filter.legacy(txt);
		txt = Filter.userdefined(txt, selectors);
		return txt;
	},
	legacy(txt){
		if(txt!=null)
		{
			txt = txt.replace(/&lt;&lt;.*&gt;&gt;(&lt;&lt;br *&gt;&gt;\/)*(\<br *\/>)*/g, "");
		}
		else {
			txt = "";
		}
		return txt;
	},
	
	userdefined(txt, selectors)
	{
		if(selectors)
		{
			selectors = selectors.replace(";", ",").split(",");
			selectors = selectors.map(v => v.trim());
		}
		else
		{
			selectors = [];
		}
		
		var html = null;
		/*
		No need to repeat selectors
		*/
		// selectors = [...new Set(selectors.map(v => v.toLowerCase()).concat(selectors.map(v => v.toUpperCase())))];
		
		
		if (Zotero.platformMajorVersion >= 102) {
			var parser = new DOMParser();
			html = parser.parseFromString(txt, "text/html").body;
		}
		else {
			const parser = Components.classes['@mozilla.org/xmlextras/domparser;1'].createInstance(Components.interfaces.nsIDOMParser);
			html = parser.parseFromString(txt, 'text/html').documentElement;
		}
				
		for(selector of selectors)
		{
			if(this.validselector(selector))
			{
				if(this.replacement!="")
				{
					html.querySelectorAll("body "+selector).forEach(e => e.outerHTML="<div>"+this.escapehtml(this.replacement))+"</div>";
				}
				else
				{
					html.querySelectorAll("body "+selector).forEach(e => e.parentNode.removeChild(e));
				}
			}
		}
		
		var data = html.innerHTML.split("<br>").join("<br/>").split("<hr>").join("<hr/>");
		return data;
	},
	
	escapehtml(s)
	{
		return s
         .replace(/&/g, "&amp;")
         .replace(/</g, "&lt;")
         .replace(/>/g, "&gt;")
         .replace(/"/g, "&quot;")
         .replace(/'/g, "&#039;");
	},
	
	validselector(s){
		var document = Zotero.getMainWindow().document;
		try {document.createDocumentFragment().querySelector(s);} catch(e) {return false}
		return true;
	}
}
	