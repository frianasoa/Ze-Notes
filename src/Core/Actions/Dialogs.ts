import React from "react";
import Config from "../../Config";
import TablePrefs from "../TablePrefs";
import Exporter from "../Exporter";
import TableSettings from "./TableSettings";
import DataSettings from "./DataSettings";
import TableSortContents from "../../Components/Dialog/TableSortContents";
import ColumnSortContents from "../../Components/Dialog/ColumnSortContents";
import ExportSettingDialog from "../../Components/Dialog/ExportSettingDialog";
import DataSettingDialog from "../../Components/Dialog/DataSettingDialog";
import Reload from "./Reload";

import { emitter } from "../../Components/EventEmitter";

const Dialogs = {
  async opensettings(item: zty.ContextMenuData, celldata: zty.CellData) {
    const win = Zotero.Utilities.Internal.openPreferences(Config.id);
    win?.addEventListener("close", function () {
      Reload.reload();
    });
  },

  opentextfinder(item: zty.ContextMenuData, celldata: zty.CellData) {
    setTimeout(() => {
      emitter.emit("toggleFinder", true);
    }, 10);
  },

  filterdata(item: zty.ContextMenuData, celldata: zty.CellData) {
    TablePrefs.set(celldata.collectionid, "data-filter", item.data.filter).then((k: any) => {
      Reload.reload();
    });
  },

  async showtablesortdialog(item: zty.ContextMenuData, celldata: zty.CellData) {
    const close = () => {
      item?.data?.callback({
        title: "",
        isOpen: false,
      });
    };

    const buttons = [
      {
        action: () => {
          close();
          Reload.reload(item, celldata);
        },
        label: "Reload",
      },
      {
        action: () => {
          close();
        },
        label: "Close",
      },
    ];

    const children = React.createElement(TableSortContents, { item: item, celldata: celldata, buttons: buttons });

    item?.data?.callback({
      title: "Table sort",
      children: children,
      isOpen: true,
    });
  },

  async showcolumnsortdialog(item: zty.ContextMenuData, celldata: zty.CellData) {
    const close = () => {
      item?.data?.callback({
        title: "",
        isOpen: false,
      });
    };

    const allcolumns = item?.data?.headers;
    const buttons = [
      {
        action: async () => {
          close();
          Reload.reload(item, celldata);
        },
        label: "Reload",
      },
      {
        action: async () => {
          return TablePrefs.set(celldata.collectionid, "hide-key", "[]");
        },
        label: "Show all",
      },
      {
        action: async () => {
          return TablePrefs.set(celldata.collectionid, "hide-key", JSON.stringify(allcolumns));
        },
        label: "Hide all",
      },
      {
        action: async () => {
          close();
        },
        label: "Close",
      },
    ];

    const children = React.createElement(ColumnSortContents, { item: item, celldata: celldata, buttons: buttons });

    item?.data?.callback({
      title: item.label ?? "Column select & sort",
      children: children,
      isOpen: true,
    });
  },

  async showaidatasettings(item: zty.ContextMenuData, celldata: zty.CellData) {
    const datasettings = DataSettings.generate(item);

    const close = () => {
      item?.data?.callback({
        title: "",
        isOpen: false,
      });
    };

    const handleUpdate = (data: any) => {
      const buttons = [
        {
          action: () => {
            close();
          },
          label: "Close",
        },
      ];

      item?.data?.callback({
        title: "AI data settings",
        children: children,
        isOpen: true,
        buttons: buttons,
      });
    };

    const children = React.createElement(DataSettingDialog, {
      datasettings: datasettings,
      onUpdate: handleUpdate,
      collectionid: celldata.collectionid,
    });

    item?.data?.callback({
      title: "AI data settings",
      children: children,
      isOpen: true,
    });
  },

  async exportas(item: zty.ContextMenuData, celldata: zty.CellData) {
    const datasettings = DataSettings.generate(item);

    const tablesettings = TableSettings.generate(item);

    const close = () => {
      item?.data?.callback({
        title: "",
        isOpen: false,
      });
    };

    const save = async (settings: any) => {
      const filename = await Exporter.start(item.data.table, item.data.table.dataset.collectionname, settings);
      if (filename) {
        Zotero.launchURL("file:///" + filename);
      }
    };

    const handleUpdate = (data: any) => {
      const buttons = [
        {
          action: () => {
            save(data);
            close();
          },
          label: "Export",
        },
        {
          action: () => {
            close();
          },
          label: "Close",
        },
      ];

      item?.data?.callback({
        title: "Export setting",
        children: children,
        isOpen: true,
        buttons: buttons,
      });
    };

    const children = React.createElement(ExportSettingDialog, {
      datasettings: datasettings,
      tablesettings: tablesettings as Record<string, any>,
      onUpdate: handleUpdate,
      collectionid: celldata.collectionid,
    });

    item?.data?.callback({
      title: "Export setting",
      children: children,
      isOpen: true,
    });
  },
};

export default Dialogs;
