/**
Depends on jquery-ui
*/

TabbedDialog = {
	init()
    {
        this.create();
    },
    
    reload(html1, html2)
    {
        this.tab1.innerHTML = html1;
        this.tab2.innerHTML = html2;
    },
	
	create()
    {
        this.dialog = document.createElement("div");
        this.tabs = document.createElement("div");
        document.body.appendChild(this.dialog);
        this.dialog.appendChild(this.tabs);
        this.dialog.id = "main-tabbed-dialog";
        this.dialog.title = "ZeNotes Dialog";
        this.tabs.style = "height: 100%; width: 100%;";


		var tabsi = document.createElement("ul");		
		var tabi1 = document.createElement("li");
		tabsi.appendChild(tabi1);
		this.tabs.appendChild(tabsi);
		var a1 = document.createElement("a");
		a1.setAttribute("href", "#tab-1");
		a1.innerHTML = "Response";
		tabi1.appendChild(a1);
		
		var tabi2 = document.createElement("li");
		tabsi.appendChild(tabi2);
		var a2 = document.createElement("a");
		a2.setAttribute("href", "#tab-2");
		a2.innerHTML = "Prompt";
		tabi2.appendChild(a2);
		
		this.tab1 = document.createElement("div");
		this.tab1.setAttribute("id", "tab-1");
		this.tabs.appendChild(this.tab1);
		
		this.tab2 = document.createElement("div");
		this.tab2.setAttribute("id", "tab-2");
		this.tabs.appendChild(this.tab2);
        
		this.tab1.innerHTML = ``;
        this.tab2.innerHTML = ``;
		
		this.tab1.style = "max-height: 80%; overflow-y: auto";
		this.tab2.style = "max-height: 80%; overflow-y: auto";
		$(this.tabs).tabs().css({
		   'width': '100%',
		   'overflow': 'hidden',
		});
		$("#main-tabbed-dialog").dialog({}).close();
    },
	
	resize(width=500, height=500)
    {
        $("#main-tabbed-dialog").dialog( "option", "width", width );
        $("#main-tabbed-dialog").dialog( "option", "height", height);
    },
    close()
    {
         $("#main-tabbed-dialog").dialog("close");
    },
	
	accept()
    {
        var buttons = $('#main-tabbed-dialog').dialog('option', 'buttons');
        buttons["OK"]();
    },
	
	open(html1, html2, callback=null, title="", buttons=null){
		this.tab1.innerHTML = "";
		this.tab2.innerHTML = "";
		if(typeof html1==="string")
		{
			this.tab1.innerHTML = html1;
		}
		else
		{
			this.tab1.appendChild(html1);
		}
		
		if(typeof html2==="string")
		{
			this.tab2.innerHTML = html2;
		}
		else
		{
			this.tab2.appendChild(html2);
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
                    $("#main-tabbed-dialog").dialog( "close" );
                },
                OK: function() {
                    $("#main-tabbed-dialog").dialog( "close" );
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
					$("#main-tabbed-dialog").dialog( "close" );
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
                    $("#main-tabbed-dialog").dialog( "close" );
                },
				Save: function(){
					$("#main-tabbed-dialog").dialog( "close" );
					if(callback!=null)
                    {
                        callback();
                    }
				}
			}
		}
        $(this.tabs).tabs().css({
		   'width': '100%',
		   'overflow': 'hidden',
		});
        $("#main-tabbed-dialog").dialog({
            width: 850,
            height: 550,
            modal: true,
            buttons: buttons,
			open: function (event, ui) {
				$("#main-tabbed-dialog").css('overflow', 'hidden');
			}
        });
	},
}

window.addEventListener("load", function(){
	TabbedDialog.init();
})