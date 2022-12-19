var EXPORTED_SYMBOLS = ["Zotero"];

var Zotero = Components.classes["@zotero.org/Zotero;1"]
    .getService(Components.interfaces.nsISupports)
    .wrappedJSObject;
    
Zotero.ZeNotes.database = new function()
{
    this.create = function()
    {
        var vm = this;
        var DB = new Zotero.DBConnection("zenotes");
        var p = new Promise(function(resolve, reject) {
            DB.tableExists('settings').then(v=>{
                if(!v)
                {
                    var sql = "CREATE TABLE settings (id INTEGER PRIMARY KEY, label TEXT UNIQUE, contents TEXT, folder TEXT)";
                    DB.queryAsync(sql).then(v2=>{
                        resolve(DB);
                    }).catch(e=>{
                        alert("database.create: "+e);
                        resolve(DB);
                    })
                }
                else
                {
                    DB.columnExists('settings', 'folder').then(e=>{
                        if(!e)
                        {
                            var sql = "ALTER TABLE settings ADD COLUMN folder TEXT"
                            DB.queryAsync(sql).then(v3=>{
                                resolve(DB);
                            }).catch(e=>{
                                alert("database.create: "+e);
                                resolve(DB);
                            });
                        }
                        else
                        {
                            resolve(DB);
                        }
                    }).catch(e=>{
                        alert("database.create: "+e);
                        resolve(DB);
                    });
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
                    }).catch(e=>{
                        alert("database.execute: "+e);
                    })
                }).catch(e=>{
                    alert("database.execute :"+e);
                })
            }).catch(e=>{
                alert("database.execute: "+e);
            })
        });
        return p;
    }
    
    this.updatesetting = function(id, contents, folder)
    {
        var p = new Promise(function(resolve, reject) {
            Zotero.ZeNotes.database.getsetting(id).then(v=>{
                if(v.length>0)
                {
                    return Zotero.ZeNotes.database.execute(
                        "UPDATE `settings` SET contents=?, folder=? WHERE id=?", 
                        [contents, folder, id]
                    )
                }
                else
                {
                    return Zotero.ZeNotes.database.execute(
                        "INSERT OR REPLACE INTO `settings`(id, label, contents, folder) VALUES(?, ?, ?, ?)", 
                        [id, "default", contents, folder]
                    )
                }
            })
        });
        return p;
    }
    
    this.deletesetting = function(id)
    {
        return this.execute(
            "DELETE FROM `settings` WHERE id=?", 
            [id]
        );
    }
    
    this.addsetting = function(label, contents, folder)
    {
        return this.execute(
            "INSERT OR REPLACE INTO `settings`(label, contents, folder) VALUES(?, ?, ?)", 
            [label, contents, folder]
        )
    }
    
    this.getsetting = function(id)
    {
        return this.execute(
            "SELECT * FROM  `settings` WHERE id=?",
            [id]
        )
    }
    
    this.getsettingbycolumn = function(column, value)
    {
        return this.execute(
            "SELECT * FROM  `settings` WHERE "+column+"=?",
            [value]
        )
    }
    
    this.getsettings = function()
    {
        return this.execute(
            "SELECT * FROM  `settings`"
        )
    }
}