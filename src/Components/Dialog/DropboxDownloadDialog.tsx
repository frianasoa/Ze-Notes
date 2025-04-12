import React, { useState, useEffect } from "react";
import Prefs from "../../Core/Prefs";
import Dropbox from "../../Core/Cloud/Dropbox";
import Importer from "../../Core/Importer";

interface DropboxDownloadDialogProps {
  collectionid: string;
  download: (username: string) => void;
}

const DropboxDownloadDialog: React.FC<DropboxDownloadDialogProps> = ({ collectionid, download }) => {
  const [files, setFiles] = useState([]);
  useEffect(() => {
    const fetchFiles = async () => {
      const username = Zotero.Prefs.get("extensions.zotero.sync.server.username", true) as string;
      const dropboxfiles = await Dropbox.list(username);
      setFiles(dropboxfiles);
    };
    fetchFiles();
  }, []);
  
  const format = (d: string) => {
    const date = new Date(d);
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${date.getFullYear()}/${pad(date.getMonth() + 1)}/${pad(date.getDate())} ` +
           `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
  };
  
  const handleDownload = (path: string) => {
    Dropbox.download(path, (blob: Blob, contentHash: string)=>{
      Importer.process(blob);
    });
  };
  return (
    <table style={{ borderCollapse: 'collapse', width: '100%' }}>
      <thead>
        <tr>
          <th style={{ border: '1px solid black', padding: '4px' }}>Name</th>
          <th style={{ border: '1px solid black', padding: '4px' }}>Date</th>
          <th style={{ border: '1px solid black', padding: '4px' }}></th>
        </tr>
      </thead>
      <tbody>
        {files.map((file: any, index: number) => (
          <tr key={index}>
            <td style={{ border: '1px solid black', padding: '4px' }}>{file.name}</td>
            <td style={{ border: '1px solid black', padding: '4px' }}>{format(file.server_modified)}</td>
            <td style={{ border: '1px solid black', padding: '4px' }}>
              <button onClick={() => handleDownload(file.path_lower)}>
                download
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};

export default DropboxDownloadDialog;
