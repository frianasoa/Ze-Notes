const Ocr = {
	async imagepath(annotationid)
	{
		var annotation = Zotero.Items.get(annotationid);
		if(annotation.annotationType == "image") {
			var json = await Zotero.Annotations.toJSON(annotation);
			var url = json["image"];
			var response = await Zotero.ZeNotes.Io.fetchbinary(url);
			var filename = Zotero.ZeNotes.Io.randomfilename();
			var tempimage = Zotero.File.pathToFile(Zotero.getTempDirectory().path + "\\annotation-cache-"+filename+".png").path;
			await Zotero.File.putContentsAsync(tempimage, response);
			return tempimage;
		}
		else
		{
			throw new Error("Annotation type is not an image.");
		}
	},
	
	languagename()
	{
		var language = Zotero.ZeNotes.Prefs.get("tesseract-language", false);
		if(!language)
		{
			language = "eng";
		}
		if(Object.keys(this.langcodes).includes(language))
		{
			return this.langcodes[language];
		}
		if(language.includes("script/"))
		{
			language = language.replace("script/", "").replace("_", " ")+ " (script)"
		}
		
		return language;
	},
	
	async tesseract(annotationid) 
	{
		var lang = await Ocr.languages();
		var path = await Ocr.imagepath(annotationid);
		var language = Zotero.ZeNotes.Prefs.get("tesseract-language", false);
		if(!language)
		{
			language = "eng";
		}
		var params = [
			"-l",
			language
		];
		return Ocr.command(params, path);
	},
	
	async languages()
	{
		var entries = {};
		var sep = Zotero.ZeNotes.Os.sep();
		var tess = Zotero.ZeNotes.Os.tesseractfolder();
		
		if(!tess)
		{
			return entries;
		}
		
		var main = Zotero.ZeNotes.Os.listdir(tess+sep+"tessdata");
		
		main = main
			.filter(e => e.includes("traineddata")&&!e.includes("osd."))
			.map(f=>{
				return f.replace(".traineddata", "")
			});
		var scripts = Zotero.ZeNotes.Os.listdir(tess+sep+"tessdata"+sep+"script");
		scripts = scripts
			.filter(e => e.includes("traineddata")&&!e.includes("osd."))
			.map(f=>{
				return f.replace(".traineddata", "")
			});
		
		for(m of main)
		{
			entries[m] = Ocr.langcodes[m] || m;
		}
		for(s of scripts)
		{
			entries["script/"+s] = s.replace("_", " ")+" [Script]"
		}
		return entries;
	},
	
	async tesseract2(data, annotationid) {
		return new Promise(async (resolve, reject) => {
			try {
				var annotation = Zotero.Items.get(annotationid);
				var exe = Zotero.ZeNotes.Os.tesseractpath();
				if (annotation.annotationType == "image") {
					var json = await Zotero.Annotations.toJSON(annotation);
					var url = json["image"];
					var response = await Zotero.ZeNotes.Io.fetchbinary(url);

					var tempimage = Zotero.File.pathToFile(Zotero.getTempDirectory().path + "\\annotation-cache.png").path;
					var tempoutput = Zotero.File.pathToFile(Zotero.getTempDirectory().path + "\\annotation-cache").path;
					
					var params = [
						tempimage,
						tempoutput,
						"-l",
						"jpn",											
						"2>/dev/null",
						"1>/dev/null" 
					];
					await Zotero.File.putContentsAsync(tempimage, response);
					await Zotero.Utilities.Internal.exec(exe, params);
					var txt = await Zotero.File.getContentsAsync(tempoutput+".txt");
					txt = txt.split("\n\n").join("\n");
					txt = txt.split("  ").join(" ");
					resolve(txt);
				} else {
					reject("Annotation type is not an image.");
				}
			} catch (error) {
				reject(error);
			}
		});
	},
	
	command(params, filepath=null)
	{
		return new Promise(async (resolve, reject) => {
			try {
				var exe = Zotero.ZeNotes.Os.tesseractpath();
				var filename = Zotero.ZeNotes.Io.randomfilename();
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
				txt = txt.split("\n\n").join("\n");
				txt = txt.split("  ").join(" ");
				resolve(txt);
			} catch (error) {
				reject(error);
			}
		});
	},
	
	langcodes: {
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