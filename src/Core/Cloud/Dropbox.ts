import ZPrefs from '../ZPrefs'
import Utils from '../Utils'
import Page from '../Page'
import Server from '../Server'

const Dropbox = {
  accessToken: "",
  refreshToken: "",
  clientId: "",
  clientSecret: "",
  refreshUrl: 'https://api.dropboxapi.com/oauth2/token',
  uploadUrl: 'https://content.dropboxapi.com/2/files/upload',
  downloadUrl: 'https://content.dropboxapi.com/2/files/download',
  listFolderUrl: 'https://api.dropboxapi.com/2/files/list_folder',
  
  async refreshFromOAuth()
  {
    const redirectUri = "http://localhost:23119/zenotes/dropbox"; 
    const oauthUrl = `https://www.dropbox.com/oauth2/authorize?client_id=${Dropbox.clientId}&response_type=code&redirect_uri=${encodeURIComponent(redirectUri)}`;
    const win = Zotero.openInViewer(oauthUrl);
    (win as any).addEventListener('beforeunload', () => {
      window.alert("closed");
    });
  },
  
  async refresh() 
  {
    if(!Dropbox.refreshToken)
    {
      return Dropbox.refreshFromOAuth();
    }
    
    try {
      const response = await window.fetch(Dropbox.refreshUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new window.URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: Dropbox.refreshToken,
          client_id: Dropbox.clientId,
          client_secret: Dropbox.clientSecret,
        }),
      });

      if (!response.ok) {
        return Dropbox.refreshFromOAuth();
      }
      const data = await response.json();
      Dropbox.accessToken = (data as any).access_token;
      await ZPrefs.setb('dropbox-access-token', Dropbox.accessToken);
      return Dropbox.accessToken;
    }
    catch(error) 
    {
      return Dropbox.refreshFromOAuth();
    }
  },
  
  async init()
  {
    Dropbox.accessToken = await ZPrefs.getb('dropbox-access-token', '');
    Dropbox.refreshToken = await ZPrefs.getb('dropbox-refresh-token', '');
    Dropbox.clientId = await ZPrefs.getb('dropbox-client-id', '');
    Dropbox.clientSecret = await ZPrefs.getb('dropbox-client-secret', '');
    if(Dropbox.accessToken=="")
		{
			await Dropbox.refresh();
		}
  },
  
  async upload(filePath: string, fileContent: any): Promise<any> {
    await Dropbox.init();
    try {
			const response = await window.fetch(Dropbox.uploadUrl, {
				method: 'POST',
				headers: {
					'Authorization': `Bearer ${Dropbox.accessToken}`,
					'Content-Type': 'application/octet-stream',
					'Dropbox-API-Arg': Utils.headersafe(JSON.stringify({
						path: filePath,
						mode: 'overwrite', //Add if you want to add
						autorename: true,
						mute: false,
						strict_conflict: false
					})),
				},
				body: fileContent,
			});

			if (response.status === 401 || response.status===400) {
				return Dropbox.refresh();
			}

			if (!response.ok)
      {
				const contentType = response.headers.get('content-type');
				let errorMessage;

				if(contentType && contentType.includes('application/json')) {
					const errorData = await response.json();
					errorMessage = (errorData as any).error_description || JSON.stringify(errorData);
				} else {
					errorMessage = await response.text();
				}
				// throw errorMessage;
        return Dropbox.refresh();
			}
			return await response.json();
		}
    catch (error) 
    {
      return Dropbox.refresh();
		}
	},
  
  async list(username: string): Promise<any> {
    await Dropbox.init();
    const filepath = "/" + username;
    try {
      const response = await window.fetch(this.listFolderUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          path: filepath,
          recursive: false,
          include_media_info: false,
          include_deleted: false,
        }),
      });

      if (response.status === 401) {
        await this.refresh();
        return this.list(username);
      }

      if (!response.ok) {
        throw await response.text();
      }

      const data = await response.json();
      return (data as any).entries?.filter((entry: any) => entry[".tag"] === "file");
    }
    catch (error) {
      Dropbox.refresh().then(()=>{
        Dropbox.list(username);
      });
      // window.alert('Error listing files: ' + error);
      // return undefined;
    }
  },
    
  async download(filepath: string, callback: (blob: Blob, contentHash: string) => void
  ): Promise<Blob | void> {
    try {
      const response = await window.fetch(this.downloadUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          "Dropbox-API-Arg": JSON.stringify({ path: filepath }),
        },
      });

      // Handle expired access token
      if (response.status === 401) {
        await this.refresh();
        return this.download(filepath, callback);
      }

      if (!response.ok) {
        const errorMessage = await response.text();
        throw `File download failed: ${errorMessage}`;
      }

      const metadataHeader = response.headers.get("Dropbox-API-Result");
      if (!metadataHeader) {
        throw "Missing Dropbox-API-Result header";
      }

      const metadata = JSON.parse(metadataHeader);
      const fileBlob = await response.blob();
      callback(fileBlob, metadata.content_hash);
      Zotero.log("File downloaded successfully!");
      return fileBlob;
    } 
    catch (error: any) {
      Zotero.log("Error downloading file: " + error.message);
    }
  }

}

export default Dropbox;