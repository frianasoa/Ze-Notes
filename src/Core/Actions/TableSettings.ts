import {
  FaFolder,
  FaTag,
  FaTableCellsLarge,
  FaHighlighter,
  FaTags,
  FaCircleXmark,
  FaIcons,
  FaTableList,
  FaUserPen,
  FaCalendarDay,
  FaHeading,
  FaBuilding,
  FaNewspaper,
  FaBook,
  FaShapes,
  FaLink,
  FaBarcode,
  FaGlobe,
  FaLayerGroup,
  FaListOl,
  FaFileLines,
  FaAlignLeft,
  FaClock,
  FaMicrophoneLines,
} from "react-icons/fa6";

const TableSettings = {
  generate(item: any) {
    return {
      Styles: {
        removetdstyle: {
          label: "Remove td style",
          slug: "remove-td-style",
          options: ["true", "false"],
          default: "false",
          icon: FaTableCellsLarge,
        },
        removehighlights: {
          label: "Remove highlights",
          slug: "remove-highlights",
          options: ["true", "false"],
          default: "false",
          icon: FaHighlighter,
        },
        removeicons: {
          label: "Remove icons",
          slug: "remove-group-icons",
          options: ["true", "false"],
          default: "false",
          icon: FaIcons,
        },
      },

      Legends: {
        removemainlegends: {
          label: "Remove main legends",
          slug: "remove-main-legends",
          options: ["true", "false"],
          default: "false",
          icon: FaTags,
        },
        removesublegends: {
          label: "Remove sub legends",
          slug: "remove-sub-legends",
          options: ["true", "false"],
          default: "false",
          icon: FaTag,
        },
      },

      Contents: {
        removeempty: {
          label: "Remove empty elements",
          slug: "remove-empty-element",
          options: ["true", "false"],
          default: "true",
          icon: FaCircleXmark,
        },
      },

      Output: {
        createfolder: {
          label: "Create save folder",
          slug: "create-folder",
          options: ["true", "false"],
          default: "false",
          icon: FaFolder,
        },
      },

      "Style (YDocx)": {
        ydocxstyle: {
          label: "Interview style",
          slug: "ydocx-style",
          options: ["Normal", "Interview"],
          default: "Normal",
          icon: FaMicrophoneLines,
        },
      },

      "Metadata table (YDocx)": {
        ydocxmetadata: {
          label: "Add metadata table",
          slug: "ydocx-metadata-table",
          options: ["true", "false"],
          default: "true",
          icon: FaTableList,
        },
        ydocxmetaauthor: {
          label: "Author",
          slug: "ydocx-meta-author",
          options: ["true", "false"],
          default: "true",
          icon: FaUserPen,
        },
        ydocxmetayear: {
          label: "Year",
          slug: "ydocx-meta-year",
          options: ["true", "false"],
          default: "true",
          icon: FaCalendarDay,
        },
        ydocxmetatitle: {
          label: "Title",
          slug: "ydocx-meta-title",
          options: ["true", "false"],
          default: "true",
          icon: FaHeading,
        },
        ydocxmetapublisher: {
          label: "Publisher",
          slug: "ydocx-meta-publisher",
          options: ["true", "false"],
          default: "true",
          icon: FaBuilding,
        },
        ydocxmetajournal: {
          label: "Journal / Publication",
          slug: "ydocx-meta-journal",
          options: ["true", "false"],
          default: "false",
          icon: FaNewspaper,
        },
        ydocxmetabooktitle: {
          label: "Book Title",
          slug: "ydocx-meta-book-title",
          options: ["true", "false"],
          default: "false",
          icon: FaBook,
        },
        ydocxmetaitemtype: {
          label: "Item Type",
          slug: "ydocx-meta-item-type",
          options: ["true", "false"],
          default: "false",
          icon: FaShapes,
        },
        ydocxmetadoi: {
          label: "DOI",
          slug: "ydocx-meta-doi",
          options: ["true", "false"],
          default: "false",
          icon: FaLink,
        },
        ydocxmetaisbn: {
          label: "ISBN",
          slug: "ydocx-meta-isbn",
          options: ["true", "false"],
          default: "false",
          icon: FaBarcode,
        },
        ydocxmetaurl: {
          label: "URL",
          slug: "ydocx-meta-url",
          options: ["true", "false"],
          default: "false",
          icon: FaGlobe,
        },
        ydocxmetavolume: {
          label: "Volume",
          slug: "ydocx-meta-volume",
          options: ["true", "false"],
          default: "false",
          icon: FaLayerGroup,
        },
        ydocxmetaissue: {
          label: "Issue",
          slug: "ydocx-meta-issue",
          options: ["true", "false"],
          default: "false",
          icon: FaListOl,
        },
        ydocxmetapages: {
          label: "Pages",
          slug: "ydocx-meta-pages",
          options: ["true", "false"],
          default: "false",
          icon: FaFileLines,
        },
        ydocxmetaabstract: {
          label: "Abstract",
          slug: "ydocx-meta-abstract",
          options: ["true", "false"],
          default: "false",
          icon: FaAlignLeft,
        },
        ydocxmetadateadded: {
          label: "Date Added",
          slug: "ydocx-meta-date-added",
          options: ["true", "false"],
          default: "false",
          icon: FaClock,
        },
        ydocxmetatags: {
          label: "Tags",
          slug: "ydocx-meta-tags",
          options: ["true", "false"],
          default: "false",
          icon: FaTags,
        },
      },
    };
  },
};

export default TableSettings;
