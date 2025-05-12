const { OS } = ChromeUtils.importESModule("chrome://zotero/content/osfile.mjs") as { OS: any };

const Zotero_File_Interface = Zotero.getMainWindow().Zotero_File_Interface as any;

import JSZip from 'jszip';

const Importer = {
  async unzip(zipPath: string, extractTo: string) {
    Zotero_File_Interface.Progress.show("Extracting files ...");
    const zipFile = Zotero.File.pathToFile(zipPath);
    const zipData = await Zotero.File.getBinaryContentsAsync(zipFile);
    const zip = await JSZip.loadAsync(zipData as any);
    for (const [relativePath, file] of Object.entries(zip.files)) {
      if (!file.dir) {
        const blob = await file.async("uint8array");
        const outputPath = OS.Path.join(extractTo, relativePath);

        await OS.File.makeDir(OS.Path.dirname(outputPath), { ignoreExisting: true });
        
        Zotero_File_Interface.Progress.show("Extracting "+relativePath+" ...");
        await OS.File.writeAtomic(outputPath, blob, { tmpPath: outputPath + ".tmp" });
      }
    }
    
    Zotero_File_Interface.Progress.close();
    return extractTo;
  },
  
  async activate(imported: boolean, collection: any = null)
  {
    if(!imported)
    {
      window.alert("Import failed. Please try again!");
      return;
    }
    Zotero_File_Interface.Progress.show("Refreshing annotations from attachments ... ");
    
    if(collection)
    {
      for(const child of collection.getChildCollections())
      {
        Importer.activate(imported, collection);
      }
    }
    else
    {
      collection = Zotero.getActiveZoteroPane().getSelectedCollection();
    }
    
    if(!collection)
    {
      window.alert("Please select a collection before importing!");
      return;
    }
    
    const children = collection.getChildItems();
    for(const child of children)
		{
      var attachments = child.getAttachments()
			for(const itemid of attachments)
			{
				let attachment = Zotero.Items.get(itemid);
        if(attachment.isPDFAttachment())
				{
          try {
						Zotero_File_Interface.Progress.show("Refreshing annotations "+itemid+" ... ")
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
      }
    }
  },
  
  write(folder: string)
  {
    const filename = folder+"\\zenotes-export.rdf";
    Zotero_File_Interface.importFile({
      file: filename,
      recreateStructure: true,
      createNewCollection: false,
      addToLibraryRoot: false,
      linkFiles: false,
      newItemsOnly: true,
      onBeforeImport: async function(){
        Zotero_File_Interface.Progress.show("Importing all items to Zotero ...");
      },
    } as any).then((imported: boolean)=>{
      Importer.activate(imported).then(()=>{
        Zotero_File_Interface.Progress.close();
        window.alert("Import complete!");
      })
    });
  },
  
  process(blob: Blob)
  {
    var outfile = Zotero.File.pathToFile(Zotero.getTempDirectory().path+"\\zenotes-import.zip").path;
    Zotero.File.putContentsAsync(outfile, blob as any).then(()=>{
      var destfolder = Zotero.File.pathToFile(Zotero.getTempDirectory().path+"\\zenotes-import").path;
      Importer.unzip(outfile, destfolder).then(()=>{
        Importer.write(destfolder);
      })
    })
  }
}

export default Importer;