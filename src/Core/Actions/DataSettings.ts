import { FaNoteSticky, FaQuoteLeft, FaBook } from 'react-icons/fa6';

const DataSettings = {
  filesafename(name: string): string {
    return name
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9\-]/g, "");
  },
  
  generate(item: any) {
    /**
      Annotation-part is also used in notes
      May need to use a cleaner name to refer to both
    */
    
    const datasettings_ = Array.from(item.data.table.querySelectorAll(".annotation-part"))
      .reduce((acc: Record<string, any>, e: any) => {
        const label = e.innerText.trim();
        const key = `display-data-${label}`;
        
        if (label) {
          acc[key] = {
            label: label,
            slug: this.filesafename(label),
            options: ["true", "false"],
            default: "false",
            className: "data-checkbox",
            icon: FaNoteSticky,
          };
        }
        return acc;
      }, {});
    
    const quote = {
      label: "Quotes",
      slug: "quote",
      className: "data-checkbox",
      style: { color: "red", fontWeight: "bolder" },
      options: ["true", "false"],
      default: "true",
      icon: FaQuoteLeft,
    };

    const citation = {
      label: "Sources",
      slug: "source",
      options: ["true", "false"],
      className: "data-checkbox",
      style: { color: "red", fontWeight: "bolder" },
      default: "true",
      icon: FaBook,
    };
    
    const datasettings__ = typeof datasettings_ === 'object' && datasettings_ !== null ? datasettings_ : {};
    
    /** Sort settings by key */
    const datasettings___ = Object.keys(datasettings__)
      .sort()
      .reduce((sortedObj: Record<string, any>, key) => {
        sortedObj[key] = datasettings__[key];
        return sortedObj;
      }, {});
    
    return {
      displayquote: quote,
      displaycitation: citation,
      ...datasettings___,
    };
  }
};

export default DataSettings;
