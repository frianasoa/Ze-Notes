if(Zotero.platformMajorVersion>=102) 
{
	var { OS } = ChromeUtils.importESModule("chrome://zotero/content/osfile.mjs");
}
else
{
	var { OS } = ChromeUtils.import("resource://gre/modules/osfile.jsm");
}

var { FileUtils } = ChromeUtils.import("resource://gre/modules/FileUtils.jsm");

const Os = {
	paths: [
		// Windows paths
		"C:\\Program Files\\Tesseract-OCR\\tesseract.exe",
		"C:\\Program Files (x86)\\Tesseract-OCR\\tesseract.exe",
		"C:\\Tesseract-OCR\\tesseract.exe",
		
		// macOS paths
		"/opt/homebrew/bin/tesseract",
		"/usr/local/homebrew/bin/tesseract",
		
		// Linux paths
		"/usr/bin/tesseract",
		"/usr/local/bin/tesseract",
	],
	
	sep()
	{
		var tesspath = Os.tesseractpath();
		if(tesspath.includes("\\"))
		{
			return "\\";
		}
		else
		{
			return "/";
		}
	},
	
	tesseractfolder() 
	{
		const path = Os.tesseractpath();
		const sep = Os.sep();
		if (path) {
			return path.substring(0, path.lastIndexOf(sep));
		}
		return false;
	},
	
	tesseractpath()
	{
		for(path of Os.paths)
		{
			if(OS.File.exists(path))
			{
				return path;
			}
		}
		return false;
	},
	
	listdir(path)
	{
		let entries = [];
		try {
			let directory = new FileUtils.File(path); 
			let files = directory.directoryEntries;
			while (files.hasMoreElements()) {
			  let file = files.getNext();
			  file = file.QueryInterface(Ci.nsIFile);
			  entries.push(file.leafName);
			}
		} catch (e) {
			alert(e);
		}
		return entries;
	}
}