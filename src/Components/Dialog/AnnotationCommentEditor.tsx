import React, { useState, useRef, useEffect } from "react";
import Utils from "../../Core/Utils";
import pkg from "../../../package.json";

interface AnnotationCommentEditorProps {
  html: string;
  save: (value: string) => void;
}

const noteurl = "chrome://"+pkg.config.slug+"/content/xhtml/annotationeditor.xhtml";

const AnnotationCommentEditor: React.FC<AnnotationCommentEditorProps> = ({ html, save }) => {
  const iframeref = useRef<HTMLIFrameElement>(null);
  
  const lb2br = (h: string) => {
    return Utils.sanitizeannotation(h)
    .split("\n").join("<br/>");
  }
  
  const br2lb = (h: string) => {
    return Utils.sanitizeannotation(h)
      .split(" xmlns=\"http://www.w3.org/1999/xhtml\"").join("")
      .split("<br />").join("\n")
      .split("</div><div>").join("\n")
      .replace(/<[^>]+><\/[^>]+>/g, '\n')
      .replace(/<\/div><div>/g, '\n')
      .split("<div>").join("")
      .split("</div>").join("\n")
      .split("<p>").join("")
      .split("</p>").join("\n")
  }
  
  useEffect(() => {
    const handleLoad = () => {
      iframeref?.current?.contentWindow?.addEventListener("load", (event: any)=>{
        const div = event.currentTarget.document?.getElementById("annotation-content");
        if(div)
        {
          div.innerHTML = lb2br(html);
          div.contentEditable = "true";
          div.focus();
        }
      })
    }
    handleLoad();
  }, []);

  return (
    <div
      style={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        gap: "1em",
      }}
    >
      <iframe style={{flex: "1", border: "0"}} ref={iframeref} src={noteurl}></iframe>
      <div style={{ textAlign: "right" }}>
        <button onClick={() => save(br2lb(iframeref?.current?.contentWindow?.document?.getElementById("annotation-content")?.innerHTML || ""))}>Save</button>
      </div>
    </div>
  );
};

export default AnnotationCommentEditor;
