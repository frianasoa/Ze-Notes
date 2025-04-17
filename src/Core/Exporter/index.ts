const { OS } = ChromeUtils.importESModule("chrome://zotero/content/osfile.mjs") as { OS: any };
const { FilePicker } = ChromeUtils.importESModule('chrome://zotero/content/modules/filePicker.mjs') as {FilePicker: any}

import Html from './Html';
import Xls from './Xls';
import Xlsx from './Xlsx';
import Docx from './Docx';
import Markdown from './Markdown';

type ExporterType = {
  Html: typeof Html;
  Xls: typeof Xls;
  Xlsx: typeof Xlsx;
  Docx: typeof Docx;
  Markdown: typeof Markdown;
  savefiles: (files: Map<string, Blob>, directory: string)=>void;
  start: (table: HTMLTableElement, filename: string, settings: Record<string, string>) => Promise<string | null>;
};

const Exporter: ExporterType = {
  Html,
  Xls,
  Xlsx,
  Docx,
  Markdown,
  async start(table: HTMLTableElement, filename: string, settings: Record<string, string>) {
    let data: any = "";
    let htmldata: any = "";
    let files = new Map<string, Blob>();
    const fp = new FilePicker();
    fp.init(window, "Export to", fp.modeSave);
    fp.appendFilter("HTML/XHTML", "*.html *.xhtml");
    fp.appendFilter("Markdown", "*.md");
    fp.appendFilter("Microsoft Excel Workbook", "*.xlsx");
    fp.appendFilter("Microsoft Excel 97-2003 Workbook", "*.xls");
    fp.appendFilter("Microsoft Word", "*.docx");

    fp.defaultString = filename+".html";
		const rv = await fp.show();

    let filepath = fp.file;
    filename = OS.Path.basename(filepath);
    const directory = filepath.replace(/\.[^/.]+$/, '');
    const ext = filename?.split(".")?.pop()?.toLowerCase();

    if(settings.createfolder === "true")
    {
      filepath = OS.Path.join(directory, filename);
    }

    if(ext=="html" || ext=="xhtml")
    {
      const toObject = false;
      ({htmldata, files} = await this.Html.start(table, fp.file, settings, toObject) as { htmldata: any; files: any});
      data = htmldata;
    }
    else if(ext=="xls")
    {
      const toObject = false;
      ({htmldata, files} =  await this.Html.start(table, fp.file, settings, toObject) as { htmldata: any; files: any});
      data = this.Xls.start(htmldata);
    }
    else if(ext=="xlsx")
    {
      const toObject = true;
      ({htmldata, files} =  await this.Html.start(table, fp.file, settings, toObject) as { htmldata: any; files: any});
      data = await this.Xlsx.start(htmldata);
    }
    else if(ext=="docx")
    {
      settings.createfolder = "false";
      const toObject = true;
      ({htmldata, files} =  await this.Html.start(table, fp.file, settings, toObject) as { htmldata: any; files: any});
      
      
      data = await this.Docx.start(htmldata);
       
    }
    else if (ext=="md")
    {
      const toObject = true;
      ({htmldata, files} = await this.Html.start(table, fp.file, settings, toObject) as { htmldata: any; files: any});
      data = await this.Markdown.start(htmldata);
    }
    else
    {
      window.alert("Extension is not supported: "+ext);
      return null;
    }

    return Zotero.File.putContentsAsync(filepath, data).then(()=>{
      if(settings.createfolder === "true")
      {
        Exporter.savefiles(files, directory);
      }
      return filepath;
    })
  },
  async savefiles(files: Map<string, Blob> , directory: string)
  {
    for(const [filename, filedata] of files)
    {
      await Zotero.File.putContentsAsync(OS.Path.join(directory, filename), filedata as unknown as nsIInputStream);
    }
  }
};

export default Exporter;
