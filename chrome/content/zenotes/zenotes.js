Components.utils.import("resource://gre/modules/Services.jsm");

var alert = function(message)
{
    Services.prompt.alert(null, znstr("general.alert.title"), message);
}

var znstr = function(name, params)
{
    return Zotero.ZeNotes.ZNStr(name, params);
}

Zotero.ZeNotes = new function()
{
    this.initdisplay = function()
    {
        this.addmenu();
    }
    
    this.tab = null;
    this.iframe = null;
    
    this.closetab = function()
    {
        Zotero_Tabs.close(this.tab.id);
    }
    
    this.reload = function()
    {
        if(this.iframe)
        {
            this.iframe.reload(true);
        }
    }
    
    /**
        Localization
        Code from ZotFile, originally from Zotero
    */
    this.ZNStr = function (name, params){
        var l10n = '';
		this.stringsBundle = Components.classes['@mozilla.org/intl/stringbundle;1']
			.getService(Components.interfaces.nsIStringBundleService)
			.createBundle('chrome://zenotes/locale/zenotes.properties');
		try {
			if (params !== undefined){
				if (typeof params != 'object'){
					params = [params];
				}
				l10n = this.stringsBundle.formatStringFromName(name, params, params.length);
			}
			else {
				l10n = this.stringsBundle.GetStringFromName(name);
			}
		}
		catch (e){
			throw ('Localized string not available for ' + name);
		}
		return l10n;
	}
    
    this.getPref = function(pref, default_value="") {
        var v = Zotero.Prefs.get('extensions.zenotes.' + pref, true);
        if(v==null)
        {
            return default_value;
        }
        return v;
    }
    
    this.setPref = function(pref, value) {        
        Zotero.Prefs.set('extensions.zenotes.' + pref, value, true);
    }
    
    this.openwindow = function(url, name, io)
    {
        window.openDialog(url, name, 'chrome,titlebar,toolbar,centerscreen,dialog,width:900,height:900' + Zotero.Prefs.get('browser.preferences.instantApply', true) ? 'dialog=no' : 'modal', io);
    }
    
    this.opentab = function(url, name, io)
    {
        var vm = this;
        var icon = "chrome://zenotes/skin/icon.png";
        if(vm.tab==null)
        {
            vm.tab = Zotero_Tabs.add({
                title: "Ze Notes - "+Zotero.ZeNotes.currentCollection(),
                data: {},
                iconBackgroundImage:"url(\""+icon+"\")",
                onClose: function(){vm.tab=null;}
            });
            vm.iframe = document.createElement("browser");
            vm.iframe.setAttribute("class", "reader");
            vm.iframe.setAttribute("flex", "1");
            vm.iframe.setAttribute("type", "content");
            vm.tab.container.appendChild(vm.iframe);
            
            /*Set icon: check this with Zotero update*/
            var index = Zotero_Tabs._getTab(vm.tab.id).tabIndex;
            Zotero_Tabs._tabs[index]["iconBackgroundImage"] = "url(\""+icon+"\")";
            vm.iframe.setAttribute("src", url);
        }
        else
        {
            var index = Zotero_Tabs._getTab(vm.tab.id).tabIndex;
            Zotero_Tabs._tabs[index]["title"] = "Ze Notes - "+Zotero.ZeNotes.currentCollection();
            vm.iframe.setAttribute("src", url);
            vm.iframe.reload(true);
        }
        
        Zotero_Tabs.select(vm.tab.id);
    }
    
    this.addmenu = function()
    {
        /** Main menu items*/
        var menu = document.createElement("menu");
        menu.setAttribute("label", "ZeNotes");
        menu.setAttribute("accesskey", "z");
        
        var menupopup = document.createElement("menupopup");
        menu.appendChild(menupopup)
        
        var menuitem_settings = document.createElement("menuitem");
        menuitem_settings.setAttribute("label", "Settings");
        menuitem_settings.className="menuitem-iconic";
        menuitem_settings.setAttribute("image", "chrome://zenotes/skin/zenotes-settings.png");
        menuitem_settings.addEventListener("command", this.opensettings);
        menuitem_settings.setAttribute("accesskey", "S");
        menupopup.appendChild(menuitem_settings);
        
        
        var menuitem_notes = document.createElement("menuitem");
        menuitem_notes.setAttribute("label", "Notes");
        menuitem_notes.className="menuitem-iconic";
        menuitem_notes.setAttribute("image", "chrome://zenotes/skin/zenotes-notes.png");
        menuitem_notes.addEventListener("command", this.opennotes);
        menuitem_notes.setAttribute("accesskey", "n");
        menupopup.appendChild(menuitem_notes);
        
        var elt = document.getElementById("main-menubar").childNodes[3];
        document.getElementById("main-menubar").insertBefore(menu, elt);
        
        /** collection menu items */
        var menuitem_notes_c = document.createElement("menuitem");
        menuitem_notes_c.setAttribute("label", "ZeNotes - My notes in collection");
        menuitem_notes_c.className="menuitem-iconic";
        menuitem_notes_c.setAttribute("image", "chrome://zenotes/skin/zenotes-notes.png");
        menuitem_notes_c.addEventListener("command", this.opennotes);
        menupopup.appendChild(menuitem_notes);
        document.getElementById("zotero-collectionmenu").appendChild(menuitem_notes_c);
    }
    
    this.opensettings = function()
    {
        var collection = ZoteroPane.getSelectedCollection();
        if(collection)
        {
            Zotero.ZeNotes.collection = collection.name;
        }
        else
        {
            Zotero.ZeNotes.collection = "All documents";
        }
        var url = "chrome://zenotes/content/settings.xul";
        var io = {collection: Zotero.ZeNotes.collection};
        var name = "settingswin"
        Zotero.ZeNotes.openwindow(url, name, io);
    }
    
    this.currentCollection = function()
    {
        var c = "All documents"
        var collection = ZoteroPane.getSelectedCollection();
        
        if(collection)
        {
            c = collection.name;
        }
        return c;
    }
    
    this.opennotes = function()
    {
        var collection = Zotero.ZeNotes.currentCollection();
        var url = "chrome://zenotes/content/notes.html";
        var io = {collection: collection};
        var name = "zenotes-notes";
        Zotero.ZeNotes.openfromdb=true;
        // Zotero.ZeNotes.openwindow(url, name, io);
        Zotero.ZeNotes.opentab(url, name, io);
    }

    this.download = function(type)
    {
        
        if(type=="doc" || type=="html")
        {
            var data = Zotero.ZeNotes.notewin.document.getElementById("notes-table").outerHTML;
            this.exporthtml(data, type);
        }
        else if(type=="csv")
        {
            var table = Zotero.ZeNotes.notewin.document.getElementById("notes-table");
            this.exportcsv(table);
        }
        else
        {
            var data = Zotero.ZeNotes.notewin.document.getElementById("notes-table").outerHTML;
            this.exportxls(data);
        }
    }
    
    this.exporthtml = function(html, type)
    {
        var style = "<style>";
        style += "th, td{white-space: pre-wrap;    white-space: -moz-pre-wrap;    white-space: -pre-wrap;    white-space: -o-pre-wrap;    word-wrap: break-word;border: solid 1px; vertical-align: top;padding:0.5em;padding-bottom: 1em;} table{table-layout: fixed; padding:0.5em;border-spacing: 0; border-collapse: collapse; border: solid 1px; width: 100%;}";
        style += "</style>";
        
        html = "<meta http-equiv=Content-Type content='text/html; charset=utf-8'><html><head>"+style+"</head><body>"+html+"</body></html>"
        
        var nsIFilePicker = Components.interfaces.nsIFilePicker;
        var fp =Components.classes["@mozilla.org/filepicker;1"].createInstance(nsIFilePicker);
        
        /**
            Parent window 
            Zotero.ZeNotes.notewin
        */
        
        fp.init(Zotero.ZeNotes.notewin, "Save to file", nsIFilePicker.modeSave);
        if(type=="doc")
        {
            fp.defaultString = "ZeNotes - "+Zotero.ZeNotes.currentCollection()+".doc";
            fp.appendFilter("Documents (*.doc)", "*.doc");
            fp.defaultExtension="doc";
        }
        else if(type=="html")
        {
            fp.defaultString = "ZeNotes - "+Zotero.ZeNotes.currentCollection()+".html";
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
    }
    
    this.exportcsv = function(table)
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
        
        fp.defaultString = "ZeNotes - "+Zotero.ZeNotes.currentCollection()+".csv";
        fp.init(Zotero.ZeNotes.notewin, "Save to file", nsIFilePicker.modeSave);
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
        
    }
        
    this.exportxls = function(xls)
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
        
        fp.defaultString = "ZeNotes - "+Zotero.ZeNotes.currentCollection()+".xls";
        fp.init(Zotero.ZeNotes.notewin, "Save to file", nsIFilePicker.modeSave);
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