Io = {
	async savedialog(title, filter, extension, defaultstring, contents)
	{
		if(!FilePicker)
		{
			FilePicker = FilePicker6;
		}
		
		let fp = new FilePicker();
		fp.init(window, title, fp.modeSave);
		fp.appendFilter(filter, extension);
		fp.defaultString = defaultstring;
		var rv = await fp.show();
		if(rv == fp.returnOK || rv == fp.returnReplace) 
		{
			let outputFile = fp.file;
			Zotero.File.putContentsAsync(outputFile, contents);
		}
	},
	async loaddialog(title, filter, extension, defaultstring)
	{
		if(!FilePicker)
		{
			FilePicker = FilePicker6;
		}
		
		let fp = new FilePicker();
		fp.init(window, title, fp.modeOpen);
		fp.appendFilter(filter, extension);
		fp.defaultString = defaultstring;
		var rv = await fp.show();
		if(rv == fp.returnOK) 
		{
			let outputFile = fp.file;
			return await Zotero.File.getContentsAsync("file:///"+outputFile);
		}
	},
	fetchbinary6(url, type = "blob") {
		return new Promise((resolve, reject) => {
			Zotero.HTTP.request("GET", url, {
				responseType: "arraybuffer" // Handle binary data
			}).then(response => {
				try {
					if (type === "blob") {
						// Convert ArrayBuffer to Blob
						let blob = new Blob([response.response]);
						resolve(blob); // Resolve with the Blob
					} else if (type === "arraybuffer") {
						resolve(response.response); // Resolve with ArrayBuffer
					} else {
						reject(new Error(`Unsupported response type: ${type}`));
					}
				} catch (error) {
					reject(error);
				}
			}).catch(error => {
				reject(new Error(`Failed to fetch binary data: ${error}`));
			});
		});
	},

	fetchbinary(url, type="blob") {
		if((Zotero.platformMajorVersion<102))
		{
			return this.fetchbinary6(url, type);
		}
		
		return new Promise((resolve, reject) => {
			var xmlhttp = new XMLHttpRequest();
		 
			// Set the responseType to 'arraybuffer' to handle binary data
			xmlhttp.responseType = type;
			
			// Open the request asynchronously
			xmlhttp.open('GET', url, true);
			
			// Define the callback for when the request is complete
			xmlhttp.onload = function () {
				if (xmlhttp.status === 200) {
					var response = xmlhttp.response;
					resolve(response);  // Resolve the promise with the binary data
				} else {
					reject(new Error("Failed to load the image. Status: " + xmlhttp.status));
				}
			};

			// Handle errors
			xmlhttp.onerror = function () {
				reject(new Error("An error occurred during the request."));  // Reject on error
			};

			// Send the request
			xmlhttp.send();
		});
	},
	
	randomfilename()
	{
		const now = new Date();
		const timestamp = now.toISOString().replace(/[-:.TZ]/g, ''); // YYYYMMDDHHMMSSmmm
		const randomPart = Math.random().toString(36).substring(2, 10);
		return `${timestamp}-${randomPart}`;
	}
}
