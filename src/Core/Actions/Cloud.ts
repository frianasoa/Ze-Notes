import React from "react";
import DataExporter from "../Exporter/DataExporter";
import DropboxUploadDialog from "../../Components/Dialog/DropboxUploadDialog";
import DropboxDownloadDialog from "../../Components/Dialog/DropboxDownloadDialog";

const Cloud = {
  dropboxupload(item: zty.ContextMenuData, celldata: zty.CellData) {
    const children = React.createElement(DropboxUploadDialog, {
      collectionid: celldata.collectionid,
      upload: (email: string) => {
        if (email.length == 0) {
          window.alert("Please input destination email address");
          return;
        }
        DataExporter.exportall(celldata.collectionid, email)
          .then(() => {
            item?.data?.callback({ isOpen: false });
          })
          .catch((e: any) => {
            Zotero.log("Actions.dropboxupload: " + e);
            window.alert("Dropbox upload failed: " + e);
          });
      },
    });

    item?.data?.callback({
      title: "Upload to dropbox",
      children: children,
      isOpen: true,
    });
  },

  dropboxdownload(item: zty.ContextMenuData, celldata: zty.CellData) {
    const children = React.createElement(DropboxDownloadDialog, {
      collectionid: celldata.collectionid,
      download: (email: string) => {
        window.alert(email);
      },
    });

    item?.data?.callback({
      title: "Download from dropbox",
      children: children,
      isOpen: true,
    });
  },
};

export default Cloud;
