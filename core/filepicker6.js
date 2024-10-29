function FilePicker6() 
{
	this.defaultExtension = "";
	this.returnOK = 0;
	this.returnReplace = 2;
	this.nsIFilePicker = Components.interfaces.nsIFilePicker;
	this.fp = Components.classes["@mozilla.org/filepicker;1"].createInstance(this.nsIFilePicker);
    this.modeSave = this.nsIFilePicker.modeSave;
    this.modeOpen = this.nsIFilePicker.modeOpen;
}

FilePicker6.prototype.init = function(w, title, mode) {
    return this.fp.init(w, title, mode);
};

FilePicker6.prototype.appendFilter = function(filter, extension) {
    return this.fp.appendFilter(filter, extension);
};

FilePicker6.prototype.show = function() {
    var wm = this;
    return new Promise(function(resolve, reject) {
        wm.fp.open(function(result) {
			wm.file = wm.fp.file.path;
			resolve(result);
        });
    });
};