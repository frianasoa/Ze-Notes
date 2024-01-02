Zotero_Preferences.ZeNotes = {
	async init(){
		if(!this.parser)
		{
			this.parser = new DOMParser();
		}
		
		await this.currentcollection();
		this.zenotedata = await Zotero.ZeNotes.Data.get();
		
		if(!Zotero.getMainWindow())
		{
			window.close();
		}
		this.savevalues = [];
		this.tableutils = Zotero_Preferences.ZNTable;
		this.defaulthiddentags = ["Id", "itemid", "key", "filekey"];
	},
	
	async currentcollection()
	{
		var c = Zotero.getActiveZoteroPane().getSelectedCollection();
		this.collection = "All documents";
		this.collectionid = "all-documents";
		if(c!=undefined && c.name!=undefined)
		{
			this.collection = c.name;
			this.collectionid = c.id;
		}
		
		this.usersettings = {
			"hidden": [],
			"order": [],
			"sort": [],
			"reverse": [],
			"width": {},
		}
		
		try {
			var dbdata = await Zotero.ZeNotes.Database.getsetting(this.collectionid);
			this.usersettings = JSON.parse(dbdata);
		}
		catch(e){
			console.log(e);
		}
	},
	
	async loadpreference(prefid, elid, mode="")
	{
		var el = document.getElementById(elid)
		if(el!=null) {
			if(el.tagName.toUpperCase()=="SELECT" || el.tagName.toUpperCase()=="MENULIST")
			{
				var options = [];
				if(el.id=="zn-target-language")
				{
					options = Zotero.ZeNotes.Languages.list().map(function(e){return {label: e.name, value:e.code}});
				}
				else if(el.id=="zn-load-settings")
				{
					options = (await Zotero.ZeNotes.Database.getsettings()).sort(function(a, b) {
						return a.label.localeCompare(b.label);
					}).filter(function(e){
						return e.collectionid!=Zotero_Preferences.ZeNotes.collectionid && e.label!="Default";
					}).map(function(e){
						return {label:e.label, value:e.collectionid}
					});	
				}
				
				if(options.length>0)
				{
					el.innerHTML = "";
				}
				
				var templateopt = document.createElementNS("http://www.w3.org/1999/xhtml", "option");
				if (Zotero.platformMajorVersion>=102)
				{
					if(options.length==0)
					{
						if(el.tagName.toUpperCase()=="MENULIST")
						{
							options	= Array.from(el.querySelectorAll("menuitem")).map(function(o){
								return {label: o.label, value: o.value};
							});
						}
						else
						{
							options	= Array.from(el.querySelectorAll("option")).map(function(o){
								return {label: o.innerText, value: o.value};
							});
						}
					}
					
					var p = el.parentNode;
					
					var menulist = document.createXULElement("menulist");
					var menupopup = document.createXULElement("menupopup");
					templateopt = document.createXULElement("menuitem");
					
					menulist.setAttribute("id", el.id);
					menulist.setAttribute("style", el.getAttribute("style"));
					menulist.style.display = "inline-block";
					menulist.appendChild(menupopup);
					p.replaceChild(menulist, el);
					
					menulist.onchange = el.onchange;
					
					menulist.addEventListener("command", function(e){
						e.currentTarget.onchange(e);
					});
					el = menupopup;
				}
								
				for(o of options)
				{
					let opt = templateopt.cloneNode(true);
					opt.innerText = o.label;
					opt.setAttribute("label", o.label);
					opt.setAttribute("value", o.value);
					el.appendChild(opt);
				}
				
				var value = Zotero.ZeNotes.Prefs.get(prefid);
				Array.from(el.querySelectorAll("option")).forEach(opt=>{
					if(value==opt.value)
					{
						opt.setAttribute("selected", "true");
					}
				})
				
				Array.from(el.querySelectorAll("menuitem")).forEach(opt=>{
					if(value==opt.value)
					{
						el.parentNode.selectedItem = opt;
					}
				})
				
			}
			
			else if(el.type && el.type.toUpperCase()=="CHECKBOX")
			{
				el.checked = Zotero.ZeNotes.Prefs.get(prefid)=="true" || Zotero.ZeNotes.Prefs.get(prefid)==true;
			}
			else 
			{
				var value = "";
				if(mode=="encrypt")
				{
					value = Zotero.ZeNotes.Prefs.getb(prefid);
				}
				else
				{
					value = Zotero.ZeNotes.Prefs.get(prefid);
				}
				el.value = value;
				
				if(el.id=="zn-bg-opacity")
				{
					var sample = document.getElementById("zn-bg-sample");
					var color = Zotero.ZeNotes.Utils.addopacity(sample.style.backgroundColor, value);
					sample.style.backgroundColor = color;
					el.addEventListener("input", function(e){
						sample = document.getElementById("zn-bg-sample");
						var color = Zotero.ZeNotes.Utils.addopacity(sample.style.backgroundColor, e.target.value);
						sample.style.backgroundColor = color;
					});
				}
			}
		}
	},
	
	setpreference(e, id, mode="") {
		var value = "";
		if(e.target.type && e.target.type.toUpperCase()=="CHECKBOX")
		{
			value = e.target.checked;
		}
		else
		{
			value = e.target.value;
		}
		
		if(mode=="encrypt")
		{
			Zotero.ZeNotes.Prefs.setb(id, value);
		}
		else
		{
			Zotero.ZeNotes.Prefs.set(id, value);
		}
		
		if(Zotero.ZeNotes.Prefs.get("load-on-change")=="true" || Zotero.ZeNotes.Prefs.get("load-on-change")==true){
			Zotero.ZeNotes.Ui.reload();
		}
	},
		
	importpref(e)
	{
		var lsettings = document.getElementById("zn-load-settings");
		var collectionid = undefined;
		if (Zotero.platformMajorVersion < 102) {			
			collectionid = lsettings.options[lsettings.selectedIndex].value;
		}
		else
		{
			collectionid = lsettings.value;
		}
		
		if(typeof collectionid=="undefined")
		{
			console.log("Please choose a source collection first!");
			return;
		}
		
		if(!confirm("Do you really want to overwrite current collection settings?\nThis change is irreversible!"))
		{
			return;
		}
		Zotero.ZeNotes.Database.copysettings(collectionid, this.collectionid, this.collection).then(()=>{
			Zotero.warn("Collection settings imported!");
		})
	},
		
	async readxhtml(include){
		include.innerHTML = "";
		var filename = include.src;
		if(filename==undefined)
		{
			filename = include.dataset.src;
		}
		
		var url = Zotero.ZeNotes.rootURI+"content/settings/"+filename;
		return fetch(url)
		.then(response => response.text())
		.then(content => {
			let parser = Zotero_Preferences.ZeNotes.parser;
			const doc = parser.parseFromString(content, 'application/xhtml+xml');
			const importedNode = document.importNode(doc.documentElement, true);
			include.appendChild(importedNode);
			return Promise.resolve(include);
		}).then(include=>{
			if(include.onload)
			{
				include.onload();
			}
			return Promise.resolve(include);
		}).catch(e=>{
			alert(e);
		})
	},
	
	initpanel(part){
		var args = []
		switch(part) {
			case 'global':
				args = [
					["bg-opacity", "zn-bg-opacity"],
					["remove-menu", "zn-remove-menu"],
					["html-filter-replacement", "zn-html-filter-replacement"],
					["html-filter", "zn-html-filter"],
					["column-width", "zn-column-width"],
					["column-width", "zn-column-width-val"],
					["header-size", "zn-header-size"],
					["header-size", "zn-header-size-val"],
					["vertical-table", "zn-vertical-table"]
				];
				break;
				
			case 'translation':
				args = [
					["deepl-api-key", "zn-deepl-api-key", "encrypt"],
					["google-translate-key", "zn-google-translate-key", "encrypt"],
					["target-language", "zn-target-language"]
				]
				break;
				
			case 'generative-ai':
				args = [
					["openai-max-token", "zn-openai-max-token"],
					["openai-model", "zn-openai-model"],
					["openai-api-key", "zn-openai-api-key", "encrypt"],
					["bard-model", "zn-bard-model"],
					["bard-api-key", "zn-bard-api-key", "encrypt"]
				];
				break;
			
			case 'prompts':
				args = [
					["table-custom-prompt", "zn-table-custom-prompt"],
					["row-custom-prompt", "zn-row-custom-prompt"],
					["cell-custom-prompt", "zn-cell-custom-prompt"],
					["paraphrase-custom-prompt", "zn-paraphrase-custom-prompt"]
				];
				break;
			case 'performance':
				args = [
					["load-on-change", "zn-reload-on-change"]
				];
				break;
			case 'load-save':
				args = [
					["load-settings", "zn-load-settings"]
				];
				break;
		}
		
		for(arg of args)
		{
			if(arg.length=2)
			{
				Zotero_Preferences.ZeNotes.loadpreference(arg[0], arg[1]);
			}
			else if(arg.length==3)
			{
				Zotero_Preferences.ZeNotes.loadpreference(arg[0], arg[1], arg[2]);
			}
		}
	},
		
	loadtagmanager(box)
	{
		var table = box.querySelector("#table-manage-tags-body");	
		var buttonlist = ["up", "down", "first", "last", "visible"];
		box.parentNode.querySelector(".collection-name").innerHTML = this.collection;
		if(table!=null)
		{
			table.innerHTML = "";
			table = Zotero_Preferences.ZeNotes.loadtagsfromdb(table, ["value", "type", "status", "width", "actions"], buttonlist);
		}
		return table;
	},
	
	loadtagsorter(box)
	{	
		var table = box.querySelector("#table-sort-tags-body");
		var buttonlist = ["sort", "up", "down", "first", "last"];
		box.parentNode.querySelector(".collection-name").innerHTML = this.collection;
		if(table!=null)
		{
			table.innerHTML = "";
			table = Zotero_Preferences.ZeNotes.loadtagsfromdb(table, ["value", "actions"], buttonlist);
		}
		return table;
	},
	
	async saveusersettings()
	{
		await this.currentcollection();
		var data = {
			"hidden": Zotero_Preferences.ZNTable.getuserhiddentags(),
			"order": Zotero_Preferences.ZNTable.getusertagorder(),
			"sort": Zotero_Preferences.ZNTable.getusersortorder(),
			"reverse": Zotero_Preferences.ZNTable.getuserreverseorder(),
			"width": Zotero_Preferences.ZNTable.getusercolumnwidth()
		}
		return Zotero.ZeNotes.Database.addsetting(this.collectionid, this.collection, JSON.stringify(data));
	},
	
	async saveandreload()
	{
		await this.saveusersettings();
		if(Zotero.ZeNotes.Prefs.get("load-on-change")=="true" || Zotero.ZeNotes.Prefs.get("load-on-change")==true)
		{
			Zotero.ZeNotes.Ui.reload();
		}
	},
		
	loadtagsfromdb(table, columns, buttonlist)
	{
		var tags = [];
		var hiddentags = this.defaulthiddentags;
		
		if(!Object.keys(this.usersettings).includes("width"))
		{
			this.usersettings["width"] = {};
		}
		
		if(this.usersettings["hidden"].length>0)
		{
			hiddentags = this.usersettings["hidden"];
		}
		
		var data = this.zenotedata;
		var width = "";
		for(t of data["selected_tags"])
		{
			let status = "visible";
			let direction = "down";
			if(hiddentags.includes(t))
			{
				status = "hidden";
			}
			
			if(this.usersettings["reverse"].includes(t))
			{
				direction = "up";
			}
			
			if(Object.keys(this.usersettings["width"]).includes(t))
			{
				width = this.usersettings["width"][t];
			}
			
			tags.push({
				type: "tag",
				value: t,
				status: status,
				direction: direction,
				width: "<input onchange=\"Zotero_Preferences.ZeNotes.saveandreload();\" value=\""+width+"\" class=\"tag-width\" data-tag=\""+t+"\"/>",
				actions: this.tableutils.actions(t, status, direction, buttonlist),
			});
			width = "";
		}
		
		for(t of data["info_columns"])
		{
			let status = "visible";
			let direction = "down";
			if(hiddentags.includes(t))
			{
				status = "hidden";
			}
			
			if(this.usersettings["reverse"].includes(t))
			{
				direction = "up";
			}
			
			if(Object.keys(this.usersettings["width"]).includes(t))
			{
				width = this.usersettings["width"][t];
			}
			
			tags.push({
				type: "info",
				value: t,
				status: status,
				direction: direction,
				width: "<input onchange=\"Zotero_Preferences.ZeNotes.saveandreload();\" value=\""+width+"\" class=\"tag-width\" data-tag=\""+t+"\"/>",
				actions: this.tableutils.actions(t, status, direction, buttonlist),
			});
			width = "";
		}
		this.tableutils.rendertags(table, tags, columns, this.usersettings);
		return table;
	}
}

/**
Refresh after losing focus
*/


this.addEventListener("blur", function(e) {
	this.addEventListener("focus", function(e) 
	{
		window.setTimeout(function(){
			Zotero_Preferences.ZeNotes.init().then(a=>{
				if(Zotero.platformMajorVersion < 102)
				{
					var prefpane = document.querySelector("#zotero-prefpane-zenotes");
				}
				else
				{
					var prefpane = document;
				}
				
				var includes = prefpane.querySelectorAll(".zn-include");
				
				for(include of includes){
					if(include.onload)
					{
						include.onload();
					}
				}
			});
		}, 300);
		
	}, {once : true});
}, {once : false});