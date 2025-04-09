import {FaFolder, FaTag, FaTableCellsLarge, FaHighlighter, FaTags, FaCircleXmark, FaIcons }  from "react-icons/fa6";

const TableSettings = {
  generate(item: any) {
    return {
      "Styles" : {
        removetdstyle: {label: "Remove td style", slug: "remove-td-style", options: ["true", "false"], default: "false", icon: FaTableCellsLarge},
        removehighlights: {label: "Remove highlights", slug: "remove-highlights", options: ["true", "false"], default: "false", icon: FaHighlighter},
        removeicons: {label: "Remove icons", slug: "remove-group-icons", options: ["true", "false"], default: "false", icon: FaIcons},
      },

      "Legends": {
        removemainlegends: {label: "Remove main legends", slug: "remove-main-legends", options: ["true", "false"], default: "false", icon: FaTags},
        removesublegends: {label: "Remove sub legends", slug: "remove-sub-legends", options: ["true", "false"], default: "false", icon: FaTag},
      },

      "Contents": {
        removeempty: {label: "Remove empty elements", slug: "remove-empty-element", options: ["true", "false"], default: "true", icon: FaCircleXmark},
      },

      "Output": {
        createfolder: {label: "Create save folder", slug: "create-folder", options: ["true", "false"], default: "false", icon: FaFolder},
      }
    }
  }
}

export default TableSettings;
