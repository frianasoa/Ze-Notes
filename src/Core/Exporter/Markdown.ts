import TurndownService from 'turndown';
const turndownPluginGfm = require('@joplin/turndown-plugin-gfm');

const SHOW_TEXT = 4;

interface MarkdownType {
  turndownService: TurndownService | null;
  init(): void;
  div(): void;
  cleanTextNodes(el: HTMLElement): void;
  start(table: HTMLTableElement): Promise<string>;
  removeNamespace(table: HTMLTableElement): HTMLTableElement;
}

const Markdown: MarkdownType = {
  turndownService: null,
  init() {
    const gfm = turndownPluginGfm.gfm;
    this.turndownService = new TurndownService();
    this.turndownService.use(gfm);
    this.turndownService.keep(['div', 'hr', 'br', 'a', 'img', 'fieldset']);
    this.div();
  },
  
  div()
  {
    this.turndownService?.addRule('divs', {
			filter: ['div'],
			replacement: function (content: string, node:any) 
      {
			if(content.replace(/\s/g, '')){
				if(node.style.cssText)
				{
					return "<div style='"+node.style.cssText+"'>"+content.trim()+"</div>";
				}
				else
				{
					return "<div>"+content.trim()+"</div>";
				}
			}
			else {
				return "";
			}
		  }
		});
  },
  
  cleanTextNodes(el: HTMLElement): void {
    const walker = document.createTreeWalker(el, SHOW_TEXT);

    let node = walker.nextNode() as Text | null;
    while (node) {
      if (node.nodeValue) {
        node.nodeValue = node.nodeValue.replace(/[\r\n]+/g, ' ').replace(/\s\s+/g, ' ').trim();
      }
      node = walker.nextNode() as Text | null;
    }
  },
  
  removeNamespace(el: HTMLTableElement): HTMLTableElement {
    const newDoc = document.implementation.createHTMLDocument('');
    const newEl = newDoc.importNode(el, true) as HTMLTableElement;
    return newEl;
  },

  async start(table: HTMLTableElement): Promise<string> {
    // table.removeAttribute('xmlns');
    // table.removeAttribute('data-collectionname');
    // table.removeAttribute('data-libraryid');
    // table.removeAttribute('style');
    
    this.init();
    if (!this.turndownService) {
      throw 'TurndownService not initialized. Call init() first.';
    }
    const newTable = this.removeNamespace(table);
    // this.cleanTextNodes(newTable);
    // window.alert(newTable.outerHTML);
    const md = this.turndownService.turndown(newTable);
    return md;
  }
};

export default Markdown;
