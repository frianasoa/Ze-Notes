Io = {
	init()
	{
		this.turndownService = new TurndownService();
		this.turndownPluginGfm = TurndownPluginGfmService;
        var collection = Zotero.getActiveZoteroPane().getSelectedCollection();
        this.currentCollection = "All documents";
        if(collection)
        {
            this.currentCollection = collection.name;
        }
	},
	
	download(type, options=[])
    {
        
        if(type=="doc" || type=="html")
        {
            var data = document.getElementById("notes-table").outerHTML;
            this.exporthtml(data, type);
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
	
	exporthtml(html, type)
    {
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
                                value = "<div style='"+c.style.cssText+"'>"+c.innerText+" <a href='https://zotero/open-pdf/library/items/"+c.dataset.attachmentkey+"?annotation="+c.dataset.key+"'>&#128279;</a></div><br/>";
                            }
                            else
                            {
                                value = "<div style='"+c.style.cssText+"'><a href='https://zotero/open-pdf/library/items/"+c.dataset.attachmentkey+"?annotation="+c.dataset.key+"'>"+c.innerText+"</a></div><br/>";
                            }
                        }
                        else
                        {
                            if(options.includes("link-icon"))
                            {
                                value = "<div>"+c.innerText+" <a href='https://zotero/open-pdf/library/items/"+c.dataset.attachmentkey+"?annotation="+c.dataset.key+"'>&#128279;</a></div><br/>";
                            }
                            else
                            {
                                value = "<div><a href='https://zotero/open-pdf/library/items/"+c.dataset.attachmentkey+"?annotation="+c.dataset.key+"'>"+c.innerText+"</a></div><br/>";
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
            Io.turndownService.keep(['div', 'hr', 'br', 'a']);
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
            outputStream.init(fp.file, 0x04 | 0x08 | 0x20, 420, 0 );
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