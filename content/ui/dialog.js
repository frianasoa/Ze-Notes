/**
Depends on jquery-ui
*/

Dialog = {
	init()
    {
        this.create();
    },
    
    reload(html)
    {
        this.contents.innerHTML = html;
    },
	create()
    {
        this.dialog = document.createElement("div");
        this.contents = document.createElement("div");
        document.body.appendChild(this.dialog);
        this.dialog.appendChild(this.contents);
        this.dialog.id = "main-dialog";
        this.dialog.title = "ZeNotes Dialog";
        this.contents.style = "height: 100%; width: 100%;";
        this.contents.innerHTML = ``;
    },
	resize(width=500, height=500)
    {
        $("#main-dialog").dialog( "option", "width", width );
        $("#main-dialog").dialog( "option", "height", height);
    },
    close()
    {
         $("#main-dialog").dialog("close");
    },
	
	accept()
    {
        var buttons = $('#main-dialog').dialog('option', 'buttons');
        buttons["OK"]();
    },
	
	open(html, callback=null, title="", buttons=null){
		this.contents.innerHTML = "";
		if(typeof html==="string")
		{
			this.contents.innerHTML = html;
		}
		else
		{
			this.contents.appendChild(html);
		}
		
        if(title!="")
        {
            this.dialog.title = title;
        }
        
        if(buttons==null)
        {
            buttons = {
                Cancel: function()
                {
                    $("#main-dialog").dialog( "close" );
                },
                OK: function() {
                    $("#main-dialog").dialog( "close" );
                    if(callback!=null)
                    {
                        callback();
                    }
                }
            }
        }
		else if(buttons=="close")
		{
			buttons = {
				Close: function(){
					$("#main-dialog").dialog( "close" );
					if(callback!=null)
                    {
                        callback();
                    }
				}
			}
		}
		else if(buttons=="save")
		{
			buttons = {
				Cancel: function()
                {
                    $("#main-dialog").dialog( "close" );
                },
				Save: function(){
					$("#main-dialog").dialog( "close" );
					if(callback!=null)
                    {
                        callback();
                    }
				}
			}
		}
        
        $("#main-dialog").dialog({
            height: "auto",
            width: 750,
            height: 500,
            modal: true,
            buttons: buttons,
        });
	},
}

window.addEventListener("load", function(){
	Dialog.init();
})