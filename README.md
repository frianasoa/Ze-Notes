# Ze Notes version 1
Reactifying Ze Notes. Version 1 only works with Zotero 7. For now it may show compatibility with Zotero 6 but it will not work. I will fix the manifest.json later.

## Description
Ze Notes is a Zotero plugin that will help you manage and visualize your notes. It is helpfull if you intend to make a systematic review directly on your Zotero using notes and annotations from attachments. This tool will help you organize your notes on Zotero. It will show you on a table what you have been writing. You can edit your notes right on the table or add new notes. On the latest versions, you can add translations of your notes using Google or DeepL. You can also apply a generative AI prompts (Bard and ChatGPT for the moment) to the part of a note, a note, a quote, a cell, a row, a column, or the entire table. Some of these actions are also available right in the pdf reader of Zotero.

## Migrating to version 1
* ⚠ Not yet implemented and may not be in the near future. 
* ⚠ Ze-Notes creates a database to manage some settings, including your api keys and output settings. You will need to set them again. If you are in the middle of an important work, please stay on v0 for the moment.
* ⚠️ Ze-Notes version 1 uses a different key (password) to encrypt sensitive settings such as api keys. I will add the ability to customize this key in the future but you will not be able to retrieve your previous settings.
* ⚠️ I am still looking for the best way to keep the settings. For now it is a separate database from Zotero and will not sync between computers for the same account.
* As your data (notes and annotations) reside in Zotero, there is no need to migrate them.
* From version 1, Ze-Notes will create document entries in Zotero to keep other data such as prompt results on columns or the entire table.

## Install
* For this v1beta, get the xpi file from the build folder.
---
* Head to the release page: https://github.com/frianasoa/Ze-Notes/releases/
* Download the latest version of the ".xpi" file. Please right click and "save as" if your browser tries to install it and fail.
* Open your Zotero. On the menu, click “Tools → Add-Ons” to open a window.
* Drag the .xpi file for the plugin onto that window. 
* Alternatively, you can click on the clog on the top right corner, then click "Install Add-on From File", choose the file and open.
* Restart your Zotero. \
Form more on Add-ons see this page https://www.zotero.org/support/plugins

## Use
* In Zotero, keep your files in collections (folders) 
* Add notes or annotations with tags to a an item of a collection
* Right click on the collection -> Ze-Notes
* This will open a tab with a table containing your notes.
* Right click on a cell, or a header to show a context menu.
* You can manage your notes, annotations, and tags and more.
* The new documentation is under construction but you can refer to the README.MD of version 0 to see what is possible.

## Documentation
### Version 0 
https://github.com/frianasoa/Ze-Notes/blob/v0/README.md

### Documentation page
Under construction. \ 
https://frianasoa.github.io/Ze-Notes/

### See README.MD of version 1.\
https://github.com/frianasoa/Ze-Notes/blob/v1/README.md
## Screenshots