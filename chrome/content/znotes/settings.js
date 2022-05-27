var Zotero = Components.classes["@zotero.org/Zotero;1"]
    .getService(Components.interfaces.nsISupports)
    .wrappedJSObject;

Components.utils.import("resource://gre/modules/osfile.jsm");
Components.utils.import("resource://gre/modules/Services.jsm");

Zotero.ZNotes.settings = new function()
{
    this.init = function()
    {
        this.hidetags();
    }
    this.hidetags = function()
    {
        var boxshow = document.getElementById("tag-box-show");
        var boxhide = document.getElementById("tag-box-hide");
        var tags = Zotero.ZNotes.alltags();        
        
        boxshow.ondblclick = function(e){
            Zotero.ZNotes.settings.move(e.target);
        }
        boxhide.ondblclick = function(e){
            Zotero.ZNotes.settings.move(e.target);
        }
        
        tags.forEach(t=>{
            let listitem = document.createElement("listitem");
            listitem.setAttribute("label", t);
            listitem.setAttribute("parent", "show");
            boxshow.appendChild(listitem);
        });
    }
    
    this.move = function(listitem)
    {
        var boxshow = document.getElementById("tag-box-show");
        var boxhide = document.getElementById("tag-box-hide");
        if(listitem.getAttribute("parent")=="show")
        {
            boxhide.appendChild(listitem);
            listitem.setAttribute("parent", "hide");
        }
        else
        {
            boxshow.appendChild(listitem);
            listitem.setAttribute("parent", "show");
        }
    }
    
    this.savehidden = function()
    {
        
    }
}

window.addEventListener('load', function(e) { Zotero.ZNotes.settings.init(); }, false);


