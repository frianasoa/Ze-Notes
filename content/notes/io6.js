Io = {
	init()
	{
		var collection = Zotero.getActiveZoteroPane().getSelectedCollection();
		this.turndownService = new TurndownService();
		this.turndownPluginGfm = TurndownPluginGfmService;
		this.initmd();
        this.currentCollection = "All documents";
        if(collection)
        {
            this.currentCollection = collection.name;
        }
	},
	
	export(){
		var nsIFilePicker = Components.interfaces.nsIFilePicker;
        var fp =Components.classes["@mozilla.org/filepicker;1"].createInstance(nsIFilePicker);
		fp.defaultString = "ZeNotes - "+Io.currentCollection+"."+Zotero.ZeNotes.Prefs.get("export-default-ext", "html");
		var filters = {
			"Documents (*.doc)": "*.doc",
			"Web page, HTML single file (*.html; *.htm)": "*.html; *.htm",
			"Web page, complete (*.html; *.htm)": "*.html; *.htm",
			"Markdown, MD single file (*.md; *.MD)": "*.md; *.MD",
			"Markdown, complete (*.md; *.MD)": "*.md; *.MD",
			"Markdown, MD with HTML (*.md; *.MD)": "*.md; *.MD",
			"Markdown, complete, with HTML (*.md; *.MD)": "*.md; *.MD",
			"Documents (*.xls)": "*.xls",
			"CSV (*.csv)": "*.csv",
		}
		
		for(let idx in filters)
		{
			fp.appendFilter(idx, filters[idx]);
		}
		
		fp.defaultExtension=Zotero.ZeNotes.Prefs.get("export-default-ext", "html");
		fp.filterIndex = Zotero.ZeNotes.Prefs.get("export-default-filter-index", 0);
		fp.init(window, "Save to file", nsIFilePicker.modeSave);
		fp.open(result=>{
			if (result == fp.returnOK || result == fp.returnReplace) {
				let ext = filters[Object.keys(filters)[fp.filterIndex]].split(";")[0].replace("*.", "");
				var mode1 = "";
				var mode2 = "";
				let mode = Object.keys(filters)[fp.filterIndex].replace(/\(.*\)/, "").split(/[\,\(]/);

				if(mode.length==2 && mode[1])
				{
					mode1 = mode[1].trim();
				}
				else if(mode.length==3 && mode[2])
				{
					mode1 = mode[1].trim();
					mode2 = mode[2].trim();
				}
				
				Zotero.ZeNotes.Prefs.set("export-default-ext", ext);
				Zotero.ZeNotes.Prefs.set("export-default-filter-index", fp.filterIndex);
				var table = document.getElementById("notes-table");
				
				
				if(mode1=="complete" || ext.toUpperCase()=="XLS" || ext.toUpperCase()=="CSV")
				{
					table = this.createfiles(fp, table, ext);
				}
				
				if(fp.file.exists())
				{
					fp.file.remove(true);
				}
				
				if(ext.toUpperCase()=="MD")
				{
					let markdown = "";
					if(mode1.includes("HTML") || mode2.includes("HTML"))
					{
						markdown = Io.turndownServiceFull.turndown(table.outerHTML).replace(/https\:\/\/zotero\//g, "zotero://");
					}
					else
					{
						markdown = Io.turndownServiceMin.turndown(table.outerHTML).replace(/https\:\/\/zotero\//g, "zotero://");
					}
					Zotero.File.putContentsAsync(fp.file, markdown);
				}
				else if(ext.toUpperCase()=="HTML")
				{
					Zotero.File.putContentsAsync(fp.file, table.outerHTML);
				}
				else if(ext.toUpperCase()=="DOC")
				{
					var html = table.outerHTML;
					var style = "<style>";
					style+= "th, td{white-space: pre-wrap;    white-space: -moz-pre-wrap;    white-space: -pre-wrap;    white-space: -o-pre-wrap;    word-wrap: break-word;border: solid 1px; vertical-align: top;padding:0.5em;padding-bottom: 1em;} table{table-layout: fixed; padding:0.5em;border-spacing: 0; border-collapse: collapse; border: solid 1px; width: 100%;}";
					style += "</style>";
					
					html = "<meta http-equiv=Content-Type content='text/html; charset=utf-8'><html><head>"+style+"</head><body>"+html+"</body></html>"
					html = html.replace(/(background-color:#.{6})(.{2});\"/g, "$1;\"");
					Zotero.File.putContentsAsync(fp.file, html);
				}
				else if(ext.toUpperCase()=="XLS")
				{
					var template = '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40"><head><!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet><x:Name>{worksheet}</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions></x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]--><meta http-equiv="content-type" content="text/plain; charset=UTF-8"/></head><body><table>{table}</table></body></html>';
					var base64 = function(s) { 
						return window.btoa(unescape(encodeURIComponent(s))) 
					}
					var format = function(s, c) { 
						return s.replace(/{(\w+)}/g, function(m, p) { return c[p]; }) 
					}
					var ctx = {worksheet:"data" || 'Worksheet', table:table.outerHTML};
					xls = format(template, ctx);
					Zotero.File.putContentsAsync(fp.file, xls);
				}
				else if(ext.toUpperCase()=="CSV")
				{
					var rows = table.querySelectorAll('tr');
					var csv = [];
					var separator = ",";
					for (var i = 0; i < rows.length; i++) {
						var row = [], cols = rows[i].querySelectorAll('td, th');
						for (var j = 0; j < cols.length; j++) {
							var data = cols[j].innerText.replace(/(\r\n|\n|\r)/gm, '').replace(/(\s\s)/gm, ' ')
							data = data.replace(/"/g, '""');
							row.push('"' + data + '"');
						}
						csv.push(row.join(separator));
					}
					var csv_string = csv.join('\n');
					Zotero.File.putContentsAsync(fp.file, csv_string);
				}
			}
		})
	},
	
	createfiles(fp, table, fext="MD")
	{
		var folder = fp.file.parent.clone();
		var filename = fp.file.leafName;
		var foldername = filename.substring(0, filename.lastIndexOf('.'))+"_files";
		folder.append(foldername);
		if(!folder.exists())
		{
			folder.create(Components.interfaces.nsIFile.DIRECTORY_TYPE, FileUtils.PERMS_DIRECTORY);
		}
		
		var i = 1;
		table = table.cloneNode(true);
		table.querySelectorAll("img").forEach(img=>{
			let fileparts = img.src.split(',');
			let ext = fileparts[0].replace("data:image/", "").replace(";base64", "");
			let base64 = fileparts[1];
			let filename = foldername+"_"+String(i).padStart(3, '0')+"."+ext;
			let src = foldername+"/"+filename;
			let imagefile = folder.clone();
			imagefile.append(filename);
			this.savebinary(imagefile, img.src);
			img.src = src.split(" ").join("%20");
			
			if(fext.toUpperCase()=="CSV")
			{
				let node = document.createTextNode(", image: "+src.split(" ").join("%20")+", ");
				img.parentNode.insertBefore(node, img);
			}
		});
		
		if(fext.toUpperCase()=="HTML")
		{
			var stylefile = folder.clone();
			stylefile.append("styles.css");
			this.savebinary(stylefile, "chrome://ze-notes/content/notes/notes.css");
			
			var html = document.createElement("html");
			var head = document.createElement("head");
			var title = document.createElement("title");
			var body = document.createElement("body");
			body.style = "width:100%;overflow:auto!important;";
			
			var style = document.createElement("link");
			style.href  = foldername+"/styles.css";
			style.rel = "stylesheet";
			title.innerText = foldername;
			html.appendChild(head);
			html.appendChild(body);
			head.appendChild(title);
			head.appendChild(style);
			body.appendChild(table);
			return html;
		}
		return table;
	},
	
	initmd()
	{
		Io.turndownServiceFull = new TurndownService();
		Io.turndownPluginGfm.tables(Io.turndownServiceFull);
		
		Io.turndownServiceFull.keep(['div', 'hr', 'br', 'a', 'img']);
		Io.turndownServiceFull.addRule('divs', {
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
		
		Io.turndownServiceFull.addRule('spans', {
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
		
		Io.turndownServiceFull.addRule('hrs', {
		filter: ['hr'],
			replacement: function (content, node) {
				return "---";
			}
		});
		
		Io.turndownServiceMin = new TurndownService();
		Io.turndownPluginGfm.tables(Io.turndownServiceMin);
		
		Io.turndownServiceMin.keep(['br']);
		Io.turndownServiceMin.addRule('links', {
		  filter: ['a'],
		  replacement: function (content, node) {
			return "["+content+"]("+node.href+")";
		  }
		});
		
		Io.turndownServiceMin.addRule('divs', {
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
		
		Io.turndownServiceMin.addRule('hrs', {
		filter: ['hr'],
			replacement: function (content, node) {
				return "---";
			}
		});
	},
	
	download(type, options=[])
    {
        
        if(type=="doc" || type=="html" || type=="fullhtml")
        {
            var table = document.getElementById("notes-table");
            this.exporthtml(table, type);
        }
        else if(type=="csv")
        {
            var table = document.getElementById("notes-table");
            this.exportcsv(table);
        }
        else if(type=="markdown")
        {
            var table = document.getElementById("notes-table");
            this.exportmarkdown(table, options);
        }
        else
        {
            var data = document.getElementById("notes-table").outerHTML;
            this.exportxls(data);
        }
    },
	
	savebinary(file, url)
	{
		fetch(url)
		.then(res => res.blob())
		.then(blob=>{
			Zotero.File.putContentsAsync(file, blob);
		});
	},
	
	fullexport(table, filter, extension, formatter)
	{
		var nsIFilePicker = Components.interfaces.nsIFilePicker;
        var fp =Components.classes["@mozilla.org/filepicker;1"].createInstance(nsIFilePicker);
		fp.defaultString = "ZeNotes - "+Io.currentCollection+"."+extension;
		fp.appendFilter(...filter);
		fp.defaultExtension=extension;
		fp.init(window, "Save to file", nsIFilePicker.modeSave);
		fp.open(result=>{
			if (result == fp.returnOK || result == fp.returnReplace) {
				var folder = fp.file.parent.clone();
				var filename = fp.file.leafName;
				var foldername = filename.substring(0, filename.lastIndexOf('.'))+"_files";
				folder.append(foldername);
				if(!folder.exists())
				{
					folder.create(Components.interfaces.nsIFile.DIRECTORY_TYPE, FileUtils.PERMS_DIRECTORY);
				}
				
				var i = 1;
				table = table.cloneNode(true);
				
				table.querySelectorAll("img").forEach(img=>{
					let fileparts = img.src.split(',');
					let ext = fileparts[0].replace("data:image/", "").replace(";base64", "");
					let base64 = fileparts[1];
					let filename = foldername+"_"+String(i).padStart(3, '0')+"."+ext;
					let src = foldername+"/"+filename;
					let imagefile = folder.clone();
					imagefile.append(filename);
					this.savebinary(imagefile, img.src);
					img.src = src.split(" ").join("%20");
				});
				
				if(fp.file.exists())
				{
					fp.file.remove(true);
				}
				Zotero.File.putContentsAsync(fp.file, formatter(table));
			}
		})
	},
	
	formathtml(table)
	{
		return table.outerHTML;
	},
	
	formatmd(table, options)
	{
		if(options.includes("html"))
		{
			let markdown = Io.turndownServiceFull.turndown(table.outerHTML).replace(/https\:\/\/zotero\//g, "zotero://");
			return markdown;
		}
		else
		{
			let markdown = Io.turndownServiceMin.turndown(this.cleantable(table, options)).replace(/https\:\/\/zotero\//g, "zotero://");
			return markdown;
		}
	},
	
	fullmarkdown(table, options)
	{
		this.fullexport(
			table, 
			["Markdown (*.md; *.MD)", "*.md; *.MD"], 
			"MD", 
			function(t){return Io.formatmd(t, options)}
		)
	},
	
	fullhtml(table)
	{
		this.fullexport(
			table, 
			["Web page (*.html; *.htm)", "*.html; *.htm"], 
			"html", 
			this.formathtml
		)
	},

	exporthtml(table, type)
    {
		if(type=="fullhtml")
		{
			table = Io.fullhtml(table);
			return;
		}
		
		html = table.outerHTML;
        var style = "<style>";
        style += "th, td{white-space: pre-wrap;    white-space: -moz-pre-wrap;    white-space: -pre-wrap;    white-space: -o-pre-wrap;    word-wrap: break-word;border: solid 1px; vertical-align: top;padding:0.5em;padding-bottom: 1em;} table{table-layout: fixed; padding:0.5em;border-spacing: 0; border-collapse: collapse; border: solid 1px; width: 100%;}";
        style += "</style>";
        
        html = "<meta http-equiv=Content-Type content='text/html; charset=utf-8'><html><head>"+style+"</head><body>"+html+"</body></html>"
        
        var nsIFilePicker = Components.interfaces.nsIFilePicker;
        var fp =Components.classes["@mozilla.org/filepicker;1"].createInstance(nsIFilePicker);
        
        /**
            Parent window 
            window
        */
        
        fp.init(window, "Save to file", nsIFilePicker.modeSave);
        if(type=="doc")
        {
            fp.defaultString = "ZeNotes - "+Io.currentCollection+".doc";
            fp.appendFilter("Documents (*.doc)", "*.doc");
            fp.defaultExtension="doc";
			
			/**
			clean HTML
			*/
			html = html.replace(/(background-color:#.{6})(.{2});\"/g, "$1;\"");
			
        }
		
        else if(type=="html")
        {
            fp.defaultString = "ZeNotes - "+Io.currentCollection+".html";
            fp.appendFilter("Web page (*.html; *.htm)", "*.html; *.htm");
            fp.defaultExtension="html";
        }
     
        fp.open(function()
        {
            var outputStream = Components.classes["@mozilla.org/network/file-output-stream;1"].createInstance( Components.interfaces.nsIFileOutputStream);
            outputStream.init(fp.file, 0x04 | 0x08 | 0x20, 420, 0 );
            var converter = Components.classes["@mozilla.org/intl/converter-output-stream;1"].createInstance(Components.interfaces.nsIConverterOutputStream);
            converter.init(outputStream, "UTF-8", 0, 0);
            converter.writeString(html);
            converter.close();
            outputStream.close();
        });
    },
	
	cleantable(table, options=[])
    {
        var newtable = table.cloneNode(true);
        var children = newtable.querySelectorAll("td");
        children.forEach(td=>{
            var data = "";
            td.childNodes.forEach(c=>{
                var value = "";
                if(c.innerText!=undefined)
                {
                    if(c.tagName=="DIV")
                    {
                        if(options.includes("style"))
                        {
                            if(options.includes("link-icon"))
                            {
                                value = "<div style='"+c.style.cssText+"'>"+c.innerText+" <a href='https://zotero/open-pdf/library/items/"+c.dataset.attachmentkey+"?annotation="+c.dataset.annotationkey+"'>&#128279;</a></div><br/>";
                            }
                            else
                            {
                                value = "<div style='"+c.style.cssText+"'><a href='https://zotero/open-pdf/library/items/"+c.dataset.attachmentkey+"?annotation="+c.dataset.annotationkey+"'>"+c.innerText+"</a></div><br/>";
                            }
                        }
                        else
                        {
                            if(options.includes("link-icon"))
                            {
                                value = "<div>"+c.innerText+" <a href='https://zotero/open-pdf/library/items/"+c.dataset.attachmentkey+"?annotation="+c.dataset.annotationkey+"'>&#128279;</a></div><br/>";
                            }
                            else
                            {
                                value = "<div><a href='https://zotero/open-pdf/library/items/"+c.dataset.attachmentkey+"?annotation="+c.dataset.annotationkey+"'>"+c.innerText+"</a></div><br/>";
                            }
                        }
                    }
                    else
                    {
                        value = c.innerText;
                    }
                }
                else if(c.textContent!=undefined)
                {
                    value = c.textContent;
                }
                data+=value;
            });
            td.innerHTML = data;
        });
        return newtable;
    },
	
	markdown(table, options=[])
    {
		Io.turndownPluginGfm.tables(Io.turndownService);
        var markdown = "";
        if(options.includes("html"))
        {
            Io.turndownService.keep(['div', 'hr', 'br', 'a', 'img']);
            Io.turndownService.addRule('divs', {
              filter: ['div'],
              replacement: function (content, node) {
                return "<div style='"+node.style.cssText+"'>"+content+"</div><br/>";
              }
            });
        }
        else
        {
            Io.turndownService.keep(['br']);
            Io.turndownService.addRule('links', {
              filter: ['a'],
              replacement: function (content, node) {
                return "["+content+"]("+node.href+")";
              }
            });
            Io.turndownService.addRule('divs', {
              filter: ['div', 'hr'],
              replacement: function (content, node) {
                return " <br/>**"+content+"**<br/><br/>";
              }
            });
        }
		
        markdown = Io.turndownService.turndown(this.cleantable(table, options)).replace(/https\:\/\/zotero\//g, "zotero://");
		return markdown
    },
    
    exportmarkdown(table, options=[])
    {
        if(options.includes("full"))
		{
			this.fullmarkdown(table, options);
			return;
		}
		
		var markdown = this.markdown(table, options)
        var nsIFilePicker = Components.interfaces.nsIFilePicker;
        var fp =Components.classes["@mozilla.org/filepicker;1"].createInstance(nsIFilePicker);
        
        fp.defaultString = "ZeNotes - "+Io.currentCollection+".md";
        fp.init(window, "Save to file", nsIFilePicker.modeSave);
        fp.appendFilter("Markdown (*.md; *.MD)", "*.md; *.MD");
        fp.defaultExtension="MD";
        
        fp.open(function()
        {
            var outputStream = Components.classes["@mozilla.org/network/file-output-stream;1"].createInstance( Components.interfaces.nsIFileOutputStream);
            outputStream.init(fp.file, 0x04 | 0x08 | 0x20, 420, 0 );
            var converter = Components.classes["@mozilla.org/intl/converter-output-stream;1"].createInstance(Components.interfaces.nsIConverterOutputStream);
            converter.init(outputStream, "UTF-8", 0, 0);
            converter.writeString(markdown);
            converter.close();
            outputStream.close();
        });
    },
    
    exportcsv(table)
    {
        var rows = table.querySelectorAll('tr');
        var csv = [];
        var separator = ",";
        for (var i = 0; i < rows.length; i++) {
            var row = [], cols = rows[i].querySelectorAll('td, th');
            for (var j = 0; j < cols.length; j++) {
                var data = cols[j].innerText.replace(/(\r\n|\n|\r)/gm, '').replace(/(\s\s)/gm, ' ')
                data = data.replace(/"/g, '""');
                row.push('"' + data + '"');
            }
            csv.push(row.join(separator));
        }
        var csv_string = csv.join('\n');
        
        var nsIFilePicker = Components.interfaces.nsIFilePicker;
        var fp =Components.classes["@mozilla.org/filepicker;1"].createInstance(nsIFilePicker);
        
        fp.defaultString = "ZeNotes - "+Io.currentCollection+".csv";
        fp.init(window, "Save to file", nsIFilePicker.modeSave);
        fp.appendFilter("CSV (*.csv; *.txt)", "*.csv; *.txt");
        fp.defaultExtension="csv";
        
        fp.open(function()
        {
            var outputStream = Components.classes["@mozilla.org/network/file-output-stream;1"].createInstance( Components.interfaces.nsIFileOutputStream);
            outputStream.init(fp.file, 0x04 | 0x08 | 0x20, 420, 0 );
            var converter = Components.classes["@mozilla.org/intl/converter-output-stream;1"].createInstance(Components.interfaces.nsIConverterOutputStream);
            converter.init(outputStream, "UTF-8", 0, 0);
            converter.writeString(csv_string);
            converter.close();
            outputStream.close();
        });
        
    },
        
    exportxls(xls)
    {
        var uri = 'data:application/vnd.ms-excel;base64,';
        var template = '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40"><head><!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet><x:Name>{worksheet}</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions></x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]--><meta http-equiv="content-type" content="text/plain; charset=UTF-8"/></head><body><table>{table}</table></body></html>';
        var base64 = function(s) { 
            return window.btoa(unescape(encodeURIComponent(s))) 
        }
        var format = function(s, c) { 
            return s.replace(/{(\w+)}/g, function(m, p) { return c[p]; }) 
        }
        var ctx = {worksheet: "data" || 'Worksheet', table: xls}
        // xls = base64(format(template, ctx))
        xls = format(template, ctx)
        
        var nsIFilePicker = Components.interfaces.nsIFilePicker;
        var fp =Components.classes["@mozilla.org/filepicker;1"].createInstance(nsIFilePicker);
        
        fp.defaultString = "ZeNotes - "+Io.currentCollection+".xls";
        fp.init(window, "Save to file", nsIFilePicker.modeSave);
        fp.appendFilter("Documents (*.xls)", "*.xls");
        fp.appendFilter("Web page (*.csv)", "*.csv");
        fp.defaultExtension="xls";

        fp.open(function()
        {
            var outputStream = Components.classes["@mozilla.org/network/file-output-stream;1"].createInstance( Components.interfaces.nsIFileOutputStream);
            outputStream.init(fp.file, 0x04 | 0x08 | 0x20, 420, 0);
            var converter = Components.classes["@mozilla.org/intl/converter-output-stream;1"].createInstance(Components.interfaces.nsIConverterOutputStream);
            converter.init(outputStream, "UTF-8", 0, 0);
            converter.writeString(xls);
            converter.close();
            outputStream.close();
        });
    }
}

window.addEventListener("load", function(){
	Io.init();
})