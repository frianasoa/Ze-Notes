var { OS } = ChromeUtils.importESModule("chrome://zotero/content/osfile.mjs");
var { FilePicker } = ChromeUtils.importESModule('chrome://zotero/content/modules/filePicker.mjs');

Io = {
	filters:{
		"Web page, HTML single file (*.html; *.htm)": "*.html; *.htm",
		"Web page, complete (*.html; *.htm)": "*.html; *.htm",
		"Markdown, MD single file (*.md; *.MD)": "*.md; *.MD",
		"Markdown, complete (*.md; *.MD)": "*.md; *.MD",
		"Markdown, MD with HTML (*.md; *.MD)": "*.md; *.MD",
		"Markdown, complete, with HTML (*.md; *.MD)": "*.md; *.MD",
		"CSV (*.csv)": "*.csv",
		"Document (*.doc)": "*.doc",
		"Excel workbook (*.xls)": "*.xls",
	},

	init()
	{
		this.currentCollection = "All documents";
		var collection = Zotero.getActiveZoteroPane().getSelectedCollection();
        if(collection)
        {
            this.currentCollection = collection.name;
        }
	},
	
	async export()
	{
		this.init();
		var title = "Export as ... ";
		var fp = new FilePicker();
		
		fp.init(window, title, fp.modeSave);
		
		fp.filterIndex = Zotero.ZeNotes.Prefs.get("export-default-filter-index", 0);
		fp.defaultExtension = Zotero.ZeNotes.Prefs.get("export-default-ext", "html");
		
		for(let idx in this.filters)
		{
			fp.appendFilter(idx, this.filters[idx]);
		}
		
		fp.defaultString = "ZeNotes - "+Io.currentCollection;
		
		var rv = await fp.show();
		if(rv == fp.returnOK || rv == fp.returnReplace) 
		{
			var typedesc = Object.keys(this.filters)[fp.filterIndex];
			var table = document.getElementById("notes-table").cloneNode(true);
			
			var parts = fp.file.split(".");
			let outputFile = fp.file;
			if(parts.length>1)
			{
				parts.pop();
			}
			var directory = parts.join(".");
			var dir_comp = OS.Path.split(directory).components;
			var foldername = dir_comp[dir_comp.length-1];			
			var contents = await Format.process(table, typedesc, foldername, function(files){
				Io.assets(directory, files);
			});
			
			Zotero.File.putContentsAsync(outputFile, contents);
			
			Zotero.ZeNotes.Prefs.set("export-default-filter-index", fp.filterIndex);
			Zotero.ZeNotes.Prefs.set("export-default-ext", fp.defaultExtension);
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
	
	assets(directory, files)
	{
		Zotero.File.createDirectoryIfMissingAsync(directory).then(()=>{
			files.forEach(file=>{
				try {
					Io.savebinary(OS.Path.join(directory, file.filename), file.data);
				}
				catch(e)
				{
					alert(e);
				}
			});
		});
	}
}