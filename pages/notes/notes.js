const { XPCOMUtils } = ChromeUtils.import("resource://gre/modules/XPCOMUtils.jsm");
XPCOMUtils.defineLazyModuleGetters(this, {
	E10SUtils: "resource://gre/modules/E10SUtils.jsm",
	Services: "resource://gre/modules/Services.jsm",
	setTimeout: "resource://gre/modules/Timer.jsm",
	Zotero: "chrome://zotero/content/include.jsm"
});

Notes = {
	init() {
		this.tableutils = Zotero_Preferences.ZNTable;
		this.body = document.getElementById("zn-body");
		this.infotags = ["id", "key", "title", "date", "journal", "author", "creators", "itemid", "filekey"];
		this.body.focus();
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
			usersettings ={
				hidden: [],
				order: dbdata["info_columns"].concat(dbdata["selected_tags"]),
				sort: dbdata["info_columns"].concat(dbdata["selected_tags"]),
				reverse:[],
			}
		}
		return usersettings;
		
	},
	
	async loaddata ()
    {
		var notes = await Zotero.ZeNotes.Data.get();
		var usersettings = await this.getsettings();
		var columns = notes["info_columns"].concat(notes["selected_tags"]);
		columns = this.tableutils.removehiddenandsort(columns, usersettings);
				
		// Only "tagged_items" instead of "selected_items"
		var items = notes["tagged_items"];
		items = items.sort(this.tableutils.custommultiplesortfunc(usersettings));

		var table = document.createElement("table");
        var trh = document.createElement("tr");
        table.id = "notes-table"
        table.appendChild(trh);

        columns.forEach(c=>{
            var tdh = document.createElement("th");
            tdh.innerHTML = c;
            tdh.className = "context-menu-header";
            tdh.dataset.column = c;
            trh.appendChild(tdh)
        });
				
        items.forEach(v=>{
            var tr = document.createElement("tr");
            table.appendChild(tr);
            columns.forEach(c=>{
                let td = document.createElement("td");
				tr.appendChild(td);
                
                if(c in v){
					try {
						td.innerHTML = v[c];
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
                
                var span = td.querySelector(".notekey");
                
                if(span)
                {
                    td.dataset.notekey = span.innerText;
                    span.parentNode.removeChild(span);
                }
                else
                {
                    td.dataset.notekey = "";
                }
                
                td.dataset.column = c;
                td.dataset.itemid = v.itemid;
                td.dataset.itemkey = v.key;
                td.dataset.filenames = JSON.stringify(v.filenames);
                td.dataset.filekey = v.filekey;

                td.querySelectorAll(".annotation").forEach(a=>{
                    a.addEventListener("mouseover", function(e){
                        e.target.parentNode.dataset.attachmentid = e.target.dataset.attachmentid;
                        e.target.parentNode.dataset.attachmentkey = e.target.dataset.attachmentkey;
                        e.target.parentNode.dataset.annotationpage = e.target.dataset.annotationpage;
                        e.target.parentNode.dataset.annotationkey = e.target.dataset.annotationkey;
                        e.target.parentNode.dataset.annotationdomid = e.target.id;
                    });
                });
                
            });
        }); 
        document.getElementById("zn-body").appendChild(table);
    },
}

window.addEventListener("load", function(){
	Notes.init();
	Notes.loaddata();
})