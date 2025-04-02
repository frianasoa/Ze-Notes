const { OS } = ChromeUtils.importESModule("chrome://zotero/content/osfile.mjs") as { OS: any };
import ZPrefs from "../ZPrefs";

const Tessearct = {
  run(filename: string, lang="eng")
  {
    const params = ["-l", lang];
    Zotero.log(params);
    Zotero.log(filename);
    return this.command(params, filename);
  },
  
  async getexe() {
    const userpath = ZPrefs.get("tesseract-path", "");
    const paths = [
      // User path
      userpath,
      
      // Linux paths
      "/usr/bin/tesseract",
      "/usr/local/bin/tesseract",
      
      // Windows paths
      "C:\\Program Files\\Tesseract-OCR\\tesseract.exe",
      "C:\\Program Files (x86)\\Tesseract-OCR\\tesseract.exe",
      "C:\\Tesseract-OCR\\tesseract.exe",
      
      // macOS paths
      "/opt/homebrew/bin/tesseract",
      "/usr/local/homebrew/bin/tesseract",
    ];
    
    for(const p of paths)
		{
			try {
				var exists = await IOUtils.exists(p); 
				if(exists)
				{
          ZPrefs.set("tesseract-path", p);
					return p;
				}
			}
			catch(e)
			{
			}
		}
    return ""
  },
  
  async folder()
  {
    const exe = await this.getexe();
    return OS.Path.dirname(exe);
  },
  
  async languages()
  {
    let main = [];
    let scripts = [];
    const entries: Record<string, string> = {};
    const mainpath = PathUtils.join(await this.folder(), "tessdata");
    const scriptpath = PathUtils.join(mainpath, "script");
    
    const mainfiles = await IOUtils.getChildren(mainpath);
    const scriptfiles = await IOUtils.getChildren(scriptpath);
    
    for(let file of mainfiles)
    {
      main.push(PathUtils.filename(file));
    }
    main = main.filter(e => e.includes("traineddata")&&!e.includes("osd."))
    .map(f=>{
      return f.replace(".traineddata", "")
    });
    
    for(let file of scriptfiles)
    {
      scripts.push(PathUtils.filename(file));
    }
    scripts = scripts.filter(e => e.includes("traineddata")&&!e.includes("osd."))
    .map(f=>{
      return f.replace(".traineddata", "")
    });
    
    for(let m of main)
		{
			entries[m] = this.langcodes()[m] || m;
		}
    
    for(let s of scripts)
		{
			entries["script/"+s] = s.replace("_", " ")+" [Script]"
		} 
    return entries;
  },
  
  randomfilename()
	{
		const now = new Date();
		const timestamp = now.toISOString().replace(/[-:.TZ]/g, ''); // YYYYMMDDHHMMSSmmm
		const randomPart = Math.random().toString(36).substring(2, 10);
		return `${timestamp}-${randomPart}`;
	},
  
  async command(params: string[], filepath:string): Promise<string>
	{
		return new Promise(async (resolve, reject) => {
			try {
				const exe = await this.getexe();
				const filename = this.randomfilename();
				var tempoutput = Zotero.File.pathToFile(Zotero.getTempDirectory().path + "\\annotation-cache-"+filename).path;
				if(filepath!=null)
				{
					params = [filepath, tempoutput, ...params];
					tempoutput = tempoutput+".txt";
				}
				else
				{
					tempoutput = tempoutput+".txt";
					params = [...params];
				}
				
				var r = await Zotero.Utilities.Internal.exec(exe, params);
				
				var txt = await Zotero.File.getContentsAsync(tempoutput);
				txt = (txt as string).split("\n\n").join("\n");
				txt = txt.split("  ").join(" ");
				resolve(txt);
			} catch (error) {
				reject(error);
			}
		});
	},
  
  langname(code: string): string {
    let suffix = "";
    if(code.includes("script/"))
    {
      if(code.endsWith("_vert")){code = code.replace("_vert", "_vertical")}
      return code.replace("_", " ");
    }
    const codes = this.langcodes();
    return codes[code] || "";
  },
  
  langcodes():Record<string, string> {
    return {
      "afr": "Afrikaans",
      "amh": "Amharic",
      "ara": "Arabic",
      "asm": "Assamese",
      "aze": "Azerbaijani",
      "aze_cyrl": "Azerbaijani - Cyrilic",
      "bel": "Belarusian",
      "ben": "Bengali",
      "bod": "Tibetan",
      "bos": "Bosnian",
      "bre": "Breton",
      "bul": "Bulgarian",
      "cat": "Catalan; Valencian",
      "ceb": "Cebuano",
      "ces": "Czech",
      "chi_sim": "Chinese - Simplified",
      "chi_tra": "Chinese - Traditional",
      "chr": "Cherokee",
      "cos": "Corsican",
      "cym": "Welsh",
      "dan": "Danish",
      "dan_frak": "Danish - Fraktur (contrib)",
      "deu": "German",
      "deu_frak": "German - Fraktur (contrib)",
      "deu_latf": "German (Fraktur Latin)",
      "dzo": "Dzongkha",
      "ell": "Greek, Modern (1453-)",
      "eng": "English",
      "enm": "English, Middle (1100-1500)",
      "epo": "Esperanto",
      "equ": "Math / equation detection module",
      "est": "Estonian",
      "eus": "Basque",
      "fao": "Faroese",
      "fas": "Persian",
      "fil": "Filipino (old - Tagalog)",
      "fin": "Finnish",
      "fra": "French",
      "frk": "German - Fraktur (now deu_latf)",
      "frm": "French, Middle (ca.1400-1600)",
      "fry": "Western Frisian",
      "gla": "Scottish Gaelic",
      "gle": "Irish",
      "glg": "Galician",
      "grc": "Greek, Ancient (to 1453) (contrib)",
      "guj": "Gujarati",
      "hat": "Haitian; Haitian Creole",
      "heb": "Hebrew",
      "hin": "Hindi",
      "hrv": "Croatian",
      "hun": "Hungarian",
      "hye": "Armenian",
      "iku": "Inuktitut",
      "ind": "Indonesian",
      "isl": "Icelandic",
      "ita": "Italian",
      "ita_old": "Italian - Old",
      "jav": "Javanese",
      "jpn": "Japanese",
      "jpn_vert": "Japanese Vertical",
      "kan": "Kannada",
      "kat": "Georgian",
      "kat_old": "Georgian - Old",
      "kaz": "Kazakh",
      "khm": "Central Khmer",
      "kir": "Kirghiz; Kyrgyz",
      "kmr": "Kurmanji (Kurdish - Latin Script)",
      "kor": "Korean",
      "kor_vert": "Korean (vertical)",
      "kur": "Kurdish (Arabic Script)",
      "lao": "Lao",
      "lat": "Latin",
      "lav": "Latvian",
      "lit": "Lithuanian",
      "ltz": "Luxembourgish",
      "mal": "Malayalam",
      "mar": "Marathi",
      "mkd": "Macedonian",
      "mlt": "Maltese",
      "mon": "Mongolian",
      "mri": "Maori",
      "msa": "Malay",
      "mya": "Burmese",
      "nep": "Nepali",
      "nld": "Dutch; Flemish",
      "nor": "Norwegian",
      "oci": "Occitan (post 1500)",
      "ori": "Oriya",
      "osd": "Orientation and script detection module",
      "pan": "Panjabi; Punjabi",
      "pol": "Polish",
      "por": "Portuguese",
      "pus": "Pushto; Pashto",
      "que": "Quechua",
      "ron": "Romanian; Moldavian; Moldovan",
      "rus": "Russian",
      "san": "Sanskrit",
      "sin": "Sinhala; Sinhalese",
      "slk": "Slovak",
      "slk_frak": "Slovak - Fraktur (contrib)",
      "slv": "Slovenian",
      "snd": "Sindhi",
      "spa": "Spanish; Castilian",
      "spa_old": "Spanish; Castilian - Old",
      "sqi": "Albanian",
      "srp": "Serbian",
      "srp_latn": "Serbian - Latin",
      "sun": "Sundanese",
      "swa": "Swahili",
      "swe": "Swedish",
      "syr": "Syriac",
      "tam": "Tamil",
      "tat": "Tatar",
      "tel": "Telugu",
      "tgk": "Tajik",
      "tgl": "Tagalog (new - Filipino)",
      "tha": "Thai",
      "tir": "Tigrinya",
      "ton": "Tonga",
      "tur": "Turkish",
      "uig": "Uighur; Uyghur",
      "ukr": "Ukrainian",
      "urd": "Urdu",
      "uzb": "Uzbek",
      "uzb_cyrl": "Uzbek - Cyrilic",
      "vie": "Vietnamese",
      "yid": "Yiddish",
      "yor": "Yoruba"
    }
	}
}

export default Tessearct;