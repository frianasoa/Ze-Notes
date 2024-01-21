Notes = {
	init() {
		var fontsize = Zotero.ZeNotes.Prefs.get("font-size");
		
		this.tableutils = Zotero_Preferences.ZNTable;
		this.body = document.getElementById("zn-body");
		this.infotags = ["id", "key", "title", "date", "journal", "author", "creators", "itemid", "filekey"];
		this.body.focus();
		if(fontsize)
		{
			this.body.style.fontSize = fontsize+"px";
		}
		this.fontsize = 1;
		
	},
	
	isvertical()
	{
		return (Zotero.ZeNotes.Prefs.get("vertical-table")=="true" || Zotero.ZeNotes.Prefs.get("vertical-table")==true);
	},
	
	async savesettings(settings)
	{
		var usersettings = {};
		var c = Zotero.getActiveZoteroPane().getSelectedCollection();
		this.collection = "All documents";
		this.collectionid = "all-documents";
		if(c!=undefined && c.name!=undefined)
		{
			this.collection = c.name;
			this.collectionid = c.id;
		}
		return Zotero.ZeNotes.Database.updatesetting(Notes.collectionid, Notes.collection, JSON.stringify(settings));
	},
	
	async getsettings()
	{
		var usersettings = {};
		var c = Zotero.getActiveZoteroPane().getSelectedCollection();
		this.collection = "All documents";
		this.collectionid = "all-documents";
		if(c!=undefined && c.name!=undefined)
		{
			this.collection = c.name;
			this.collectionid = c.id;
		}
		
        try {
			var dbdata = await Zotero.ZeNotes.Database.getsetting(this.collectionid);
			usersettings = JSON.parse(dbdata);
		}
		catch(e){
			var dbdata = await Zotero.ZeNotes.Data.get();
			usersettings = {
				hidden: [],
				order: dbdata["info_columns"].concat(dbdata["selected_tags"]),
				sort: dbdata["info_columns"].concat(dbdata["selected_tags"]),
				reverse:[],
			}
		}
		return usersettings;
	},
	
	async insertcolumn(source, destination) {
		if(source.toLowerCase()==destination.toLowerCase())
		{
			return;
		}
		var settings = await Notes.getsettings();
		var order = settings["order"];
		order = Zotero.ZeNotes.Utils.array_move(order, source, destination);
		settings["order"] = order;
		Notes.savesettings(settings).then(r=>{
			Zotero.ZeNotes.Ui.reload();
		});
	},
		
	async loaddata()
    {
		var notes = await Zotero.ZeNotes.Data.get();
		var usersettings = await this.getsettings();
		var columns = notes["info_columns"].concat(notes["selected_tags"]);
		columns = this.tableutils.removehiddenandsort(columns, usersettings);
		
		var hsize = Zotero.ZeNotes.Prefs.get("header-size");
		
		var hsizes = usersettings["width"]; // Keep "width" in the database
				
		// Only "tagged_items" instead of "selected_items"
		var items = notes["tagged_items"];
		items = items.sort(this.tableutils.custommultiplesortfunc(usersettings));

		var table = document.createElement("table");
        table.id = "notes-table"
		table.style.tableLayout = "fixed";
		if(this.isvertical())
		{
			this.vtable(table, columns, items, hsizes, hsize);
		}
		else
		{
			this.htable(table, columns, items, hsizes, hsize);
		}
    },
	
	vtable(table, columns, items, hsizes, hsize)
	{
		var trs = {};
		var i = 0;
		var width = Zotero.ZeNotes.Prefs.get("column-width");
		columns.forEach(c=>{
			i+=1;
			var trh = document.createElement("tr");
            var tdh = document.createElement("td");
			table.appendChild(trh);
			trh.className = "zn-data-row";
			trs[c] = trh;
            Notes.innerHTML(tdh, c);
            tdh.className = "context-menu-header draggable-header";
			tdh.setAttribute("draggable", "true");
            tdh.dataset.column = c;
			
			if(i>1)
			{
				tdh.style.height = hsize+"px";
			}
			
			tdh.style.userSelect = "none";
            trh.appendChild(tdh);
			
			tdh.addEventListener("dragstart", function(e){
				e.dataTransfer.setData('text/plain', e.target.dataset.column);
			})
			
			tdh.addEventListener("dragover", function(e){
				e.preventDefault();
			})
			
			tdh.addEventListener("drop", function(e){
				var source = e.dataTransfer.getData("text/plain");
				var destination = e.target.dataset.column;
				Notes.insertcolumn(source, destination);
			})
			
			if(Object.keys(hsizes).includes(c))
			{
				if(hsizes[c]!="")
				{
					tdh.style.height = hsizes[c]+"px";
				}
			}
        });
				
        items.forEach(v=>{
			var i = 0;
            columns.forEach(c=>{
                i+=1;
				let td = document.createElement("td");
				var tr = trs[c];
				tr.appendChild(td);
				if(c in v) {
					try {
						Notes.innerHTML(td, v[c]);
					}
					catch(e)
					{
						alert(e+"=>"+c+": "+v[c]+" : ");
					}
                }
                
                if(Notes.infotags.includes(c))
                {
                    td.dataset.type = "info";
                    td.className = "context-menu-two info";
                }
                else
                {
                    td.dataset.type = "tag";
                    td.className = "context-menu-one tag";
                }
                
                td.querySelectorAll(".user-note").forEach(div=>{
					div.addEventListener("mouseover", function(e){
						e.target.closest("td").dataset.notekey=div.dataset.notekey;
					})
				})
                
                td.dataset.column = c;
                td.dataset.itemid = v.itemid;
                td.dataset.itemkey = v.key;
                td.dataset.filenames = JSON.stringify(v.filenames);
                td.dataset.filekey = v.filekey;

                td.querySelectorAll(".annotation").forEach(a=>{
                    a.addEventListener("mouseover", function(e){
                        e.target.closest("td").dataset.annotationid = e.currentTarget.dataset.annotationid;
                        e.target.closest("td").dataset.attachmentid = e.currentTarget.dataset.attachmentid;
                        e.target.closest("td").dataset.attachmentkey = e.currentTarget.dataset.attachmentkey;
                        e.target.closest("td").dataset.annotationpage = e.currentTarget.dataset.annotationpage;
                        e.target.closest("td").dataset.annotationkey = e.currentTarget.dataset.annotationkey;
                        e.target.closest("td").dataset.annotationdomid = e.currentTarget.id;
                    });
                });
				
				if(i>1)
				{
					td.style.height = hsize+"px";
				}
				
				td.style.minWidth = width+"px";
				
				if(Object.keys(hsizes).includes(c))
				{
					if(hsizes[c]!="")
					{
						td.style.height = hsizes[c]+"px";
					}
				}
                
            });
        }); 
        document.getElementById("zn-body").appendChild(table);
	},
	
	htable(table, columns, items, hsizes, hsize)
	{
		var trh = document.createElement("tr");
		table.appendChild(trh);
		columns.forEach(c=>{
            var tdh = document.createElement("td");
            Notes.innerHTML(tdh, c);
            tdh.className = "context-menu-header draggable-header";
			tdh.setAttribute("draggable", "true");
            tdh.dataset.column = c;
			tdh.style.minWidth = hsize+"px";
			tdh.style.userSelect = "none";
            trh.appendChild(tdh);
			
			tdh.addEventListener("dragstart", function(e){
				e.dataTransfer.setData('text/plain', e.target.dataset.column);
			})
			
			tdh.addEventListener("dragover", function(e){
				e.preventDefault();
			})
			
			tdh.addEventListener("drop", function(e){
				var source = e.dataTransfer.getData("text/plain");
				var destination = e.target.dataset.column;
				Notes.insertcolumn(source, destination);
			})
			
			if(Object.keys(hsizes).includes(c))
			{
				if(hsizes[c]!="")
				{
					tdh.style.minWidth = hsizes[c]+"px";
				}
			}
        });
				
        items.forEach(v=>{
			var tr = document.createElement("tr");
			tr.className = "zn-data-row";
            table.appendChild(tr);
            columns.forEach(c=>{
                let td = document.createElement("td");
				tr.appendChild(td);
                if(c in v){
					
					try {
						Notes.innerHTML(td, v[c]);
					}
					catch(e)
					{
						alert(e+"=>"+c+": "+v[c]+" : ");
					}
                }
                
                if(Notes.infotags.includes(c))
                {
                    td.dataset.type = "info";
                    td.className = "context-menu-two info";
                }
                else
                {
                    td.dataset.type = "tag";
                    td.className = "context-menu-one tag";
                }
                
                td.querySelectorAll(".user-note").forEach(div=>{
					div.addEventListener("mouseover", function(e){
						e.target.closest("td").dataset.notekey=div.dataset.notekey;
					})
				})
                
                td.dataset.column = c;
                td.dataset.itemid = v.itemid;
                td.dataset.itemkey = v.key;
                td.dataset.filenames = JSON.stringify(v.filenames);
                td.dataset.filekey = v.filekey;

                td.querySelectorAll(".annotation").forEach(a=>{
                    a.addEventListener("mouseover", function(e){
                        e.target.closest("td").dataset.annotationid = e.currentTarget.dataset.annotationid;
                        e.target.closest("td").dataset.attachmentid = e.currentTarget.dataset.attachmentid;
                        e.target.closest("td").dataset.attachmentkey = e.currentTarget.dataset.attachmentkey;
                        e.target.closest("td").dataset.annotationpage = e.currentTarget.dataset.annotationpage;
                        e.target.closest("td").dataset.annotationkey = e.currentTarget.dataset.annotationkey;
                        e.target.closest("td").dataset.annotationdomid = e.currentTarget.id;
                    });
                });
				td.style.minWidth = hsize+"px";
				if(Object.keys(hsizes).includes(c))
				{
					if(hsizes[c]!="")
					{
						td.style.minWidth = hsizes[c]+"px";
					}
				}
                
            });
        }); 
        document.getElementById("zn-body").appendChild(table);
	},
	
	innerHTML(elt, txt)
	{
		if (Zotero.platformMajorVersion >= 102) {
			var parser = new DOMParser();
			var doc = parser.parseFromString(txt, "text/html").body;
			html = new XMLSerializer().serializeToString(doc);
		}
		else {
			const parser = Components.classes['@mozilla.org/xmlextras/domparser;1'].createInstance(Components.interfaces.nsIDOMParser);
			var doc = parser.parseFromString(txt, 'text/html').documentElement;
			html = new XMLSerializer().serializeToString(doc);
		}
		elt.innerHTML = html;
	},
	
	initscroll(){
		$('#zn-body-wrapper').animate({
			scrollTop: Zotero.ZeNotes.Prefs.get("scrolltop", 0),
			scrollLeft: Zotero.ZeNotes.Prefs.get("scrollleft", 0),
		}, 200);
		
		$("#zn-body-wrapper").bind('scroll', function() {
			Zotero.ZeNotes.Prefs.set("scrolltop", $('#zn-body-wrapper').scrollTop());
			Zotero.ZeNotes.Prefs.set("scrollleft", $('#zn-body-wrapper').scrollLeft());
		});
	},
	
	zoom(sign){
		this.fontsize = this.fontsize;
		this.fontsize+=0.05*sign;
		if(this.fontsize<=0)
		{
			this.fontsize = 1;
		}
		else if(this.fontsize>10)
		{
			this.fontsize = 10;
		}
		Notes.body.style.fontSize = this.fontsize+"em";
		let pxsize = parseFloat(getComputedStyle(Notes.body).fontSize);
		Zotero.ZeNotes.Prefs.set("font-size", pxsize);
	}
	
}

window.addEventListener("load", function(){
	Notes.init();
	Notes.loaddata();
	Notes.initscroll();
})

document.addEventListener("wheel", function(e){
	if(e.ctrlKey){
		let delta = e.deltaY;
		delta = delta && delta / Math.abs(delta);
		let sign = delta*-1;
		Notes.zoom(sign);
	}
})

document.addEventListener("keyup", function(e){
	if(e.ctrlKey){
		let sign = 1;
		if(e.keyCode==107)
		{
			sign = 1;
		}
		else if(e.keyCode==109)
		{
			sign=-1;
		}
		Notes.zoom(sign);
	}
})