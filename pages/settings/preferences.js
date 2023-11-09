
Zotero_Preferences.ZeNotes = {
	init(){
		this.saveloadcomplete = false;
		this.tableutils = Zotero_Preferences.ZNTable;
		this.defaulthiddentags = ["Id", "itemid", "key", "filekey"];
		var includes = document.getElementsByClassName("zn-include");
		for (include of includes)
		{
			Zotero_Preferences.ZeNotes.readxhtml(include, include.src);
		}
		document.getElementById("zn-refresh").addEventListener("click", function(){
			Zotero.ZeNotes.Ui.reload();
		});
		
	},
	
	importpref(e)
	{
		var lsettings = document.getElementById("zn-load-settings");
		Zotero.ZeNotes.Database.copysettings(lsettings.dataset.collectionid, this.collectionid, this.collection).then(()=>{
			alert("Collection settings imported!");
		})
	},
	
	updateprefimport(e)
	{
		var lsettings = document.getElementById("zn-load-settings");
		lsettings.value = e.target.label;
		lsettings.dataset.collectionid = e.target.value;
	},
	
	loadpreferences()
	{
		var lsettings = document.getElementById("zn-load-settings");
		if(lsettings==undefined)
		{
			return;
		}
		
		if(this.saveloadcomplete==true)
		{
			return;
		}
		
		this.saveloadcomplete = true;
		
		Zotero.ZeNotes.Database.getsettings().then(settings=>{
			settings = settings.sort(function(a, b) {
			   return a.label.localeCompare(b.label);
			});
			
			for(s of settings)
			{
				if(s.collectionid==this.collectionid)
				{
					continue;
				}
				var opt = document.createXULElement('menuitem');
				opt.label = s.label;
				opt.value = s.collectionid;
				lsettings.appendChild(opt);
			}
		})
	},
	
	readxhtml(include, filename)
	{
		fetch(Zotero.ZeNotes.rootURI+"pages/settings/"+filename)
		.then(response => response.text())
		.then(content => {
			const parser = new DOMParser();
			const doc = parser.parseFromString(content, 'application/xhtml+xml');
			const importedNode = document.importNode(doc.documentElement, true);
			include.appendChild(importedNode);
			Zotero_Preferences.ZeNotes.loadtables();
			Zotero_Preferences.ZeNotes.loadpreferences();
		})
		.catch(error => {
			alert('Error loading content: ' + error);
		});
	},
	
	loadtables(){
		// get collection first
		var c = Zotero.getActiveZoteroPane().getSelectedCollection();
		this.collection = "All documents";
		this.collectionid = "all-documents";
		if(c!=undefined && c.name!=undefined)
		{
			this.collection = c.name;
			this.collectionid = c.id;
		}
		
		document.getElementById("zn-settings-main-title").innerHTML = "Settings for 「"+this.collection+"」";
		
		var table1 = document.getElementById("table-manage-tags-body");
		var table2 = document.getElementById("table-sort-tags-body");
		var buttonlist1 = ["up", "down", "first", "last", "visible"];
		var buttonlist2 = ["sort", "up", "down", "first", "last"];
		Zotero_Preferences.ZeNotes.loadtagsfromdb(table1, ["value", "type", "status", "actions"], buttonlist1);
		Zotero_Preferences.ZeNotes.loadtagsfromdb(table2, ["value", "actions"], buttonlist2);
	},

	async saveusersettings()
	{
		var data = {
			"hidden": Zotero_Preferences.ZNTable.getuserhiddentags(),
			"order": Zotero_Preferences.ZNTable.getusertagorder(),
			"sort": Zotero_Preferences.ZNTable.getusersortorder(),
			"reverse": Zotero_Preferences.ZNTable.getuserreverseorder()
		}
		return Zotero.ZeNotes.Database.addsetting(this.collectionid, this.collection, JSON.stringify(data));
	},
	
	saveandreload()
	{
		this.saveusersettings().then(()=>{
		});
	},
		
	async loadtagsfromdb(table, columns, buttonlist)
	{
		var tags = [];
		var hiddentags = this.defaulthiddentags;
		
		var usersettings = {
			"hidden": [],
			"order": [],
			"sort": [],
			"reverse": []
		}
		
		try {
			var dbdata = await Zotero.ZeNotes.Database.getsetting(this.collectionid);
			usersettings = JSON.parse(dbdata);
		}
		catch(e){
			console.log(e);
		}
		
		if(usersettings["hidden"].length>0)
		{
			hiddentags = usersettings["hidden"];
		}

		Zotero.ZeNotes.Data.get().then(data=> {
			for(t of data["selected_tags"])
			{
				let status = "visible";
				let direction = "down";
				if(hiddentags.includes(t))
				{
					status = "hidden";
				}
				
				if(usersettings["reverse"].includes(t))
				{
					direction = "up";
				}
				
				tags.push({
					type: "tag",
					value: t,
					status: status,
					direction: direction,
					actions: this.tableutils.actions(t, status, direction, buttonlist),
				});
			}
			
			for(t of data["info_columns"])
			{
				let status = "visible";
				let direction = "down";
				if(hiddentags.includes(t))
				{
					status = "hidden";
				}
				
				if(usersettings["reverse"].includes(t))
				{
					direction = "up";
				}
				
				tags.push({
					type: "info",
					value: t,
					status: status,
					direction: direction,
					actions: this.tableutils.actions(t, status, direction, buttonlist),
				});
			}
			this.tableutils.rendertags(table, tags, columns, usersettings);
		});
	}
}

/**
Refresh after losing focus
*/

this.addEventListener("focus", function() 
{
	Zotero_Preferences.ZeNotes.loadtables();
});

this.addEventListener("blur", function() 
{
	Zotero.ZeNotes.Ui.reload();
});