Zotero.ZNotes = new function(){
	this.notewin = null;
    this.init = function(){
        
    };
    this.maximize = function(notewin)
    {
        Zotero.ZNotes.notewin = notewin;
        notewin.resizeTo(screen.width, screen.height);
        notewin.moveTo(0, 0);
    };
    this.show = function(paneID, action) {
        var io = {pane: paneID, action: action};
        window.openDialog('chrome://znotes/content/notes.xul',
            'notewin',
            'chrome,titlebar,toolbar,centerscreen,dialog,width:900,height:900' + Zotero.Prefs.get('browser.preferences.instantApply', true) ? 'dialog=no' : 'modal', io
        );
    };
    
    this.openPreferenceWindow = function(paneID="", action="") {
        var io = {pane: paneID, action: action};
        window.openDialog('chrome://znotes/content/settings.xul',
            'znote-settings',
            'chrome,titlebar,toolbar,centerscreen' + Zotero.Prefs.get('browser.preferences.instantApply', true) ? 'dialog=no' : 'modal', io
        );
    };
    
    this.data = function()
    {
        return {
            "columns": ["Title", "Date", "Methods", "Regions"],
            "values":[
                {
                    "Title": "XUL templates ",
                    "Date": "2022",
                    "Methods":"Meth",
                    "Regions": "Region",
                },
                {
                    "Title": "title 2",
                    "Date":"2022",
                    "Methods":"Meth 2",
                    "Regions": "Region 2",
                }
            ]
        }
    };
    
    this.reload = function()
    {
        Zotero.ZNotes.notewin.document.getElementById("note-frame").contentWindow.location.reload();
    };
};

// Initialize the utility
window.addEventListener('load', function(e) { Zotero.ZNotes.init(); }, false);
