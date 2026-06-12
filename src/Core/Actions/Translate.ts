import React from "react";
import ZPrefs from "../ZPrefs";
import Google from "../Translation/Google";
import DeepL from "../Translation/DeepL";
import TranslationElement from "../../Components/Dialog/TranslationElement";
import AiPrompt from "./AiPrompt";
import NoteActions from "./NoteActions";
import Reload from "./Reload";

const Translate = {
  async translate(item: zty.ContextMenuData, celldata: zty.CellData, event: any) {
    if (!item.data) {
      return;
    }

    // Translation targets a narrower set of elements than the AI prompts.
    const target = AiPrompt.resolvetarget(item.data.target, celldata, {
      notepart: (c) => c.target,
      note: (c) => c.target.closest(".note"),
      quote: null,
      row: null,
      column: null,
      table: null,
    });

    if (target) {
      const context = item.data.context;
      if (!context) {
        return;
      }
      const annotationid = celldata.target.dataset.annotationid;
      const noteid = item.data.noteid;

      context.setLoadingMessage("Loading translation, please wait...");
      context.setIsLoading(true);
      let machine = Google;
      if (item.data.service == "DeepL") {
        machine = DeepL;
      }

      const lang = ZPrefs.get("translation-language", "en") as string;
      machine
        .translate(target.innerText, lang || "en")
        .then((data: any) => {
          context.setIsLoading(false);
          const children = React.createElement(TranslationElement, {
            data: data,
            save: (text) => {
              if (noteid) {
                NoteActions.updatenote(noteid, "Translation: " + item.data.target, text.split("\n").join("<br/>"));
              } else if (annotationid) {
                NoteActions.updateannotation(annotationid, "Translation: " + item.data.target, text);
              } else {
                const contents = "[[Translation: " + item.data.target + "]]<br/>" + text.split("\n").join("<br/>");
                NoteActions.createnote(item, celldata, event, contents);
              }
            },
          });

          context.setTranslationDialogState?.({
            title: "Translation dialog [" + item.data.service + "]",
            children: children,
            isOpen: true,
          });
        })
        .catch((e) => {
          context.setIsLoading(false);
          window.alert("HTTP error. status: " + (e.status ?? e));
        });
    }
  },

  translateannotation(item: zty.ContextMenuData, celldata: zty.CellData) {
    let machine = Google;
    if (item.data.service == "DeepL") {
      machine = DeepL;
    }

    const annotation = Zotero.Items.get(item.data.annotationid);
    const lang = ZPrefs.get("translation-language", "en") as string;
    machine
      .translate(item.data.annotationtext, lang || "en")
      .then((data: any) => {
        const children = React.createElement(TranslationElement, {
          data: data,
          save: (text) => {
            const currentcomment = annotation.annotationComment || "";
            annotation.annotationComment = currentcomment + "\n\n<b>[[Translation]]</b>\n" + text + "\n";
            annotation.saveTx({ skipSelect: true }).then((e) => {
              Reload.reload();
            });
          },
        });

        item?.data?.callback({
          title: "Translation dialog [" + item.data.service + "]",
          children: children,
          isOpen: true,
        });
      })
      .catch((e) => {
        window.alert("HTTP error. status: " + (e.status ?? e));
      });
  },
};

export default Translate;
