function update() {
	zipfolder = function (foldername, callback)
	{
		let zipFilePath = Zotero.File.pathToFile(Zotero.getTempDirectory().path+"\\zenotes-export.zip").path;
		
		Zotero.File.zipDirectory(foldername, zipFilePath).then(r=>{
			callback(zipFilePath);
		});
	}
	
	unzip = async function(filename_, destfolder, startcb, loadcb, endcb) {
		startcb();
		const unzipper = new fflate.Unzip();
		unzipper.register(fflate.AsyncUnzipInflate);
		
		let totalFiles = 0;
		let processedFiles = 0;
		
		unzipper.onfile = file => {
			totalFiles++; 
			let fileData = []; 
			file.ondata = async (err, dat, final) => {
				if (err) {
					Zotero.log("Error reading file: " + err);
					return;
				}
				fileData.push(dat);
				if (final) {
					const completeData = new Uint8Array(fileData.reduce((acc, chunk) => acc + chunk.length, 0));
					let offset = 0;
					fileData.forEach(chunk => {
						completeData.set(chunk, offset);
						offset += chunk.length;
					});
				
				
					let absolutepath = destfolder+"\\"+file.name;
					
					loadcb("Writing "+file.name+" ... ");
					
					if (!/\.[^/.]+$/.test(file.name)) 
					{
						Zotero.File.createDirectoryIfMissing(absolutepath);
					}
					else
					{
						let containingFolderPath = absolutepath.substring(0, absolutepath.lastIndexOf('\\'));
						Zotero.File.createDirectoryIfMissing(containingFolderPath);
					}
					// var Blob = Zotero.getMainWindow().Blob;
					const blobData = new Blob([completeData]);
					await Zotero.File.putContentsAsync(absolutepath, blobData);
					processedFiles++;
					
					if (processedFiles === totalFiles) {
						endcb();
					}
				}
			};
			Zotero.log('Reading:'+file.name);
			file.start();
		}
		Zotero.HTTP.request("GET", "file:///" + filename_, { responseType: 'blob' }).then(async xhr=>{
			let arraybuffer = null;
			try {
				arrayBuffer = await xhr.response.arrayBuffer();
			}
			catch(e)
			{
				arrayBuffer = await new Response(xhr.response).arrayBuffer();
			}
			const uint8Array = new Uint8Array(arrayBuffer);
			unzipper.push(uint8Array, true);
		})
	}

	download = function(callback)
	{
		Zotero_File_Interface.Progress.show("Downloading from Dropbox ... ");
		var username = Zotero.Prefs.get("extensions.zotero.sync.server.username", true);		
		var activecollection = Zotero.getActiveZoteroPane().getSelectedCollection().name;
		var outfile = Zotero.File.pathToFile(Zotero.getTempDirectory().path+"\\zenotes-import.zip").path;
		var destfilename = Zotero.File.pathToFile(Zotero.getTempDirectory().path+"\\zenotes-import").path;
		Dropbox.init().then(token=> {
			return Dropbox.download(activecollection+".zip", function(data, hash){
				Zotero.File.putContentsAsync(outfile, data).then(e=>{
					unzip(outfile, destfilename, 
						function(){Zotero_File_Interface.Progress.show("Unzipping file ...");},
						function(m){Zotero_File_Interface.Progress.show(m);},
						function(){
							Zotero_File_Interface.Progress.close();
							callback(destfilename+"\\zenotes-export.rdf", hash);
						},
					);
				})
			});
		});
	}
	
	upload = function(contents, callback)
	{
		var target = Zotero.ZeNotes.Prefs.get('dropbox-target-user', 'allusers');
		var filename = Zotero.getActiveZoteroPane().getSelectedCollection().name;
		Dropbox.init().then(token=>{
			var fn = "/"+target+"/"+filename+".zip";
			Dropbox.upload(fn, contents, callback);
		})
	}
	
	delay = function(ms)
	{
		return new Promise(resolve => setTimeout(resolve, ms));
	}
	
	Zotero_File_Exporter.prototype.autosave = async function () {
		var translation = new Zotero.Translate.Export();
		
		// Use static Zotero RDF translator
		let zoteroRDFTranslatorID = '14763d24-8ba0-45df-8f52-b8d1108e7ac9'; // Zotero RDF translator ID
		let selectedTranslator = (await translation.getTranslators()).find(
			translator => translator.translatorID === zoteroRDFTranslatorID
		);

		if (!selectedTranslator) 
		{
			throw new Error('Zotero RDF translator not found');
		}

		// Ensure export is always for a collection
		if (!this.collection) {
			throw new Error('No collection specified for export');
		}

		// Set the collection for translation
		translation.setCollection(this.collection);
		
		// Define static file path and location
		let filePath = Zotero.File.pathToFile(Zotero.getTempDirectory().path+"\\zenotes-export").path;
		
		translation.setLocation(Zotero.File.pathToFile(filePath));
		
		// Set the selected Zotero RDF translator
		translation.setTranslator(selectedTranslator);

		// Display options to include notes, annotations, and attachments
		let displayOptions = {
			exportNotes: true,           // Export all notes (includes annotations)
			exportFileData: true,        // Export all attachments (e.g., PDFs, images)
			includeAnnotations: true     // If using Zotero's built-in annotations on PDFs
		};
		translation.setDisplayOptions(displayOptions);
		
		
		async function _exportDone(obj, worked) {
			// Close the items exported indicator
			
			Zotero_File_Interface.Progress.close();
			if (!worked) {
				Zotero.alert(
					null,
					Zotero.getString('general.error'),
					Zotero.getString('fileInterface.exportError')
				);
				Zotero_File_Interface.Progress.close();
				return;
			}
		}
		
		// Handlers for progress and completion
		translation.setHandler("itemDone", function () {
			Zotero.updateZoteroPaneProgressMeter(translation.getProgress());
		});
		
		translation.setHandler("done",  _exportDone);

		// Show the progress bar before starting the export
		Zotero_File_Interface.Progress.show(Zotero.getString("fileInterface.itemsExported"));
		
		// Start the translation/export process
		/** Premature due to this issue 
			https://github.com/zotero/zotero/issues/2816
		*/
		await translation.translate().then(e=>{
			Zotero_File_Interface.Progress.show("Waiting for export to finish ...");
			const interval = 1000;
			let msperfile = Zotero.ZeNotes.Prefs.get('dropbox-ms-per-file', 1000);
			let filecount = Zotero.ZeNotes.Data.attachmentcount();
			let time = (filecount+1) * msperfile; // 650 = 39 secondes for 62 attachments
			
			const startTime = Date.now();
			const timer = setInterval(() => {
				let timeleft = Math.round((time - (Date.now() - startTime))/1000);
				Zotero_File_Interface.Progress.show(`Waiting for export to finish: ${timeleft} s`);
			}, interval);
	
			delay(time).then(()=>{
				clearInterval(timer);
				Zotero_File_Interface.Progress.show("Zipping folder ... ");
				zipfolder(filePath, function(zipfilename){
					Zotero.HTTP.request("GET", "file:///"+zipfilename, {responseType: 'arraybuffer'}).then(xhr=>{
						Zotero_File_Interface.Progress.show("Uploading the file ... ");
						upload(xhr.response, function(){
							Zotero_File_Interface.Progress.close();
						});
					});
				});
			});
		});
		return filePath;
	};
}


NSync = {
	export()
	{	
		var zp = Zotero.getActiveZoteroPane();
		var collection = zp.getSelectedCollection();
		if(!collection)
		{
			alert("You can only export a collection!");
			return;
		}
		if(collection.getChildItems().length<=0)
		{
			alert("You cannot export an empty collection!");
			return;
		}
		
		if(!Zotero_File_Exporter.prototype.autosave) {
			update();
		}
		var exporter = new Zotero_File_Exporter();
		if(collection) {
			exporter.name = collection.getName();
			exporter.collection = collection;
		} else {
			// find sorted items
			exporter.items = zp.getSortedItems();
			if(!exporter.items) throw ("No items to save");
			
			// find name
			var search = zp.getSelectedSavedSearch();
			if(search) {
				exporter.name = search.name;
			}
		}
		exporter.autosave();
	},
	
	async beforeimport(activecollection, hash)
	{
		Zotero_File_Interface.Progress.show("Importing all items to Zotero ...");
		Zotero.ZeNotes.DBPrefs.set("zenotes.nsync.collectionhash:"+activecollection, hash);
	},
	
	import()
	{
		var collection = Zotero.getActiveZoteroPane().getSelectedCollection();
		if(!collection)
		{
			alert("You can only import a collection!");
			return;
		}
		
		if(!Zotero_File_Exporter.prototype.autosave) 
		{
			update();
		}
		var activecollection = collection.name;
		var username = Zotero.Prefs.get("extensions.zotero.sync.server.username", true);
		Dropbox.init().then(token=>{
			Dropbox.list(username).then(async list=>{
				let dataexists = list.map(a=>{return a.name.replace(".zip", "")}).includes(activecollection);
				if(dataexists)
				{
					let current_hash = await Zotero.ZeNotes.DBPrefs.get("zenotes.nsync.collectionhash:"+activecollection);
					let file = list.filter(f => f.name === activecollection+".zip")[0];
									
					if(file.content_hash!=current_hash)
					{
						return download(async function(localfilename, hash){
							Zotero_File_Interface.Progress.show("Importing items to Zotero ...");
							return await Zotero_File_Interface.importFile({
								file: localfilename,
								recreateStructure: false,
								createNewCollection: false,
								addToLibraryRoot: false,
								linkFiles: false,
								onBeforeImport: async function(){return NSync.beforeimport(activecollection, hash)},
							}).then(e=>{
								NSync.annotations(e).then(transfered=>{
									if(transfered)
									{
										Zotero_File_Interface.Progress.close();
										alert("All items imported!");
									}
								})
							})
						});
					}
					else
					{
						if(confirm("You have already downloaded this file! Do you want to force download?"))
						{
							Zotero.ZeNotes.DBPrefs.set("zenotes.nsync.collectionhash:"+activecollection, "");
							NSync.import();
						};
					}
				}
				else
				{
					alert("You do not have data on \""+activecollection+"\" on the server!");
				}
			})
		});
		
	},
	
	async annotations(imported)
	{
		Zotero_File_Interface.Progress.show("Importing annotations from attachments ... ");
		if(!imported)
		{
			alert("Import faild! Try again!");
			return;
		}
		var collection = Zotero.getActiveZoteroPane().getSelectedCollection();
		var children = collection.getChildItems();
		for(child of children)
		{
			var attachments = child.getAttachments()
			for(itemid of attachments)
			{
				let attachment = Zotero.Items.get(itemid);
				if(attachment.isPDFAttachment)
				{
					try {
						Zotero_File_Interface.Progress.show("Importing annotations "+itemid+" ... ")
						let attachment = Zotero.Items.get(itemid)
						let transfer = true;
						let ispriority = true;
						let pw = "";
						await Zotero.PDFWorker.import(itemid, ispriority, pw, transfer);
					}
					catch(error)
					{
						Zotero.log("Error importing annotations: "+error);
					}
				}
				else
				{
					Zotero_File_Interface.Progress.show("File not PDF, skipping ... ");
				}
			}
		}
		return true;
	}
}