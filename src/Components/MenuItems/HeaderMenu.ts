import Actions from '../../Core/Actions';
import Icons from "./Icons";
import { FaArrowsRotate, FaEye, FaEyeSlash, FaVectorSquare, FaBan, FaHashtag, FaTableCells, FaFilter} from "react-icons/fa6";


const Header = {
  data: {
    datafilter: {
      label: 'Filter data',
      state: 'active',
      icon: FaFilter,
      submenu: {
        dataall: {
          label: 'Show all',
          icon: FaTableCells,
          data: {filter: "all"},
          onClick: Actions.filterdata
        },
        datawithtags: {
          label: 'Show tagged only',
          icon: FaHashtag,
          data: {filter: "withtags"},
          onClick: Actions.filterdata
        },
        datawithouttags: {
          icon: FaBan,
          label: 'Show untagged only',
          data: {filter: "withouttags"},
          onClick: Actions.filterdata
        }
      }
    },
    showcolumns: {
      label: 'Show columns',
      state: 'active',
      icon: FaEye,
      submenu: {} as Record<string, zty.ContextMenuData>
    },
    showrows: {
      label: 'Show rows',
      state: 'active',
      icon: FaEye,
      submenu: {} as Record<string, zty.ContextMenuData>
    },
    hidecolumns: {
      label: 'Hide column',
      iconColor: 'red',
      state: 'active',
      icon: FaEyeSlash,
      onClick: Actions.hidecolumn
    },

    sep0: {label: "---"},

    tablesort: {
    },

    columnsort: {
    },

    sep1: {label: "---"},

    resetdefaultwidths: {
      label: 'Reset default widths',
      iconColor: 'red',
      state: 'active',
      icon: FaVectorSquare,
      data: {},
      onClick: Actions.resetwidths
    },
    sep: {label: "---"},
    exportas: {},
    sep2: {label: '---'},
    reloadpage: { label: 'Reload page', icon: FaArrowsRotate, onClick: Actions.reload },
    settings: {label: 'Open settings', icon: Icons.data["settings"], onClick: Actions.opensettings }
  }
}

export default Header;