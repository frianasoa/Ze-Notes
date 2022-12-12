var EXPORTED_SYMBOLS = ["Zotero"];

var Zotero = Components.classes["@zotero.org/Zotero;1"]
    .getService(Components.interfaces.nsISupports)
    .wrappedJSObject;
    
Zotero.ZeNotes.database = new function()
{
    this.create = function()
    {
        var p = new Promise(function(resolve, reject) {
            this.DB = new Zotero.DBConnection("zenotes");
            this.DB.tableExists('settings').then(v=>{
                if(!v)
                {
                    var sql = "CREATE TABLE settings (id INTEGER PRIMARY KEY, label TEXT, contents TEXT)";
                    this.DB.queryAsync(sql).then(v2=>{
                        resolve(this.DB);
                    })
                }
                else
                {
                    resolve(this.DB);
                }
            })
        });
        return p;
    }
    
    this.execute = function(sql, values)
    {
        var p = new Promise(function(resolve, reject) {
            Zotero.ZeNotes.database.create().then(db=>{
                db.queryAsync(sql, values).then(v=>{
                    db.closeDatabase().then(()=>{
                        resolve(v);
                    })
                })
            })
        });
        return p;
    }
    
    this.updatesetting = function(id, value)
    {
        return this.execute(
            "UPDATE `settings` SET contents=? WHERE id=?", 
            [value, id]
        );
    }
    
    this.deletesetting = function(id)
    {
        return this.execute(
            "DELETE FROM `settings` WHERE id=?", 
            [id]
        );
    }
    
    this.addsetting = function(label, value)
    {
        return this.execute(
            "INSERT INTO `settings`(label, contents) VALUES(?, ?)", 
            [label, value]
        )
    }
    
    this.getsetting = function(id)
    {
        return this.execute(
            "SELECT * FROM  `settings` WHERE id=?",
            [id]
        )
    }
}