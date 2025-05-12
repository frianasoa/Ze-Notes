import ZPrefs from './ZPrefs';

const Server = {
  init()
  {
    Zotero.Server.Endpoints['/zenotes/dropbox'] = function () {};
    Zotero.Server.Endpoints['/zenotes/dropbox'].prototype = {
      supportedMethods: ["GET", "POST"],
      supportedDataTypes: ["application/json"],
      init: async function (data: any) {
        const code = data.searchParams.get('code');
        if(code)
        {
          const access_token = await Server.token(code);  
          if(access_token)
          {
            await ZPrefs.setb("dropbox-access-token", access_token);
          }
        }
        return [200, "text/html", "The key was saved successfully. You may close this window."];
      }
    };
    (Zotero.Server as any).init();
  },
    
  async token(code: string)
  {
    const redirectUri = "http://localhost:23119/zenotes/dropbox";
    const clientId = await ZPrefs.getb('dropbox-client-id', '');
    const clientSecret = await ZPrefs.getb('dropbox-client-secret', '');
    const url = 'https://api.dropbox.com/oauth2/token';

    const params = new window.URLSearchParams();
    params.append('code', code);
    params.append('grant_type', 'authorization_code');
    params.append('redirect_uri', redirectUri);
    params.append('client_id', clientId);
    params.append('client_secret', clientSecret);
    try {
      const response = await window.fetch(url, {
        method: 'POST',
        body: params,
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      });

      if (!response.ok) {
        throw `HTTP error! status: ${response.status}`;
      }
      const data = await response.json();
      return (data as any).access_token;
    } catch (error) {
      Zotero.log('Error fetching access token:'+error);
    }
  }
}

export default Server;