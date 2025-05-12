import Config from "../../Config"
var pretty = require("pretty");

import sanitizeHtml from 'sanitize-html';

const Html = {
  async start(table: HTMLTableElement, filename: string, settings: Record<string, string>, toObject: boolean=false)
  {
    const external = settings?.createfolder === "true";
    const clonedTable = table.cloneNode(true);
    const rows = (clonedTable as HTMLTableElement).querySelectorAll("tbody tr");
    rows.forEach((row: Element, key: number, parent: NodeListOf<Element>) => {
      const style = window.getComputedStyle(row);
      const td = row as HTMLTableRowElement;
      if (style?.display === "none" || style?.visibility === "hidden" || td.style.display==="none" || td.style.visibility==="hidden") {
        row.remove();
      }
    });
    this.filterdata(clonedTable, settings);
    this.format(clonedTable, settings);

    const files = await this.url2base64((clonedTable as HTMLTableElement), external);
    if(toObject)
    {
      return {htmldata: clonedTable, files: files};
    }

    const filteredHTML = this.todocument((clonedTable as HTMLTableElement).outerHTML);
    return {htmldata: filteredHTML, files: files};
  },

  sanitize(html: string) {
    const clean = sanitizeHtml(html, {
      allowedTags: sanitizeHtml.defaults.allowedTags.concat(['br', 'img']),
      disallowedTagsMode: 'recursiveEscape',
    });
    return clean;
  },

  filterdata(table: any, settings: Record<string, string>)
  {
    const datasettings = Object.fromEntries(
      Object.entries(settings)
        .filter(([key, value]) => key.startsWith("display-data-") && value === "true")
        .map(([key, value]) => [key.replace("display-data-", ""), value])
    );

    /** Filter data with selected settings */
    table.querySelectorAll('.annotation-part').forEach((element: HTMLElement) => {
      const legendText = element.innerText.trim();

      if (!datasettings.hasOwnProperty(legendText))
      {
        const fieldset = element.closest('fieldset');
        if (fieldset) {
          fieldset.remove();
        }
      }
    });

    if(settings?.removetdstyle === "true") {
      table.querySelectorAll('td').forEach((element: HTMLElement) => {
        element.removeAttribute('style');
      });
    }

    if(settings?.displayquote === "false") {
      table.querySelectorAll('.annotation-quote').forEach((element: HTMLElement) => {
        element.remove();
      });
    }

    if(settings?.displaycitation === "false") {
      table.querySelectorAll('.annotation-source').forEach((element: HTMLElement) => {
        element.remove();
      });
    }
    else if(settings?.displayauthor === "false") {
      table.querySelectorAll('.annotation-source').forEach((element: HTMLElement) => {
        const page = element.dataset.page;
        if(page)
        {
          element.innerHTML="(p. "+page+")";
        }
        else
        {
          element.innerHTML="(n.p.)";
        }
      });
    }

    if(settings?.removemainlegends === "true") {
      table.querySelectorAll('.main-legend').forEach((legend: HTMLElement) => {
        legend.remove();
      });
    }

    if(settings?.removesublegends === "true") {
      table.querySelectorAll('.sub-legend').forEach((legend: HTMLElement) => {
        legend.remove();
      });
    }

    if(settings?.removeicons === "true") {
      table.querySelectorAll('.group-icon').forEach((icon: HTMLElement) => {
        icon.remove();
      });
    }

    if(settings?.removehighlights === "true") {
      table.querySelectorAll('.selection').forEach((el: HTMLElement) => {
        el.style.background = "";
      });
    }

    /** Should be at the end */
    if(settings?.removeempty === "true") {
      table.querySelectorAll('td fieldset, div').forEach((fieldset: HTMLElement) => {
        if(!fieldset.innerText.trim()) {
          fieldset.remove();
        }
      });
    }

    /** Remove nested*/
    table.querySelectorAll('.main-fieldset div').forEach((div: HTMLElement) => {
      while (
        div.children.length === 1 &&
        div.firstElementChild !=null &&
        div.firstElementChild.tagName.toLowerCase() === 'div'
      ) {
        div.replaceWith(div.firstElementChild);
      }
    });

    /** Replace fieldset with the child element if the child is unique*/
    table.querySelectorAll('fieldset').forEach((fieldset: HTMLElement) => {
      if (fieldset.children.length === 1) {
        const child = fieldset.firstElementChild;
        if (child) {
          fieldset.replaceWith(child);
        }
      }
    });
  },

  format(table: any, settings: Record<string, string>)
  {
    table.querySelectorAll('*').forEach((element: HTMLElement)=>{
      Object.keys(element.dataset).forEach((key) => {
        delete element.dataset[key];
      });
    });

    table.querySelectorAll('.no-export').forEach((element: HTMLElement)=>{
      element.remove();
    })

    table.querySelectorAll('.no-export-wrapper').forEach((wrapper: HTMLElement)=>{
      const parent = wrapper.parentElement;
      if(parent)
      {
        while(wrapper.firstChild)
        {
          parent.insertBefore(wrapper.firstChild, wrapper);
        }
        wrapper.remove();
      }
    })

    table.querySelectorAll('.target-element').forEach((element: HTMLElement) => {
      element.removeAttribute('class');
    });
  },

  todocument(html: string)
  {
    return pretty(`
      <?xml version="1.0"?>
      <!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Strict//EN"
          "http://www.w3.org/TR/xhtml1/DTD/xhtml1-strict.dtd">
      <html xmlns="http://www.w3.org/1999/xhtml" lang="en" xml:lang="en">
      <head>
        <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
        <title>${Config.name}</title>
        <style>
          table {
            border-collapse: collapse;
            table-layout: fixed;
            width: 100%;
          }
          td, th {
            border: solid 1px;
            vertical-align: top;
            padding: 0.3em;
          }
        </style>
      </head>
      <body>
        ${html}
      </body>
    </html>
    `, {ocd: true})
  },

  urlextension(imgUrl: string)
  {
    let extension = 'png';
    if (imgUrl.startsWith('data:image/')) {
        const match = imgUrl.match(/^data:image\/(\w+);base64,/);
        if (match) {
            extension = match[1];
        }
    }
    else {
        extension = imgUrl.split('.').pop() || 'png';
    }
    return extension;
  },

  url2base64(table: HTMLTableElement, external=false): Promise<Map<string, Blob>> {
    const files = new Map<string, Blob>();
    const imageCache = new Map<string, string>();
    let fileidx = 1;
    const promises = Array.from(table.querySelectorAll("img")).map((img: any, index: number) => {
      const imgUrl = img.src || img.alt;
      if(imgUrl)
      {
        if (imageCache.has(imgUrl))
        {
          img.src = imageCache.get(imgUrl) as string;
          return Promise.resolve();
        }

        return fetch(imgUrl)
          .then((response) => response.blob()) // Fetch the image as a Blob
          .then((blob) => {
            const reader = new FileReader();

            return new Promise<void>((resolve, reject) => {
              reader.onloadend = function () {
                if(external)
                {
                  const extension = Html.urlextension(imgUrl);
                  const arrayBuffer = reader.result as ArrayBuffer;
                  const filename = "image-"+fileidx+"."+extension;
                  let mimeType = 'image/png';

                  if (extension === 'jpg' || extension === 'jpeg') mimeType = 'image/jpeg';
                  else if (extension === 'svg') mimeType = 'image/svg+xml';
                  else if (extension === 'gif') mimeType = 'image/gif';
                  else if (extension === 'webp') mimeType = 'image/webp';
                  const fileBlob = new Blob([arrayBuffer], { type: mimeType });

                  if(imageCache.get(imgUrl)) {
                    img.src = imageCache.get(imgUrl);
                  }
                  else {
                    img.src = "./"+filename;
                    files.set(filename, fileBlob);
                    imageCache.set(imgUrl, filename);
                    fileidx+=1;
                  }
                }
                else
                {
                  const extension = imgUrl.split('.').pop() || 'png';
                  const base64Data = reader.result as string;
                  img.src = base64Data;
                  imageCache.set(imgUrl, base64Data);
                }

                if(img.alt.includes("data:image/"))
                {
                  img.removeAttribute("alt");
                }

                resolve();
              };

              reader.onerror = reject;
              if(external)
              {
                reader.readAsArrayBuffer(blob);
              }
              else
              {
                reader.readAsDataURL(blob);
              }
            });
          })
          .catch((error) => {
            Zotero.log("Error loading image:"+error);
          });
        }
        return Promise.resolve();
      });
    return Promise.all(promises).then(() => {return files});
  }
}

export default Html
