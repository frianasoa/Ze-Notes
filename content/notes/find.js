Find = {
	init(){
        this.body = document.getElementById("zn-body");
		this.searchbox = document.getElementById("zn-search-box");
		this.searchbar = document.getElementById("zn-search-bar");
		this.statusbarmessage = document.getElementById("zn-status-bar-message");
		this.up = document.getElementById("zn-search-up");
		this.down = document.getElementById("zn-search-down");
		
		document.addEventListener("keypress", function(e)
		{
			if(e.keyCode == 13) {
				Find.find(Find.searchbox.value);
			}
		});
		
		this.searchbox.addEventListener("keydown", function(e){
			if(e.keyCode==13)
            {
                Find.body.focus();
            }
		});
		
		this.searchbox.addEventListener("keyup", function(e){
			if(e.keyCode==13)
            {
                Find.find(e.target.value);
            }
		});
		
		document.addEventListener("keydown", function(e){
			if (e.ctrlKey && e.which === 70) 
            {
                e.preventDefault();
                Find.show();
            }
		});
		
		this.down.addEventListener("click", function(e){
			Find.find(Find.searchbox.value);
		});
		
		this.up.addEventListener("click", function(e){
			Find.find(Find.searchbox.value, true);
		});
    },
	
	show(){
		this.searchbar.style.display = "flex";
		this.statusbarmessage.style.display = "none";
		Find.searchbox.focus();
		Find.searchbox.select();
	},
	
	hide(){
		this.searchbar.style.display = "none";
		this.statusbarmessage.style.display = "block";
	},
	
	find(keyword, aBackwards=false)
	{
		if(!keyword)
		{
			Find.searchbox.focus();
			return;
		}
		var aCaseSensitive= false;
		var aWrapAround= false;
		var aWholeWord= false;
		var aSearchInFrames= true;
		var aShowDialog = false;
		
        $("#zn-search-box").prop('disabled', true);
		var found = window.find(keyword, aCaseSensitive, aBackwards, aWrapAround, aWholeWord, aSearchInFrames, aShowDialog);
		
		$("#zn-search-box").prop('disabled', false);
		if (!found) {
		   alert("Not found! Starting from the beginning!");
		   $("#zn-search-box").focus();
		}
    }
}

window.addEventListener("load", function(){
	Find.init();
})