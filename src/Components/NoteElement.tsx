import React, { useState, useEffect, useRef, useContext } from "react";
import { FaRegTrashCan, FaPencil } from "react-icons/fa6";
import Utils from '../Core/Utils';
import DataContext from "./DataContext";
import NoteTextMenu from "./MenuItems/NoteTextMenu";
import NoteImageMenu from "./MenuItems/NoteImageMenu";
import Icons from "./MenuItems/Icons";

type NoteElementProps = {
  item: Record<string, any>;
};

const NoteElement: React.FC<NoteElementProps> = ({ item }) => {
  const [htmls, setHtmls] = useState<any>({ "Default": item.text });
  const ref = useRef<HTMLDivElement | null>(null);
  const context = useContext(DataContext);

  // Right-click menu for note
  const handleTextContextMenu = (event: React.MouseEvent<HTMLElement, MouseEvent>) => {
    if (context) {
      NoteTextMenu.show(context, event, item);
    }
  };

  // Right-click menu for images
  const handleImageContextMenu = (event: Event) => {
    NoteImageMenu.show(event, context, item);
  };

  // Load images from notes and replace with data URI
  const loadImages = async () => {
    const parser = new DOMParser();
    const body = parser.parseFromString(`<div id='temp-div'>${item.text}</div>`, "application/xhtml+xml");
    const images: NodeListOf<HTMLImageElement> = body.querySelectorAll("img");

    for (const img_ of images) {
      const img = img_ as HTMLImageElement;
      if (img) {
        const attachmentKey = img.getAttribute("data-attachment-key");
        if (attachmentKey) {
          const attachment: any = Zotero.Items.getByLibraryAndKey(item.libraryid, attachmentKey);
          if (attachment) {
            const dataURI = await attachment.attachmentDataURI;
            img.setAttribute("src", dataURI);
          }
        }
        img.setAttribute("width", "100%");
      }
    }
    
    const updatedHtml = body.querySelector("#temp-div")?.innerHTML || "";
    const processedHtmls = Utils.splithtmlcomment(Utils.removeHiddenText(updatedHtml));
    setHtmls(processedHtmls);
  };

  useEffect(() => {
    loadImages();
  }, []);

  useEffect(() => {
    const containers = document?.querySelectorAll(".note-container");

    // Attach context menu event listener to images
    const attachListeners = () => {
      containers.forEach((container: any) => {
        const images = container.querySelectorAll("img");
        images.forEach((img: any) => {
          img.addEventListener("contextmenu", handleImageContextMenu);
        });
      });
    };

    attachListeners(); // Attach initially

    // Use MutationObserver to track dynamic content changes
    const observer = new window.MutationObserver(() => {
      attachListeners();
    });

    containers.forEach((container: any) => {
      observer.observe(container, { childList: true, subtree: true });
    });

    return () => {
      observer.disconnect();
      containers.forEach((container: any) => {
        const images = container.querySelectorAll("img");
        images.forEach((img: any) => {
          img.removeEventListener("contextmenu", handleImageContextMenu);
        });
      });
    };
  }, [htmls]);

  return (
    <fieldset className="main-fieldset">
      <legend className="main-legend">
        <img className='group-icon' src={Icons.data["note"]} />
      </legend>
      <div ref={ref} data-type="note">
        {Object.keys(htmls).map((title, index) => (
          <fieldset
            className="sub-fieldsets"
            onContextMenu={handleTextContextMenu}
            key={index}
            style={{ marginBottom: '0.5em', border: 'dotted 1px' }}
          >
            <legend className="annotation-part sub-legend" style={{ fontWeight: "bold" }}>
              {title}
            </legend>
            <div className="note-container zcontent" data-legend={title} dangerouslySetInnerHTML={{ __html: htmls[title] }}></div>
          </fieldset>
        ))}
      </div>
    </fieldset>
  );
};

export default NoteElement;
