import React from 'react';
import ZPrefs from "../ZPrefs";
import Tesseract from "../Ocr/Tesseract";
import TranslationElement from "../../Components/Dialog/TranslationElement";
import Reload from "./Reload";

const Ocr = {
  async ocrnote(item: zty.ContextMenuData, celldata: zty.CellData) {
    const collection = Zotero.Collections.get(item.data.collectionid);
    const img = (item.data.event.currentTarget || item.data.event.target) as HTMLElement;
    const imagekey = img.dataset.attachmentKey || "";
    const attachmentid = Zotero.Items.getIDFromLibraryAndKey(collection.libraryID, imagekey);

    let attachment = null;
    if(!attachmentid)
    {
      return;
    }
    attachment = Zotero.Items.get(attachmentid);
    const image = attachment?.getFilePath();
    const note = attachment.parentItem;
    let lang = ZPrefs.get('tesseract-language', "en");

    if(!lang){lang = "en"} else{lang = String(lang)}
    if (!note || !image) {
      return;
    }
    Tesseract.run(image, lang).then((ocrtext: string) => {
      const children = React.createElement(
        TranslationElement,
        {data: [ocrtext], save: (text)=>{
          // Retrieve the current note's HTML string.
          let currentNoteHTML = note.getNote() || "";

          // Parse the HTML string into a document.
          const parser = new DOMParser();
          const doc = parser.parseFromString(currentNoteHTML, "text/html");

          // Locate the image element by its data-attachment-key.
          const targetImage = doc.querySelector(`img[data-attachment-key="${imagekey}"]`);

          // Create a document fragment containing the OCR text exactly as desired.
          const ocrFragment = doc.createDocumentFragment();
          ocrFragment.appendChild(doc.createElement("br"));
          const boldEl = doc.createElement("b");
          boldEl.textContent = "[OCR]";
          ocrFragment.appendChild(boldEl);
          ocrFragment.appendChild(doc.createElement("br"));
          ocrFragment.appendChild(doc.createTextNode(text));
          ocrFragment.appendChild(doc.createElement("br"));

          if (targetImage) {
            // Insert the OCR content immediately before the image element.
            if (targetImage.parentNode) {
              targetImage.parentNode.insertBefore(ocrFragment, targetImage.nextSibling);
            }
          } else {
            // If the image wasn't found, just append the OCR content to the body.
            doc.body.appendChild(ocrFragment);
          }

          // Serialize the document back to a string.
          const updatedHTML = doc.body.innerHTML || "";

          // Save the updated note.
          note.setNote(updatedHTML);
          note.saveTx().then(() => {
            Reload.reload();
          });
        }}
      );
      item?.data?.callback({
        title: "OCR dialog ["+item.data.service+"]",
        children: children,
        isOpen: true
      });

    }).catch(e=>{
      window.alert("OCR error. status: "+e);
    })
  },

  ocrannotation(item: zty.ContextMenuData, celldata: zty.CellData)
  {
    let lang = ZPrefs.get('tesseract-language', "en");
    if(!lang){lang = "en"} else{lang = String(lang)}
    Tesseract.run(item.data.annotationimage, lang).then(ocrtext=>{
      const children = React.createElement(
        TranslationElement,
        {data: [ocrtext], save: (text)=>{
          const annotation = Zotero.Items.get(item.data.annotationid);
          const currentcomment = annotation.annotationComment || "";
          annotation.annotationComment = currentcomment+"\n\n<b>[[OCR]]</b>\n"+text+"\n";
          annotation.saveTx({skipSelect:true}).then(e=>{
            Reload.reload();
          });
        }}
      );

      item?.data?.callback({
        title: "OCR dialog ["+item.data.service+"]",
        children: children,
        isOpen: true
      });
    }).catch(e=>{
      window.alert("OCR error. status: "+e);
    })
  }
};

export default Ocr;
