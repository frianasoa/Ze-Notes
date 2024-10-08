Format = {
	init()
	{
		this.turndownService = new TurndownService();
		this.turndownPluginGfm = TurndownPluginGfmService;
		this.initturndown();
	},
	
	initturndown()
	{
		this.turndownServiceFull = new TurndownService();
		this.turndownPluginGfm.tables(this.turndownServiceFull);
		
		this.turndownServiceFull.keep(['div', 'hr', 'br', 'a', 'img']);
		this.turndownServiceFull.addRule('divs', {
			filter: ['div'],
			replacement: function (content, node) {
			if(content.replace(/\s/g, '')){
				Zotero.warn(node.outerHTML);
				if(node.style.cssText)
				{
					return "<div style='"+node.style.cssText+"'>"+content+"</div>";
				}
				else
				{
					return "<div>"+content+"</div>";
				}
			}
			else {
				return "";
			}
		  }
		});
		
		this.turndownServiceFull.addRule('spans', {
			filter: ['span'],
			replacement: function (content, node) {
				var td = node.closest("td");
				var annotation = node.closest(".annotation");
				if(node.className=="quotation-source")
				{
					var url = "https://zotero/open-pdf/library/items/"+annotation.dataset.attachmentkey+"?annotation="+annotation.dataset.annotationkey;
					return "["+node.innerText+"]("+url+")";
				}
				else
				{
					return node.innerText;
				}
			}
		});
		
		this.turndownServiceFull.addRule('hrs', {
		filter: ['hr'],
			replacement: function (content, node) {
				return "---";
			}
		});
		
		this.turndownServiceMin = new TurndownService();
		this.turndownPluginGfm.tables(this.turndownServiceMin);
		
		this.turndownServiceMin.keep(['br']);
		this.turndownServiceMin.addRule('links', {
		  filter: ['a'],
		  replacement: function (content, node) {
			return "["+content+"]("+node.href+")";
		  }
		});
		
		this.turndownServiceMin.addRule('divs', {
		filter: ['div'],
			replacement: function (content, node) {
			if(content.replace(/\s/g, '').replace(/ /g , "")) {  
				return "<br/>"+content+"<br/>";
			}
			else
			{
				return ""
			}
		  }
		});
		
		this.turndownServiceMin.addRule('hrs', {
		filter: ['hr'],
			replacement: function (content, node) {
				return "---";
			}
		});
	},
	
	async process(table, typedesc, foldername, callback)
	{
		var contents = "";
		
		if(Zotero.ZeNotes.Prefs.get("notes-add-links", false)==true)
		{
			this.addlink(table);
		}
		
		if(typedesc.includes("CSV"))
		{
			contents = this.csv(table);
		}
		else if(typedesc.includes("Document"))
		{
			contents = this.doc(table);
		}
		else if(typedesc.includes("Excel"))
		{
			contents = this.xls(table, foldername, callback);
		}
		else if(typedesc.includes("Web page"))
		{
			if(typedesc.includes("single file"))
			{
				contents = this.html(table);
			}
			else if(typedesc.includes("complete"))
			{
				contents = this.html(table, foldername, callback);
			}
		}
		else if(typedesc.includes("Markdown"))
		{
			if(typedesc.includes("single file"))
			{
				contents = this.md(table);
			}
			else if(typedesc.includes("complete, with HTML"))
			{
				contents = this.md(table, html, foldername, callback);
			}
			else if(typedesc.includes("complete"))
			{
				contents = this.md(table, false, foldername, callback);
			}
			else if(typedesc.includes("with HTML"))
			{
				contents = this.md(table, true);
			}
		}
		return contents;
	},
	
	csv(table, separator=",")
	{
		var rows = table.querySelectorAll('tr');
        var csv = [];
        for (var i = 0; i < rows.length; i++) {
            var row = [], cols = rows[i].querySelectorAll('td, th');
            for (var j = 0; j < cols.length; j++) {
                var data = cols[j].innerText.replace(/(\r\n|\n|\r)/gm, '').replace(/(\s\s)/gm, ' ')
                data = data.replace(/"/g, '""');
                row.push('"' + data + '"');
            }
            csv.push(row.join(separator));
        }
        return csv.join('\n');
	},
		
	xls(table, foldername, callback)
	{
		var template = '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40"><head><!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet><x:Name>{worksheet}</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions></x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]--><meta http-equiv="content-type" content="text/plain; charset=UTF-8"/></head><body><table>{table}</table></body></html>';
		var format = function(s, c)
		{
			return s.replace(/{(\w+)}/g, function(m, p) { return c[p]; }); 
		}

		// Execute callback: normally assets creation
		if(callback)
		{
			var files = this.splitassets(table, foldername);
			callback(files);
		}
		
		var ctx = {worksheet:"data" || 'Worksheet', table:table.outerHTML};
		contents = format(template, ctx);
		return contents;
	},
	
	doc(table)
	{	
		var html = table.outerHTML;
		var style = "<style>";
		style+= "th, td{white-space: pre-wrap;    white-space: -moz-pre-wrap;    white-space: -pre-wrap;    white-space: -o-pre-wrap;    word-wrap: break-word;border: solid 1px; vertical-align: top;padding:0.5em;padding-bottom: 1em;} table{table-layout: fixed; padding:0.5em;border-spacing: 0; border-collapse: collapse; border: solid 1px; width: 100%;}";
		style += "</style>";
		
		contents = "<meta http-equiv=Content-Type content='text/html; charset=utf-8'><html><head>"+style+"</head><body>"+html+"</body></html>"
		contents = contents.replace(/(background-color:#.{6})(.{2});\"/g, "$1;\"");
		return contents;
	},
	
	html(table, foldername=null, callback=null)
	{
		table.style = "width: 100%; border-spacing:0;";
		table.querySelectorAll('td').forEach(td=>{
			td.style = "border: solid 1px; padding: 0.3em;";
		});
		
		table.querySelectorAll('hr').forEach(hr=>{
			hr.style = "border solid 1px #efefef; width: 75%;";
		});
		
		// Execute callback: normally assets creation
		if(callback)
		{
			var files = this.splitassets(table, foldername);
			callback(files);
		}
		contents = table.outerHTML;
		return contents;
	},
	
	md(table, html=false, foldername=null, callback=null)
	{
		if(callback)
		{
			var files = this.splitassets(table, foldername);
			callback(files);
		}
		if(html)
		{
			contents = this.turndownServiceFull.turndown(table.outerHTML).replace(/https\:\/\/zotero\//g, "zotero://");
		}
		else
		{
			contents = this.turndownServiceMin.turndown(table.outerHTML).replace(/https\:\/\/zotero\//g, "zotero://");
		}
		return contents;
	},
	
	addlink(table)
	{
		table.querySelectorAll('.quotation-source').forEach(annotation=>{
			var div = annotation.closest("div.annotation");
			var lnk = document.createElement("a");
			lnk.innerHTML = "&#128279;";
			lnk.href= "zotero://open-pdf/library/items/"+div.dataset.attachmentkey+"?annotation="+div.dataset.annotationkey;
			annotation.appendChild(lnk);
		});
	},
	
	splitassets(table, foldername)
	{
		var imgs = table.querySelectorAll('img');
		var i = 1;
		var files = [];
		for(img of imgs)
		{
			let ext = img.src.split(',')[0].replace("data:image/", "").replace(";base64", "");
			let filename = "image_"+String(i).padStart(3, '0')+"."+ext;
			files.push({filename: filename, data: img.src});
			img.src = "./"+(foldername+"/"+filename).split(" ").join("%20");
			i++;
		}
		return files;
	}
}

window.addEventListener("load", function(e){
	Format.init();
})