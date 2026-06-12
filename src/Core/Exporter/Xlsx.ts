import ExcelJS from 'exceljs';
import HtmlElements from './HtmlElements';

const Xlsx = {
  blockElements: HtmlElements.blockElements,

  inlineElements: HtmlElements.inlineElements,
  
  superBlockElements: new Set(["div", "p", "fieldset"]),
  
  async start(table: HTMLTableElement) {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Sheet1');
    
    const rows = Array.from(table.rows);
    rows.forEach((row, rowIndex) => {
      const cells = Array.from((row as HTMLTableRowElement).cells);
      cells.forEach((cell, colIndex) => {
        worksheet.getCell(rowIndex + 1, colIndex + 1).value = this.render(cell as HTMLTableCellElement);
      });
    });
    
    const blob = await workbook.xlsx.writeBuffer();
    return new Blob([blob], {type:"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"});
  },
  
  render(cell: HTMLElement): string {
    const TEXT_NODE = 3;
    const ELEMENT_NODE = 1;
    
    // Explicitly filter out nulls and ensure types are ChildNode
    const children: ChildNode[] = Array.from(cell.childNodes).filter(
      (child): child is ChildNode => child !== null
    );

    return children
      .map((child) => {
        if (child.nodeType === TEXT_NODE) {
          // Handle text nodes: trim and return the text
          return child.textContent?.trim() || "";
        }

        if (child.nodeType === ELEMENT_NODE) {
          const element = child as HTMLElement;

          // Recursively render child elements
          const renderedContent = this.render(element);

          if (this.blockElements.has(element.tagName.toLowerCase())) {
            let extrabreak = "";
            if(this.superBlockElements.has(element.tagName.toLowerCase()))
            {
              extrabreak = "\n";
            }
            return `${renderedContent}\n${extrabreak}`;
          }

          if (this.inlineElements.has(element.tagName.toLowerCase())) {
            // Inline elements: Add a space after their content
            return `${renderedContent} `;
          }

          // Fallback for other elements: Treat as inline
          return `${renderedContent} `;
        }

        // Ignore other node types (e.g., comments)
        return "";
      })
      .join("")
      .trim();
  },

}

export default Xlsx;
