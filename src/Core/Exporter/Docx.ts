import { Document, Packer, Table, TableCell, TableRow, TextRun, ImageRun, Paragraph, IImageOptions} from "docx";
import Html2Docx from './Html2Docx'

const TEXT_NODE = 3;
const ELEMENT_NODE = 1;

const Docx = {
  blockElements: new Set(["address", "article", "aside", "audio", "blockquote", "body", "canvas", "dd", "div", "dl", "dt", "fieldset", "figcaption", "figure", "footer", "form", "h1", "h2", "h3", "h4", "h5", "h6", "header", "hr", "html", "iframe", "legend", "main", "nav", "noscript", "ol", "output", "p", "pre", "section", "table", "tbody", "td", "textarea", "tfoot", "th", "thead", "tr", "ul"]),
  
  inlineElements: new Set(["a", "abbr", "b", "bdi", "bdo", "br", "button", "cite", "code", "data", "datalist", "del", "dfn", "em", "i", "iframe", "img", "input", "ins", "kbd", "label", "map", "mark", "meter", "noscript", "object", "output", "picture", "q", "ruby", "s", "samp", "select", "small", "span", "strong", "sub", "sup", "svg", "template", "textarea", "time", "u", "var", "wbr"]),

  async start(table: HTMLTableElement): Promise<Blob> {
    const rows = Array.from(table.rows) as HTMLTableRowElement[];
    const docRows = await Promise.all(
      rows.map(async (row) => {
        const docCells = await Promise.all(
          Array.from(row.cells).map(async (cell) => new TableCell(
          {
            children: await Html2Docx.parse(cell as HTMLTableCellElement)
          }))
        );
        return new TableRow({ children: docCells });
      })
    );

    const doc = new Document({
      sections: [{ children: [new Table({ rows: docRows })] }],
    });

    const docxBuffer = await Packer.toBlob(doc);
    return new Blob([docxBuffer], {
      type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    });
  },

/**
  async parse(cell: HTMLTableCellElement): Promise<TableCell> {
    // const children = await Docx.parseChildren(cell);
    const children = await Docx.parseHtml(cell);
    return new TableCell({ children });
  },
  
  async render(element: HTMLElement)
  {
    const data = await parseHtml(element);
    
  }
  
  async parseHtml(element: HTMLElement) {
    const children: any[] = [];
    const tag = element?.tagName?.toLowerCase();
    for(const child of element.childNodes) {
      if(child?.nodeType === TEXT_NODE) {
        children.push({
          text: child?.textContent?.trim(),
        });
      } else if(child && child?.nodeType === ELEMENT_NODE) {
        children.push(Docx.parseHtml(child as HTMLElement));
      }
    }
    return {
      tag: tag,
      children: Docx.regroup(children),
    };
  },
  
  regroup(children: any[])
  {
    let merged = [];
    let inlineGroup = [];

    for (let child of children) {
      if (Docx.inlineElements.has(child.tag) || typeof child.text !== "undefined") {
        inlineGroup.push(child);
      } else {
        if (inlineGroup.length > 0) {
          merged.push({ tag: "div", children: inlineGroup});
          inlineGroup = [];
        }
        merged.push(child);
      }
    }
    if (inlineGroup.length > 0) {
      merged.push({ tag: "div", children: inlineGroup });
    }
    return merged;
  },
  
  async parseChildren(element: HTMLElement): Promise<Paragraph[]> {
    const paragraphs: any[] = [];
    let currentParagraph: Paragraph | null = null;

    for (const child of element.childNodes) {
      let children = [];
      if(child?.nodeType === TEXT_NODE) {
        const text = child?.textContent?.trim();
        if (text) {
          if (currentParagraph) {
            // currentParagraph.root.push(new TextRun(text));
          } else {
            currentParagraph = new Paragraph({ children: [new TextRun(text)] });
            paragraphs.push(currentParagraph);
          }
        }
      }
      else if (child?.nodeType === ELEMENT_NODE) {
        const el = child as HTMLElement;
        const tagName = el.tagName.toLowerCase();

        if (tagName === "a") {
          const text = el.textContent?.trim() || "";
          const url = el.getAttribute("href") || "";
          children = [
            new TextRun({ text, style: "Hyperlink" }),
            new TextRun({ text: ` (${url})`, italics: true, color: "0000FF" }),
          ]
          
          paragraphs.push(
            new Paragraph({
              children: children,
            })
          );
        } 
        else if (tagName === "img") {
          const imageRun = await Docx.processImage(el);
          children = [imageRun];
          paragraphs.push(new Paragraph({ children: children }));
        }
        else if (tagName === "fieldset" || tagName === "div") {
          // Recursively process fieldset or div contents
          const childParagraphs = await Docx.parseChildren(el);
          paragraphs.push(...childParagraphs);
        } 
        else {
          // Default handling for other elements
          const childParagraphs = await Docx.parseChildren(el);
          paragraphs.push(...childParagraphs);
        }
      }
    }
    return paragraphs.length > 0 ? paragraphs : [new Paragraph("")]; // Ensure at least one paragraph
  },

  async processImage(el: HTMLElement): Promise<ImageRun | TextRun> {
    const src = el.getAttribute("src") || "";
    const altText = el.getAttribute("alt") || "Image";

    if(!src) return new TextRun(``);
    
    if(src.toLowerCase().endsWith(".svg")) {
      return new TextRun(`${src}`);
    }
    
    try{
      const response = await fetch(src);
      const blob = await response.blob();
      const arrayBuffer = await blob.arrayBuffer();
      return new ImageRun({
        data: arrayBuffer,
        transformation: { width: 100, height: 100 },
      } as IImageOptions);
    } catch (error) {
      return new TextRun(``);
    }
  },
  */
};

export default Docx;
