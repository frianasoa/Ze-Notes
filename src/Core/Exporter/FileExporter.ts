import Dropbox from '../Cloud/Dropbox'
import ZPrefs from '../ZPrefs'

const Zotero_File_Exporter = Zotero.getMainWindow().Zotero_File_Exporter;
const Zotero_File_Interface = Zotero.getMainWindow().Zotero_File_Interface;

const FileExporter = {
  progress: (Zotero_File_Interface as any).Progress,
  async autosave(collection: any, email: string): Promise<void> {
    if (typeof Zotero_File_Exporter === 'undefined') {
      throw 'Zotero_File_Exporter is not defined';
    }

    if(typeof Zotero_File_Exporter.prototype.autosave !== 'function') {
      Zotero_File_Exporter.prototype.autosave = async function () {
        await FileExporter.exportdata(collection, email);
      };
    }
    const exporter = new Zotero_File_Exporter();
    exporter.name = collection.getName();
    exporter.collection = collection;
    await exporter.autosave();
  },

  async delay(ms: number)
  {
    return new Promise((resolve: any) => setTimeout(resolve, ms));
  },

  async exportdone(obj: any, worked: boolean)
  {
    FileExporter.progress.close();
    if (!worked) {
      Zotero.alert(
        window,
        Zotero.getString('general.error'),
        Zotero.getString('fileInterface.exportError')
      );
    }
  },

  attachments(collection: any): number[]
  {
    FileExporter.progress.show("Getting attachments ...");
    let r:number[] = [];
    const items = collection.getChildItems(false, false);
    for(const item of items)
    {
      r = r.concat(item.getAttachments());
      FileExporter.progress.show("Getting attachment from "+item.title+"...");
    }

    for(const child of collection.getChildCollections())
    {
      r = r.concat(FileExporter.attachments(child));
    }
    FileExporter.progress.close();
    return r;
  },

  collectionsize(collection: any)
  {
    FileExporter.progress.show("Calculating collection size ...");
    let size = 0;
    const attachments = FileExporter.attachments(collection);
    const count = attachments.length;
    for(const att of attachments)
    {
      try {
        const s = (Zotero.Items.get(att) as any).getFile().fileSize;
        if(s)
        {
          size+=s;
        }
      }
      catch(e)
      {
      }
    }
    FileExporter.progress.close();
    return {sizeb: size, count};
  },

  processingtime(collection: any, exportspeedmbps: number)
  {
    const {sizeb, count} = FileExporter.collectionsize(collection);
    const size = sizeb/1000000;
    const time = size/exportspeedmbps;
    return {time, count, size};
  },

  async exportdata(collection: any, email: string)
  {
    const translation = new Zotero.Translate.Export();
    const zoteroRDFTranslatorID = '14763d24-8ba0-45df-8f52-b8d1108e7ac9';
    const translator = (await translation.getTranslators()).find(
			(t: any) => t.translatorID === zoteroRDFTranslatorID
		);

    if (!translator)
		{
			throw 'Zotero RDF translator not found';
		}
    translation.setCollection(collection);

    // use concat later
    const folderpath = Zotero.File.pathToFile(Zotero.getTempDirectory().path+"\\zenotes-export").path;

    translation.setLocation(Zotero.File.pathToFile(folderpath));

    translation.setTranslator(translator);

    let options = {
			exportNotes: true,           // Export all notes (includes annotations)
			exportFileData: true,        // Export all attachments (e.g., PDFs, images)
			includeAnnotations: true     // If using Zotero's built-in annotations on PDFs
		};

    translation.setDisplayOptions(options);

    translation.setHandler("itemDone", function () {
			Zotero.updateZoteroPaneProgressMeter(translation.getProgress());
		});

    translation.setHandler("done",  FileExporter.exportdone);
    FileExporter.progress.show(Zotero.getString("fileInterface.itemsExported"));

    await translation.translate();
    FileExporter.progress.show("Waiting for export to finish ...");
    const interval = 1000;
    const filecount = 4;
    const exportspeed = Number(ZPrefs.get("dropbox-mb-per-sec", 10));
    // const time = (filecount+1) * exportspeed;
    const {time, count, size} = FileExporter.processingtime(collection, exportspeed);

    const startTime = Date.now(); // in ms
    const timer = setInterval(() => {
      let timeElapsed = (Date.now() - startTime) / 1000; // convert to seconds
      let timeleft = Math.round(time - timeElapsed);
      FileExporter.progress.show(`Waiting for export to finish: ${timeleft} s`);
    }, interval);

    await FileExporter.delay(time*1000);
    clearInterval(timer);
    const zippath = Zotero.File.pathToFile(Zotero.getTempDirectory().path+"\\zenotes-export.zip").path;

    try {
      FileExporter.progress.show("Zipping directory ... ");
      await Zotero.File.zipDirectory(folderpath, zippath, {});
      const xhr = await Zotero.HTTP.request("GET", "file:///"+zippath, {responseType: 'arraybuffer'});

      FileExporter.progress.show("Uploading the file ... ");
      await Dropbox.upload("/"+email+"/"+collection.getName()+".zip", xhr.response);
      FileExporter.progress.close();
    }
    catch(e)
    {
      FileExporter.progress.close();
    }
  }
};

export default FileExporter;
