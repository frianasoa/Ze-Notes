# Ze Notes
[![zotero](https://raw.githubusercontent.com/frianasoa/zenotes/main/docs/images/for-zotero-6.svg)](https://zotero.org)
[![zotero](https://raw.githubusercontent.com/frianasoa/zenotes/main/docs/images/for-zotero-7.png)](https://zotero.org)

Now works with Zotero 7 Beta.

## Transition to version 0.4.* (Supporting Zotero 6 & 7 beta)
* After installing the plugin, restart Zotero (This will import your preferences from previous versions)
* Select the collection you are working on
* Head to ZeNotes -> Settings
* In settings, scroll down to "Load and save"
* Click on the dropdown and choose the preference you want to apply to the current collection
	* Preferences from Zotero 6 are imported automatically and their names will start with Z6. "Z6 default" will be your last preference
* Click "Import preferences" to apply the selected preference to the current collection

## Limitations & bugs for current version
* Opening annotation does not open to the page with highlight, especially on Zotero 7.
* If it is of concern for you, please download and install a previous version.

## Description
ZeNotes is a Zotero plugin that will help you manage and visualize your notes. It is helpfull if you intend to make a systematic review directly on your Zotero using notes. This tool will help you organize your notes on Zotero. It will show you on a table what you have been writing. You can edit your notes right on the table or add new notes.

# Instructions
## Install
* Head to the release page: https://github.com/frianasoa/Ze-Notes/releases/
* Download the latest version of the ".xpi" file. Please right click and "save as" if your browser tries to install it and fail.
* Open your Zotero. On the menu, click “Tools → Add-Ons” to open a window.
* Drag the .xpi file for the plugin onto that window. 
* Alternatively, you can click on the clog on the top right corner, then click "Install Add-on From File", choose the file and open.
* Restart your Zotero. \
Form more on Add-ons see this page https://www.zotero.org/support/plugins

## Use
### Adding notes
* Add notes to an entry
![Adding notes](https://raw.githubusercontent.com/frianasoa/zenotes/main/docs/images/00.add-a-note.png "Adding notes")
![Adding notes](https://raw.githubusercontent.com/frianasoa/zenotes/main/docs/images/01.label-note-tag.png "Adding notes")

* Or add annotations directly on an attached pdf file [You need to use Zotero pdf reader if you want to use annotations].
![Adding annotations to pdf](https://raw.githubusercontent.com/frianasoa/zenotes/main/docs/images/02.pdf-annotation.png "Adding annotations to pdf")
![Adding annotations to pdf](https://raw.githubusercontent.com/frianasoa/zenotes/main/docs/images/03.pdf-annotation-results.png "Adding annotations to pdf")

* To each note or annotation, add a tag.

### Displaying notes
* Right click on a particular collection or on "My Library". Then, click "ZeNotes - My notes in collection" from the context menu.
* Alternatively, select a particular collection or "My Library", then on the menu "ZeNotes > Notes".
![Opening ZeNotes](https://raw.githubusercontent.com/frianasoa/zenotes/main/docs/images/04.open-zenotes.png "Opening ZeNotes")
* A table should be displayed.


### Edit notes
* You can edit your notes normally in Zotero or right click on an item in the table to see your options.
![Editing notes](https://raw.githubusercontent.com/frianasoa/zenotes/main/docs/images/05.zenotes-interface.png "Editing notes")

### Preferences
(The preference window has changed. Will update this part later)
* To open preference, go to menu "Edit > Preferences" of the ZeNotes window. Alternatively go to menu "ZeNotes > Settings" of the Zotero main window.
![Opening settings](https://raw.githubusercontent.com/frianasoa/zenotes/main/docs/images/06.zenotes-interface-settings.png "Opening settings")
* Select the tags you will be using as columns. You can hide the ones you do not need.
* You can choose the tags on which you want to sort the results. Double click on an entry or click on order with the entry selected if you want the sort to be desc or asc.
* You can save the current layout, load or delete saved layouts.
* Click "OK" when you finish and the table will reload.

## Use cases
### How to start a systematic review of the literature?

1. Create a folder (collection) to add all the papers you want to review (you can also use an existing folder).
2. Add notes to each entry of the folder. It is now possible to add annotations directly inside a pdf attachment. In this case, please open the  
3. To each note, add a tag according to its content (e.g. Objectives, Methods, Results, Discussions, Comments, ... ). 
4. Right click on the folder you work on and open "ZeNotes - My notes in collection" to see all your notes in the current collection. All your notes will be shown in a table with the tags as columns.
5. You may right click on the table cells to see what actions are available (Edit, remove columns, etc, ...).
6. Go to tools and settings to control the columns (tags) you want to show or hide. You may also sort the results. It is now possible to save, load, and delete layouts.  
7. Export your notes to MS Word, Excel or CSV format.