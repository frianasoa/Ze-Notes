// if(Zotero.platformMajorVersion < 102) {
	// const Blob = Zotero.getMainWindow().Blob;
	// const Response = Zotero.getMainWindow().Response;
	// const URLSearchParams = Zotero.getMainWindow().URLSearchParams;
// }

const Dropbox = {
    accessToken: null,
    refreshToken: null,
    clientId: null,
    clientSecret: null,
    refreshUrl: 'https://api.dropboxapi.com/oauth2/token',
    uploadUrl: 'https://content.dropboxapi.com/2/files/upload',
    downloadUrl: 'https://content.dropboxapi.com/2/files/download',
	listFolderUrl: 'https://api.dropboxapi.com/2/files/list_folder',

    /**
     * Initialize the Dropbox object by loading values from Zotero.ZeNotes.Prefs.
     */
    init() {
        this.accessToken = Zotero.ZeNotes.Prefs.getb('dropbox-access-token', '');
        this.refreshToken = Zotero.ZeNotes.Prefs.getb('dropbox-refresh-token', '');
        this.clientId = Zotero.ZeNotes.Prefs.getb('dropbox-client-id', '');
        this.clientSecret = Zotero.ZeNotes.Prefs.getb('dropbox-client-secret', '');
    },

    /**
     * Refresh the access token using the refresh token.
     */
    async refresh() {
        try {
            const response = await fetch(this.refreshUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: new URLSearchParams({
                    grant_type: 'refresh_token',
                    refresh_token: this.refreshToken,
                    client_id: this.clientId,
                    client_secret: this.clientSecret,
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
				throw new Error(`Error ${response.status}: ${errorData.error_description || 'Unknown error'}`);
            }

            const data = await response.json();
            this.accessToken = data.access_token;
            Zotero.ZeNotes.Prefs.setb('dropbox-access-token', this.accessToken);
            return this.accessToken;
        } catch (error) {
            alert('Error refreshing token:'+error);
        }
    },

    /**
     * Upload a file to Dropbox.
     * @param {string} filePath - The full file path on Dropbox where the file will be uploaded.
     * @param {Blob | Buffer} fileContent - The file content to upload.
     */
    async upload(filePath, fileContent, callback) {
		try {
			const response = await fetch(this.uploadUrl, {
				method: 'POST',
				headers: {
					'Authorization': `Bearer ${this.accessToken}`,
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

			if (response.status === 401) {
				// console.log('Access token expired, refreshing...');
				await this.refresh();
				return this.upload(filePath, fileContent, callback);
			}

			if (!response.ok) {
				const contentType = response.headers.get('content-type');
				let errorMessage;

				if (contentType && contentType.includes('application/json')) {
					const errorData = await response.json();
					errorMessage = errorData.error_description || JSON.stringify(errorData);
				} else {
					errorMessage = await response.text();
				}
				throw new Error(errorMessage);
			}

			const data = await response.json();
			callback();
			let target = Zotero.ZeNotes.Prefs.get('dropbox-target-user', 'allusers');
			let filename = Zotero.getActiveZoteroPane().getSelectedCollection().name;
			alert("Collection exported to Dropbox!\nTarget user: "+target+"\nFile name: "+filename);
			return data;
		} catch (error) {
			callback();
			alert('Error uploading file: ' + error);
		}
	},
	
	async downloadoffline(filename_, callback)
	{
		filename_ = "C:\\Users\\Andriariniaina\\Dropbox\\Apps\\ZeNotes\\frianasoa@gmail.com\\Community involvement in Madagascar.zip"
		return Zotero.HTTP.request("GET", "file:///" + filename_, { responseType: 'blob' }).then(xhr=>{
			callback(xhr.response);
		});
	},

    /**
     * Download a file from Dropbox.
     * @param {string} filename - The full file path on Dropbox to download.
     */
    async download(filename, callback) {
		var username = Zotero.Prefs.get("extensions.zotero.sync.server.username", true);
		var filePath = "/"+username+"/"+filename;
		try {
			const response = await fetch(this.downloadUrl, {
				method: 'POST',
				headers: {
					'Authorization': `Bearer ${this.accessToken}`,
					'Dropbox-API-Arg': JSON.stringify({
						path: filePath,
					}),
				},
			});

			// Handle expired access token
			if (response.status === 401) {
				await this.refresh();
				return this.download(filePath);
			}

			// Check if response is OK
			if (!response.ok) {
				const errorMessage = await response.text();
				throw new Error(`File download failed: ${errorMessage}`);
			}
			const metadata = JSON.parse(response.headers.get('Dropbox-API-Result'));
			const fileBlob = await response.blob();
			callback(fileBlob, metadata.content_hash);
			Zotero.log('File downloaded successfully!');
			return fileBlob;
		} catch (error) {
			Zotero.log('Error downloading file: ' + error.message);
		}
	},

	
	/**
     * List files in a folder on Dropbox.
     * @param {string} folderPath - The path of the folder to list files from (e.g., '/myfolder').
     */
	async list(username) {
        var filepath = "/"+username;
		try {
            const response = await fetch(this.listFolderUrl, {
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
                return this.list(filepath); // Retry after refresh
            }

            if (!response.ok) {
				throw new Error(await response.text());
            }
            const data = await response.json();
            return data.entries.filter(f => f[".tag"] === "file");
			// .map(a=>{return a.name});
			//.tag,name,path_lower,path_display,id,client_modified,server_modified,rev,size,is_downloadable,content_hash
        } catch (error) {
            alert('Error listing files: ' + error);
        }
    },

    /**
     * Make authenticated API requests to Dropbox.
     * @param {string} url - Dropbox API URL.
     * @param {string} method - HTTP method (GET, POST, etc.).
     * @param {Object} [body] - Optional request body.
     */
    async apiRequest(url, method = 'GET', body = null) {
        try {
            const response = await fetch(url, {
                method: method,
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`,
                    'Content-Type': 'application/json',
                },
                body: body ? JSON.stringify(body) : null,
            });

            if (response.status === 401) {
                // console.log('Access token expired, refreshing...');
                await this.refresh();
                return this.apiRequest(url, method, body); // Retry after refresh
            }

            if (!response.ok) {
                throw new Error(`API request failed with status ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            // console.error('API request error:', error);
        }
    },
};
