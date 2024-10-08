Loader = {
	start()
	{
		if (Zotero.platformMajorVersion < 102)
		{
			this.load("io6.js", "Io");
		}
		else
		{
			this.load("format.js", "Format");
			this.load("io.js");
		}
	},
	
	load(url, object=null)
	{
		const script = document.createElement('script');
		script.src = url;
		if(object)
		{
			script.onload = () => {
				window[object].init();
			};
		}
		document.head.appendChild(script);
	}
}

window.addEventListener("load", function(){
	Loader.start();
})