'use strict';
var Zotero;
var window;
var document;

function loadZotero () {
    let callback = function (resolve, reject) {
        if (!Zotero) {
            if (!("@zotero.org/Zotero;1" in Components.classes)) {
                let timer = Components.classes["@mozilla.org/timer;1"].createInstanceComponents.interfaces.nsITimer;
                return timer.initWithCallback(function () {
                    return callback(resolve, reject);
                }, 10000, Components.interfaces.nsITimer.TYPE_ONE_SHOT);
            } else {
                Zotero = Components.classes["@zotero.org/Zotero;1"]
                    .getService(Components.interfaces.nsISupports).wrappedJSObject;
                return resolve(Zotero);
            }
        } else {
            return resolve(Zotero);
        }
    };
    return new Promise(callback);
}

function makeStartupObserver(addonData) {
    var vm = this;
    var scope = {};
    return {
        'observe': function(subject, topic, data) {
            loadZotero().then(function () {
                Components.utils.import('resource://gre/modules/FileUtils.jsm');
                Components.utils.import('resource://gre/modules/NetUtil.jsm');
                if(Zotero)
                {
                    var zp = Zotero.getActiveZoteroPane()
                    document = zp.document;
                    window = document.defaultView
                    Components.utils.import('chrome://zenotes/content/zenotes.js', scope);
                    Zotero = scope.Zotero;
                    Zotero.ZeNotes.initdisplay();
                }
            });
        }
    };
}

function startup(data, reason) {
    Components.utils.import('resource://gre/modules/Services.jsm');
    const observerService = Components.classes['@mozilla.org/observer-service;1'].getService(Components.interfaces.nsIObserverService);
    
    /* wait until after zotero is loaded */
    // observerService.addObserver(makeStartupObserver(data), 'final-ui-startup', false);
    observerService.addObserver(makeStartupObserver(data), 'zotero-loaded', false);
}

function shutdown (data, reason) {
}

function uninstall(data, reason) {
}

function install(data, reason) {
}