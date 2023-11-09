if(Zotero_Preferences==undefined)
{
	var Zotero_Preferences = {
		
	}
}


Zotero_Preferences.ZNTable = {
	sortfunc(property, order) {
		var sortOrder = 1;
		if(property[0] === "-") {
			sortOrder = -1;
			property = property.substr(1);
		}
		return function (a, b) {
			return order.indexOf(a[property]) - order.indexOf(b[property]);
		}
	},
	
	simplesortfunc(order){
		return (a, b) => {
		return order.indexOf(a) - order.indexOf(b);
	  };
	},
	
	multiplesortfunc(fields){
        return function (a, b) {
            return fields
                .map(function (o) {
                    var dir = 1;
                    if (o[0] === '-') {
                       dir = -1;
                       o=o.substring(1);
                    }
                    if (a[o] > b[o]) return dir;
                    if (a[o] < b[o]) return -(dir);
                    return 0;
                })
                .reduce(function firstNonZeroValue (p,n) {
                    return p ? p : n;
                }, 0);
        }
	},
	
	custommultiplesortfunc(usersettings)
	{
		var order = [];
		// var sort = usersettings["sort"];
		var sort = (usersettings["sort"]) ? usersettings["sort"] : [];

		
		var reverse = usersettings["reverse"];
		
		for(a of sort)
		{
			if(reverse.includes(a))
			{
				order.push("-"+a);
			}
			else
			{
				order.push(a);
			}
		}
		return this.multiplesortfunc(order);
	},
	
	removehiddenandsort(list, usersettings){
		if(!Object.keys(usersettings).includes("hidden"))
		{			
			return list;
		}
		var tags = [];
		for(l of list)
		{
			if(!usersettings["hidden"].includes(l))
			{
				tags.push(l);
			}
		}
		
		tags.sort(this.simplesortfunc(usersettings["order"]));
		return tags;
	},
	
	sorttags(tags, sortlist)
	{
		return tags.sort(this.sortfunc("value", sortlist));
	},
	
	rendertags(table, tags, columns, usersettings)
	{
		// Clean table first
		table.replaceChildren();
		
		// check if it is sort table
		
		var tablename = "display";
		if(table.id=="table-sort-tags-body")
		{
			tablename = "sort";
		}
		
		var sortlist = usersettings["order"];
		if(table.id=="table-sort-tags-body")
		{
			sortlist = usersettings["sort"];
		}
		
		if(sortlist==null)
		{
			sortlist = [];
		}
		
		tags = this.sorttags(tags, sortlist);
		
		const parser = new DOMParser();
		for(tag of tags)
		{
			var tr = document.createElementNS("http://www.w3.org/1999/xhtml", 'tr');
			table.appendChild(tr);
			
			var statusclass = "status-"+tag['status'];
				
			if(tablename=="sort")
			{
				statusclass = "direction-"+tag["direction"];
			}
			
			for(i in columns)
			{
				var c = columns[i];
				var td = document.createElementNS("http://www.w3.org/1999/xhtml", 'td');
				tr.appendChild(td);
				const doc = parser.parseFromString("<span xmlns='http://www.w3.org/1999/xhtml' class='"+statusclass+" tag-"+c+"'>"+tag[c]+"</span>", 'application/xhtml+xml');
				const importedNode = document.importNode(doc.documentElement, true);
				td.appendChild(importedNode);
			}
		}
	},
	
	
	tableactions(i, tag, status, direction)
	{
		var vicon = "fa-solid fa-eye";
		var dicon = "fa-solid fa-arrow-down-a-z";
		var vtitle = "Hide";
		
		if(status=="hidden")
		{
			var vicon = "fa-solid fa-eye-slash red-icon";
			vtitle = "Show";
		}
		
		if(direction=="up")
		{
			dicon = "fa-solid fa-arrow-up-z-a blue-icon";
		}
		
		var ta = {
			"sort": "<button title='Toggle sort direction' class='"+dicon+"' onclick='Zotero_Preferences.ZNTable.toggledirection(event);'></button>",
			
			"up": "<button title='Move up' class='fa-solid fa-chevron-up' onclick='Zotero_Preferences.ZNTable.moveup(event);'></button>",
			
			"down": "<button title='Move down' class='fa-solid fa-chevron-down' onclick='Zotero_Preferences.ZNTable.movedown(event);'></button>",
			
			"first": "<button title='Move to first' class='fa-solid fa-angles-up' onclick='Zotero_Preferences.ZNTable.movetotop(event);'></button>",
			
			"last": "<button title='Move to last' class='fa-solid fa-angles-down' onclick='Zotero_Preferences.ZNTable.movetobottom(event);'></button>",
			
			"visible": "<button title='"+vtitle+"' class='"+vicon+"' onclick='Zotero_Preferences.ZNTable.togglevisibility(event);'></button>"
		}
		
		if(Object.keys(ta).includes(i))
		{
			return ta[i];
		}
		else {
			return "";
		}
	},
	
	actions(tag, status, direction, buttons){
		var a = "";
		for(b of buttons)
		{
			a+=this.tableactions(b, tag, status, direction);
		}
		return a
	},
	
	moveup(e)
	{
		var tr = e.target.closest("tr");
		var tbody = tr.closest("tbody");
		var previoustr = tr.previousElementSibling;
		
		if(previoustr!=null)
		{
			tbody.insertBefore(tr, previoustr);
		}
		Zotero_Preferences.ZeNotes.saveandreload();
	},
	
	movedown(e)
	{
		var tr = e.target.closest("tr");
		var tbody = tr.closest("tbody");
		var nexttr = tr.nextElementSibling;		
		if(nexttr!=null)
		{
			tbody.insertBefore(nexttr, tr);
		}
		Zotero_Preferences.ZeNotes.saveandreload();
	},
	
	movetotop(e)
	{
		var tr = e.target.closest("tr");
		var tbody = tr.closest("tbody");
		var previoustr = tbody.firstChild;
		if(previoustr!=null)
		{
			tbody.insertBefore(tr, previoustr);
		}
		Zotero_Preferences.ZeNotes.saveandreload();
	},
	
	movetobottom(e)
	{
		var tr = e.target.closest("tr");
		var tbody = tr.closest("tbody");
		var lasttr = tbody.lastChild;
		if(lasttr!=null)
		{
			lasttr.after(tr);
		}
		Zotero_Preferences.ZeNotes.saveandreload();
	},
	
	toggledirection(e)
	{
		var tr = e.target.closest("tr");
		var ups = tr.querySelectorAll("span.direction-up");
		var downs = tr.querySelectorAll("span.direction-down");
		if(ups.length>0)
		{
			for(u of ups)
			{
				u.classList.add("direction-down");
				u.classList.remove("direction-up");
			}
			e.target.className = "fa-solid fa-arrow-down-a-z";
		}
		else if(downs.length>0)
		{
			for(d of downs)
			{
				d.classList.add("direction-up");
				d.classList.remove("direction-down");
			}
			e.target.className = "fa-solid fa-arrow-up-z-a blue-icon";
		}
		Zotero_Preferences.ZeNotes.saveandreload();
	},
	
	togglevisibility(e)
	{
		var tr = e.target.closest("tr");
		var hiddens = tr.querySelectorAll("span.status-hidden");
		var visibles = tr.querySelectorAll("span.status-visible");
		var visibility = tr.querySelector("span.tag-status:first-child");
		
		if(hiddens.length>0)
		{
			visibility.innerHTML = "visible";
			visibility.className = "tag-status status-visible";
			for(h of hiddens)
			{
				h.classList.add("status-visible");
				h.classList.remove("status-hidden");
			}
			e.target.className = "fa-solid fa-eye";
			
		}
		else if(visibles.length>0)
		{
			visibility.innerHTML = "hidden";
			visibility.className = "tag-status status-hidden";
			for(v of visibles)
			{
				v.classList.add("status-hidden");
				v.classList.remove("status-visible");
			}
			e.target.className = "fa-solid fa-eye-slash red-icon";
		}
		Zotero_Preferences.ZeNotes.saveandreload();
	},
	
	getuserhiddentags()
	{
		var table = document.getElementById("table-manage-tags-body");
		var spans = table.querySelectorAll("span.tag-value.status-hidden");
		var hiddens = [];
		for(span of spans)
		{
			hiddens.push(span.textContent);
		};
		return hiddens;
	},
	
	getusertagorder(){
		var table = document.getElementById("table-manage-tags-body");
		var spans = table.querySelectorAll("span.tag-value");
		var order = [];
		for(span of spans)
		{
			order.push(span.textContent);
		};
		return order;
	},
	
	getusersortorder(){
		var table = document.getElementById("table-sort-tags-body");
		var spans = table.querySelectorAll("span.tag-value");
		var order = [];
		for(span of spans)
		{
			order.push(span.textContent);
		};
		return order;
	},
	
	getuserreverseorder(){
		var table = document.getElementById("table-sort-tags-body");
		var spans = table.querySelectorAll("span.tag-value.direction-up");
		var order = [];
		for(span of spans)
		{
			order.push(span.textContent);
		};
		return order;
	},
}