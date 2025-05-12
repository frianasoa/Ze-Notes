import React, { useState, useEffect } from "react";
import Prefs from "../../Core/Prefs";
import ZPrefs from "../../Core/ZPrefs";
import FileExporter from "../../Core/Exporter/FileExporter";

interface DropboxUploadDialogProps {
  collectionid: string;
  upload: (email: string) => void;
}

const DropboxUploadDialog: React.FC<DropboxUploadDialogProps> = ({ collectionid, upload }) => {
  const [email, setEmail] = useState("");
  const [processingTime, setProcessingTime] = useState(0);
  const [processingCount, setProcessingCount] = useState(0);
  const [processingSize, setProcessingSize] = useState(0);
  const [exportSpeedMBps, SetExportSpeedMBps] = useState(10);
  const handleSubmit = () => {
    upload(email);
  };

   const formatTime = (seconds: number) => {
      const days = Math.floor(seconds / 86400);
      seconds %= 86400;

      const hours = Math.floor(seconds / 3600);
      seconds %= 3600;

      const minutes = Math.floor(seconds / 60);
      seconds = Math.floor(seconds % 60);

      const parts: string[] = [];

      if (days > 0) parts.push(`${days}d`);
      if (hours > 0) parts.push(`${hours}h`);
      if (minutes > 0) parts.push(`${minutes}m`);
      if (seconds > 0 || parts.length === 0) parts.push(`${seconds}s`);

      return parts.join(" ");
  }

  useEffect(() => {
    const {time, count, size} = FileExporter.processingtime(Zotero.Collections.get(Number(collectionid)), exportSpeedMBps);
    setProcessingTime(time);
    setProcessingCount(count);
    setProcessingSize(size);
  }, [collectionid, exportSpeedMBps]);

  useEffect(() => {
    const fetchEmail = async () => {
      const storedEmail = await ZPrefs.getb("dropbox-last-target", "");
      setEmail(storedEmail);
    };
    fetchEmail();
    SetExportSpeedMBps(ZPrefs.get("dropbox-mb-per-sec", 10));
  }, []);

  return (
    <table>
      <tbody>
        <tr>
          <td>Email</td>
          <td>
            <input
              type="email"
              value={email}
              style={{width: "20em"}}
              onInput={async (e) => {setEmail((e.target as HTMLInputElement).value); await ZPrefs.setb("dropbox-last-target", (e.target as HTMLInputElement).value)}}
              placeholder="Enter email"
            />
          </td>
        </tr>

        <tr>
          <td>Export time</td>
          <td>
            <div style={{display: "flex", flexDirection: "row"}}>
              <input
                style={{flex: "1"}}
                min='0.5'
                max='200'
                step='0.5'
                id='dropbox-mb-per-sec'
                type="range"
                value={exportSpeedMBps}
                onInput={(e) => {
                    const val = Number((e.target as HTMLInputElement).value);
                    SetExportSpeedMBps(val);
                    ZPrefs.set("dropbox-mb-per-sec", String(val))
                  }
                }
              />
              <div>{exportSpeedMBps} MBps</div>
            </div>
          </td>
        </tr>
        <tr>
          <td></td>
          <td>
            Number of attachments: {processingCount}
          </td>
        </tr>
        <tr>
          <td></td>
          <td>
            Total size: {Math.round(processingSize)} Mb
          </td>
        </tr>
        <tr>
          <td></td>
          <td>
            Total processing time {formatTime(processingTime)}
          </td>
        </tr>
        <tr>
          <td colSpan={2}>
            <button onClick={handleSubmit}>Upload</button>
          </td>
        </tr>
      </tbody>
    </table>
  );
};

export default DropboxUploadDialog;
