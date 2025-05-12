import { Paragraph, TextRun, TableCell, IImageOptions, ImageRun } from "docx";

const TEXT_NODE = 3;
const ELEMENT_NODE = 1;

const Html2Docx = {
  blockElements: new Set<string>([
    "address", "article", "aside", "audio", "blockquote", "body", "canvas", "dd", "div", "dl", "dt",
    "fieldset", "figcaption", "figure", "footer", "form", "h1", "h2", "h3", "h4", "h5", "h6",
    "header", "hr", "html", "iframe", "legend", "main", "nav", "noscript", "ol", "output", "p",
    "pre", "section", "table", "tbody", "td", "textarea", "tfoot", "th", "thead", "tr", "ul"
  ]),

  inlineElements: new Set<string>([
    "a", "abbr", "b", "bdi", "bdo", "br", "button", "cite", "code", "data", "datalist", "del",
    "dfn", "em", "i", "iframe", "img", "input", "ins", "kbd", "label", "map", "mark", "meter",
    "noscript", "object", "output", "picture", "q", "ruby", "s", "samp", "select", "small",
    "span", "strong", "sub", "sup", "svg", "template", "textarea", "time", "u", "var", "wbr"
  ]),

  headingMap: {
    h1: "Heading1",
    h2: "Heading2",
    h3: "Heading3",
    h4: "Heading4",
    h5: "Heading5",
    h6: "Heading6",
  } as Record<string, string>, // Explicit typing

  async parse(element: HTMLElement): Promise<Paragraph[]> {
    let children: Paragraph[] = [];
    let currentRuns: TextRun[] = [];

    async function processNode(node: Node, listLevel: number = 0): Promise<void> {
      if (node.nodeType === TEXT_NODE) {
        let text = node.textContent?.trim();
        if (text) {
          text = text+" ";
          let textStyle = Html2Docx.getstyles(node as HTMLElement);

          const textobj = {text, ...textStyle};
          currentRuns.push(new TextRun(textobj));
        }
      } else if (node.nodeType === ELEMENT_NODE) {
        const tagName = (node as HTMLElement).tagName.toLowerCase();
        const element = node as HTMLElement;

        if (Html2Docx.blockElements.has(tagName)) {
          if (currentRuns.length > 0) {
            let parStyle = {}; //Html2Docx.getstyles(node as HTMLElement, true);
            const parobject = { children: currentRuns, ...parStyle};
            children.push(new Paragraph(parobject));
            currentRuns = [];
          }

          if (Html2Docx.headingMap[tagName]) {
            children.push(new Paragraph({
              text: element.textContent?.trim() || "",
              heading: Html2Docx.headingMap[tagName] as any
            }));
          } else if (tagName === "ul" || tagName === "ol") {
            let isOrdered = tagName === "ol";
            for (const child of Array.from(element.childNodes)) {
              if(child) await processNode(child, listLevel + 1);
            }
          } else if (tagName === "li") {
            children.push(new Paragraph({
              text: element.textContent?.trim() || "",
              bullet: { level: listLevel }
            }));
          } else {
            for (const child of Array.from(element.childNodes)) {
              if(child) await processNode(child);
            }
            children.push(new Paragraph({}));
          }
        } else if (tagName === "br") {
          currentRuns.push(new TextRun({ break: 1 }));
        } else if (tagName === "img") {
          const img = node as HTMLElement;
          const td = img.closest("td") as HTMLElement;
          img.setAttribute("width", "100%");
          img.setAttribute("height", "");
          img.style.width = '100%';
          img.style.height = "";
          td.style.visibility = 'hidden';
          td.style.position = 'absolute';
          td.style.top = '-9999px';
          td.style.left = '-9999px';
          
          window.document.body.appendChild(td);
          const image = await Html2Docx.processImage(element);
          currentRuns.push(image);
          window.document.body.removeChild(td);
        } else if (tagName === "a") {
          let href = element.getAttribute("href");
          let linkText = element.textContent?.trim() || href || "";
          if (href) {
            currentRuns.push(new TextRun({
              text: linkText,
              style: "Hyperlink",
            }));
          }
        } else {
          let textStyle = Html2Docx.getstyles(node as HTMLElement);
          let text = element.textContent?.trim();
          if (text) {
            text = text+" ";
            const textobj = {text, ...textStyle};
            currentRuns.push(new TextRun(textobj));
          }
        }
      }
    }

    for (const node of Array.from(element.childNodes)) {
      if(node) await processNode(node);
    }

    if (currentRuns.length > 0) {
      children.push(new Paragraph({ children: currentRuns }));
    }
    return children;
  },

  getstyles(node: HTMLElement | null, self=false) {
    let textStyle: any = {};

    const tagName = node?.tagName?.toLowerCase();
    if(tagName)
    {
      if (tagName === "b" || tagName === "strong") textStyle.bold = true;
      if (tagName === "i" || tagName === "em") textStyle.italics = true;
      if (tagName === "u") textStyle.underline = {};
      if (tagName === "s" || tagName === "del") textStyle.strike = true;
      if (tagName === "sub") textStyle.subscript = true;
      if (tagName === "sup") textStyle.superscript = true;
    }

    let inlineStyle = null;

    if(self)
    {
      inlineStyle = node?.style;
    }
    else if(node?.closest)
    {
      inlineStyle = (node?.closest("[style]") as HTMLElement)?.style;
    }

    if(inlineStyle)
    {
      if (inlineStyle.fontWeight === "bold") textStyle.bold = true;
      if (inlineStyle.fontStyle === "italic") textStyle.italics = true;
      if (inlineStyle.textDecoration.includes("underline")) textStyle.underline = {};
      if (inlineStyle.textDecoration.includes("line-through")) textStyle.strike = true;
      if (inlineStyle.verticalAlign === "sub") textStyle.subscript = true;
      if (inlineStyle.verticalAlign === "super") textStyle.superscript = true;
      if (inlineStyle.color) textStyle.color = Html2Docx.rgbaToBlendedHex(inlineStyle.color);
      if (inlineStyle.fontSize) textStyle.fontSize = parseInt(inlineStyle.fontSize, 10);
      if (inlineStyle.background) textStyle.shading = {
        fill: Html2Docx.rgbaToBlendedHex(inlineStyle.background)
        // fill: inlineStyle.background
      }
    }

    // Extract computed styles from CSS
    if(node?.nodeType===ELEMENT_NODE)
    {
      const computedStyle = window.getComputedStyle(node as HTMLElement);
      if(computedStyle)
      {
        if (computedStyle.fontWeight === "bold") textStyle.bold = true;
        if (computedStyle.fontStyle === "italic") textStyle.italics = true;
        if (computedStyle.textDecoration.includes("underline")) textStyle.underline = {};
        if (computedStyle.textDecoration.includes("line-through")) textStyle.strike = true;
        if (computedStyle.verticalAlign === "sub") textStyle.subscript = true;
        if (computedStyle.verticalAlign === "super") textStyle.superscript = true;
        if (computedStyle.color) textStyle.color = Html2Docx.rgbaToBlendedHex(computedStyle.color);
        if (computedStyle.fontSize) textStyle.fontSize = parseInt(computedStyle.fontSize, 10);
        if (computedStyle.background) textStyle.shading = {
          fill: Html2Docx.rgbaToBlendedHex(computedStyle.background)
          // fill: computedStyle.background
        }
      }
    }
    return textStyle;
  },

  async convertSvgToPng(url: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const img = new window.Image();

      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext("2d");

        if (ctx) {
          ctx.drawImage(img, 0, 0);
          resolve(canvas.toDataURL('image/png'));
        } else {
          reject(new Error("Canvas context unavailable"));
        }
      };

      img.onerror = reject;
      img.src = url;
    });
  },
  
  rgbaToBlendedHex(rgba: string, bgColor: string = "#ffffff"): string {
    Zotero.log("In: "+rgba);
    const rgbaMatch = rgba.match(/rgba?\(\s*(\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\s*\)/i);
    if (!rgbaMatch)
    {
      Zotero.log(`Error: Invalid RGB(${rgba}) format`);
      return rgba;
    }

    const r = parseInt(rgbaMatch[1], 10);
    const g = parseInt(rgbaMatch[2], 10);
    const b = parseInt(rgbaMatch[3], 10);
    const a = rgbaMatch[4] !== undefined ? parseFloat(rgbaMatch[4]) : 1;

    // Convert background to RGB
    const bgMatch = bgColor.match(/^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i);
    if (!bgMatch) throw new Error("Invalid background color");

    const br = parseInt(bgMatch[1], 16);
    const bg = parseInt(bgMatch[2], 16);
    const bb = parseInt(bgMatch[3], 16);

    // Blend function
    const blend = (fg: number, bg: number) => Math.round((1 - a) * bg + a * fg);
    const toHex = (n: number) => n.toString(16).padStart(2, '0');
    const v = `#${toHex(blend(r, br))}${toHex(blend(g, bg))}${toHex(blend(b, bb))}`;
    Zotero.log("Out :"+v);
    return v;
  },
  
  rgbaToHex(rgba: string): string {
    const result = rgba.match(/rgba?\((\d+),\s*(\d+),\s*(\d+),?\s*([\d\.]+)?\)/);
    if (!result) throw new Error("Invalid RGBA format");

    const r = parseInt(result[1]);
    const g = parseInt(result[2]);
    const b = parseInt(result[3]);
    const a = result[4] !== undefined ? Math.round(parseFloat(result[4]) * 255) : 255;

    const toHex = (n: number) => n.toString(16).padStart(2, '0');
    
    const v = `#${toHex(r)}${toHex(g)}${toHex(b)}${a !== 255 ? toHex(a) : ''}`;
    
    Zotero.log("out: "+v);
    return v;
  },
  
  hexcolor(color: string) {
    const rgbValues = color.match(/\d+/g);
    if (rgbValues && rgbValues.length === 3) {
      const [r, g, b] = rgbValues.map(Number); // Convert strings to numbers
      return `${(1 << 24 | (r << 16) | (g << 8) | b).toString(16).slice(1).toUpperCase()}`;
    } else {
      return color;
    }
  },

  async processImage(el: HTMLElement): Promise<ImageRun | TextRun> {
    let src = el.getAttribute("src") || el.getAttribute("alt");
    if (!src) return new TextRun("[Image missing]");

    if(src.toLowerCase().endsWith(".svg") || src.startsWith("data:image/svg+xml;") || src.startsWith("data:image/svg+xml,"))
    {
      src = await this.convertSvgToPng(src);
    }

    try {
      const response = await fetch(src);
      if (!response.ok) throw new Error("Failed to fetch image");

      const blob = await response.blob();
      const arrayBuffer = await blob.arrayBuffer();
      const mimeType = blob.type;
      const extension = mimeType.split("/")[1] as "jpg" | "png" | "gif" | "bmp";
      let { width, height }  = await this.imagesize(el as HTMLImageElement);
      
      if(el.className=="group-icon")
      {
        width = 10;
        height = 10;
      }
      
      return new ImageRun({
        type: extension,
        data: arrayBuffer,
        transformation: { width: height, height: height },
      } as IImageOptions);
    } catch (error) {
      console.error("Image error:", error);
      return new TextRun(`[Image error] ${error}`);
    }
  },
  
  imagesize(img?: HTMLImageElement): Promise<{ width: number; height: number }> {
    return new Promise((resolve, reject) => {
      if(!img)
      {
        return reject("No image found!");
      }
    
      const maybeResolve = () => {
        const rect = img.getBoundingClientRect();
        const width = Math.round(img.naturalWidth);
        const height = Math.round(img.naturalHeight);
        resolve({ width: width, height: height });
      };

      // If img is still loading
      if (img instanceof window.HTMLImageElement && (!img.complete || img.naturalWidth === 0)) {
        img.onload = maybeResolve;
        img.onerror = (e) => {
          reject(e);
        };
      } else {
        maybeResolve();
      }
    });
  }
};

export default Html2Docx;
