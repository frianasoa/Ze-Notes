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
			// throw 'Error uploading file: ' + error;
      return Dropbox.refresh();
		}
	},
}

export default Dropbox;