import Prefs from "../Prefs";

const ELEMENT_NODE = 1;
const TEXT_NODE = 3;

const PromptFormat = {
  async data(target: any, collectionid: string) {
    const element = await this.filter(target, collectionid);
    if (!element || !element.tagName) {
      throw "Invalid element";
    }

    const tag = element.tagName.toLowerCase();
    const classList = element.className.split(" ");

    if (tag === "td" || tag === "th") {
      return this.cell(element, {});
    } else if (tag === "tr") {
      return this.row(element);
    } else if (tag === "table") {
      return this.table(element);
    } else if (classList.includes("zcontent")) {
      return this.zcontent(element);
    } else if (classList.includes("comment")) {
      return this.cell(element, {});
    } else {
      return this.defaultElement(element);
    }
  },

  async filter(target: any, collectionid: string)
  {
    let datasettings = {};
    let settings = await Prefs.get("data-settings-fields/" + collectionid, null);

    const clonedTarget = target.cloneNode(true);
    if(settings)
    {
      settings = JSON.parse(settings);
      datasettings = Object.fromEntries(
        Object.entries(settings)
          .filter(([key, value]) => key.startsWith("display-data-") && value === "true")
          .map(([key, value]) => [key.replace("display-data-", ""), value])
      );
    }

    if(settings?.displayquote === "false") {
      clonedTarget.querySelectorAll('.annotation-quote').forEach((element: HTMLElement) => {
        element.remove();
      });
    }

    if(settings?.displaycitation === "false") {
      clonedTarget.querySelectorAll('.annotation-source').forEach((element: HTMLElement) => {
        element.remove();
      });
    }
    else if(settings?.displayauthor === "false") {
      clonedTarget.querySelectorAll('.annotation-source').forEach((element: HTMLElement) => {
        element.innerHTML=" ("+(element.dataset.page || "n.p.")+")";
      });
    }

    /** Filter data with selected settings */
    clonedTarget.querySelectorAll('.annotation-part').forEach((element: HTMLElement) => {
      const legendText = element.innerText.trim();

      if (!datasettings.hasOwnProperty(legendText))
      {
        const fieldset = element.closest('fieldset');
        if (fieldset) {
          fieldset.remove();
        }
      }
    });
    return clonedTarget;
  },


  /** TODO here*/


  zcontent(element: HTMLElement): Record<string, any> {
    return {element: element.dataset.legend, value: element.innerText}
  },

  cell(element: HTMLElement, data: Record<string, any>): Record<string, any> {
    const key = element.dataset.column;
    if (!key) return data;
    if (!data[key]) {
        data[key] = [];
    }

    Array.from(element.querySelectorAll(".zcontent")).forEach((zcontent: any) => {
      data[key].push(PromptFormat.zcontent(zcontent))
    });
    return this.removeempty(data);
  },

  row(element: HTMLElement) {
    const data = {};
    (element.querySelectorAll("td") as NodeListOf<HTMLElement>).forEach((td) => {
      this.cell(td, data);
    });
    return this.unwrap(this.removeempty(data));
  },

  table(element: HTMLElement) {
    const rows: any[] = [];
    (element.querySelectorAll("tr") as NodeListOf<HTMLElement>).forEach((tr)=>{
      rows.push(this.row(tr));
    });
    return rows;
  },

  defaultElement(element: any) {
    return `${element.tagName || "Unknown"}`;
  },

  removeempty(obj: any): any {
    if (Array.isArray(obj)) {
      return obj.map(PromptFormat.removeempty).filter(item => !(typeof item === "object" && Object.keys(item).length === 0));
    } else if (typeof obj === "object" && obj !== null) {
      return Object.fromEntries(
        Object.entries(obj)
          .map(([key, value]) => [key, PromptFormat.removeempty(value)])
          .filter(([_, value]) => !(typeof value === "object" && Object.keys(value).length === 0))
      );
    }
    return obj;
  },

  unwrap(obj: any, unwrapSingle: boolean = true): any {
    if (Array.isArray(obj)) {
        // If unwrapSingle is true, unwrap single-element arrays
        if (unwrapSingle && obj.length === 1) {
            return obj[0];
        } else {
            return obj.map(item => this.unwrap(item, unwrapSingle));
        }
    } else if (typeof obj === 'object' && obj !== null) {
        const newObj: any = {};
        for (const key in obj) {
            if (obj.hasOwnProperty(key)) {
                newObj[key] = this.unwrap(obj[key], unwrapSingle);
            }
        }
        return newObj;
    } else {
        return obj;
    }
  }
};

export default PromptFormat;
