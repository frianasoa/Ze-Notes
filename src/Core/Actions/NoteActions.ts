import React from "react";
import AnnotationCommentEditor from "../../Components/Dialog/AnnotationCommentEditor";
import Reload from "./Reload";

const NoteActions = {
  showitem(item: zty.ContextMenuData, celldata: zty.CellData) {
    Zotero.getMainWindow().ZoteroPane.selectItems([parseInt(celldata.itemid)]);
  },

  deletenote(item: zty.ContextMenuData, celldata: zty.CellData) {
    const window_ = Zotero.getMainWindow();
    if (window_.confirm("Are you sure you want to delete this note?")) {
      Zotero.Items.erase(item.data.noteid).then(function () {
        Reload.reload();
      });
    }
  },

  createnote(
    item: zty.ContextMenuData,
    celldata: zty.CellData,
    event: any = null,
    contents: string | null = null,
    tags: string[] = [],
    noparent: boolean = false,
  ) {
    const column = celldata.column;
    const itemid = celldata.itemid;
    let note = new Zotero.Item("note");
    let text = "&lt;&lt;" + celldata.column + "&gt;&gt;<br/>\nNew Note";
    if (contents) {
      text = contents;
    }

    note.setNote(text);

    if (noparent) {
      note.addToCollection(celldata.collectionid);
    } else {
      note.parentID = itemid;
    }

    if (tags.length > 0) {
      for (const tag of tags) {
        note.addTag(tag);
      }
    } else {
      note.addTag(column);
    }

    note.saveTx().then(function () {
      NoteActions.editnote({ data: { noteid: note.id } }, celldata);
    });
  },

  editnote(item: zty.ContextMenuData, celldata: zty.CellData) {
    const window_ = Zotero.getMainWindow();
    const noteurl = "chrome://zotero/content/note.xhtml";
    const noteid = item.data.noteid;

    const io = { itemID: item.data.noteid, collectionID: item.data.collectionid, parentItemKey: item.data.itemkey };

    const name = "zotero-note-" + item.data.itemid;

    const win = window_.openDialog(noteurl, name, "chrome,resizable,centerscreen,dialog=false", io);

    win?.addEventListener("close", function () {
      Reload.reload();
    });
  },

  updateannotation(annotationid: number, title: string, contents: string) {
    const annotation = Zotero.Items.get(annotationid);
    const currentcomment = annotation.annotationComment || "";
    annotation.annotationComment = currentcomment + "\n\n<b>[[" + title + "]]</b>\n" + contents + "\n";
    annotation.saveTx({ skipSelect: true }).then((e) => {
      Reload.reload();
    });
  },

  updatenote(noteid: number, title: string, contents: string) {
    const note = Zotero.Items.get(noteid);
    const currentNoteHTML = note.getNote() || "";

    const parser = new DOMParser();
    const doc = parser.parseFromString(currentNoteHTML, "text/html");
    const fragment = doc.createDocumentFragment();
    const p = doc.createElement("p");
    p.innerHTML = contents;
    fragment.appendChild(doc.createElement("br"));
    const boldEl = doc.createElement("b");
    boldEl.textContent = "[[" + title + "]]";
    fragment.appendChild(boldEl);
    fragment.appendChild(doc.createElement("br"));
    fragment.appendChild(p);
    fragment.appendChild(doc.createElement("br"));
    doc.body.appendChild(fragment);
    const updatedHTML = doc.body.innerHTML || "";

    note.setNote(updatedHTML);
    note.saveTx().then(() => {
      Reload.reload();
    });
  },

  showannotation(item: zty.ContextMenuData, celldata: zty.CellData) {
    const attachmentid = item.data.attachmentid;
    const annotationpage = item.data.annotationpage;
    const annotationkey = item.data.annotationkey;
    var attachment = Zotero.Items.get(attachmentid);
    if (attachment && annotationkey && annotationpage) {
      (Zotero as any).FileHandlers.open(attachment, {
        location: {
          annotationID: annotationkey,
          pageIndex: annotationpage,
        },
      });
    } else if (attachment && annotationkey) {
      Zotero.log("The attachment does not seem to have pages. Opening at the last location!");
      (Zotero as any).FileHandlers.open(attachment, {
        location: {
          annotationID: annotationkey,
        },
      });
    } else {
      Zotero.log("Unable to open attachment");
    }
  },

  showattachment(item: zty.ContextMenuData, celldata: zty.CellData) {
    var attachment = Zotero.Items.get(item.data.id);

    /**
        launchURL if linked url instead of imported url
        if(attachment.attachmentLinkMode==Zotero.Attachments.LINK_MODE_LINKED_URL)
      **/
    (Zotero as any).FileHandlers.open(attachment).then((opened: boolean) => {
      if (!opened) {
        const url = attachment.getField("url");
        Zotero.launchURL(url);
      }
    });
  },

  editannotationcomment(item: zty.ContextMenuData, celldata: zty.CellData) {
    const children = React.createElement(AnnotationCommentEditor, {
      html: item.data.annotationcomment,
      save: (html) => {
        const annotation = Zotero.Items.get(item.data.annotationid);
        annotation.annotationComment = html;
        annotation.saveTx({ skipSelect: true }).then((e) => {
          Reload.reload();
        });
      },
    });

    item?.data?.callback({
      title: "Annotation comment editor",
      children: children,
      isOpen: true,
    });
  },
};

export default NoteActions;
