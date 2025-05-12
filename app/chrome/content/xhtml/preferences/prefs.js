const ZeNotes_Preferences = {
  async init() {
    this.loading();
    await this.include();
    this.inittranslationlanguage();
    await this.inittesseractlanguage();
    await this.initopenaimodels();
    await this.initgeminimodels();
    await this.initdeepseekmodels();
    await this.initactions();
    await this.initvalues();
    await this.initcustomailist();
    this.loaded();
  },
  
  loading()
  {
    document.getElementById("loading-container").removeAttribute("hidden")
    document.getElementById("zenotes-preferences").setAttribute("hidden", "true");
  },
  
  loaded()
  {
    document.getElementById("loading-container").setAttribute("hidden", "true");
    document.getElementById("zenotes-preferences").removeAttribute("hidden");
  },
  
  async include()
  {
    const promises = [];
    document.querySelectorAll("groupbox[include]").forEach(groupbox => {
      const file = Zotero.AppBase.rootURI + "chrome/content/xhtml/preferences/" + groupbox.getAttribute("include");
      
      const promise = fetch(file)
        .then(response => response.text())
        .then(html => {
          const parser = new DOMParser();
          const doc = parser.parseFromString(html, "application/xhtml+xml"); // Parse as XHTML

          // Clear existing content
          while (groupbox.firstChild) {
            groupbox.removeChild(groupbox.firstChild);
          }

          // Add label
          const label = document.createElement("label");
          label.innerHTML = "<h2>"+groupbox.getAttribute("label")+"</h2>"; 
          groupbox.appendChild(label);
          
          // Import and append nodes while keeping namespace
          doc.documentElement.childNodes.forEach(node => {
            groupbox.appendChild(document.importNode(node, true));
          });
          
          groupbox.appendChild(document.createElement("hr"));
        })
        .catch(error => console.error("Error loading:", file, error));

      promises.push(promise);
    });

    // Wait for all promises to resolve
    await Promise.all(promises);
  },

  
  async validate(key, value)
  {
    if(key=="deepl-api-key")
    {
      return Zotero.AppBase.Engine.Core.Translation.DeepL.keyisvalid(value).catch(e=>{
        if(e.status==403)
        {
          alert("DeepL API key is not valid!");
        }
        return Promise.resolve(false);
      });
    }
    else if(key=="google-translate-api-key")
    {
      return Zotero.AppBase.Engine.Core.Translation.Google.keyisvalid(value).catch(e=>{
        alert("Google Cloud API key is not valid!");
        return Promise.resolve(false);
      })
    }
    else
    {
      return true;
    }
  },
  
  async initactions() {
    document.querySelectorAll(".zenotes-values").forEach((elt) => {
      elt.addEventListener("change", async (event) => {
        try {
          const target = event.currentTarget || event.target;
          const value = target.checked || target.value;
          const key = target.dataset.key;
          const encrypt = target.type.toUpperCase() === "PASSWORD";
          const valid = await ZeNotes_Preferences.validate(key, value);
          
          if(!valid)
          {
            target.value = "";
            Zotero.AppBase.Engine.Core.ZPrefs.clear(key);
            return;
          }
          
          if (encrypt) {
            await Zotero.AppBase.Engine.Core.ZPrefs.setb(key, value).then(e=>{
              ZeNotes_Preferences.validated(target, key);
            })
          } else {
            Zotero.AppBase.Engine.Core.ZPrefs.set(key, value);
            ZeNotes_Preferences.validated(target, key);
          }
          
        } catch (error) {
          alert("Error saving preference:"+error);
        }
      });
    });
  },
  
  validatenumber(event, min, max)
  {
    // alert(event);
    const elt = event.target;
    elt.value = elt.value.replace(/[^0-9]/g, ''); 
    if(parseInt(elt.value) < min) elt.value = min;
    if(parseInt(elt.value) > max) elt.value = max; 
  },
  
  validated(element, key) {
    element.style.transition = "border-color 0.3s ease, box-shadow 0.3s ease";
    element.style.borderColor = "#90EE90";
    element.style.boxShadow = "0 0 8px #90EE90";
    
    if(key=="openai-apikey")
    {
      this.initopenaimodels();
    }
    
    setTimeout(() => {
        element.style.borderColor = "";
        element.style.boxShadow = "";
    }, 1400);
  },

  async initvalues() {
    document.querySelectorAll(".zenotes-values").forEach(async (elt) => {
      try {
        const key = elt.dataset.key;
        const encrypt = elt.type.toUpperCase() === "PASSWORD";
        const ischeckbox = elt.type.toUpperCase() === "CHECKBOX";
        let value = "";
        if (encrypt) {
          value = await Zotero.AppBase.Engine.Core.ZPrefs.getb(key);
        } 
        else {
          value = Zotero.AppBase.Engine.Core.ZPrefs.get(key);
        }
        if(ischeckbox)
        {
          elt.checked=value.toUpperCase()==="TRUE";
        }
        else
        {
          elt.value = value;
        }
      } catch (error) {
        Zotero.log("Error initializing values:"+error);
      }
    });
  },

  inittranslationlanguage() {
    const languages = Zotero.AppBase.Engine.Core.Translation.Languages.all;
    const div = document.querySelector("[data-key=translation-language]");
    if (div) {
      for (let label in languages) {
        let opt = document.createElement("option");
        opt.innerHTML = label;
        opt.value = languages[label];
        div.appendChild(opt);
      }
    }
  },
  
  async initopenaimodels() {
    let models = {data: []};
    try {
      models = await Zotero.AppBase.Engine.Core.Ai.OpenAI.models();
      models.data = models.data
      .filter(e => e.id.toLowerCase().includes("gpt"))
      .filter(e => !e.id.toLowerCase().includes("audio"))
      .sort((a, b) => (b.created || 0) - (a.created || 0));
    }
    catch(e)
    {
      let message = "Error getting models";
      if(e.status==401)
      {
        message = "Unauthorized access (401)";
      }
      else if(e.status==404)
      {
        message = "API URL error (404)";
      }
      else if(e.statusText && e.status)
      {
        message = e.statusText+" ("+e.status+")";
      }
      else
      {
        message = e;
      }
      
      models = {
        data: [{
          id: message,
          created: 0,
        }]
      }
    }
    const div = document.querySelector("[data-key=openai-model]");
    div.innerHTML = "";
    if (div) {
      for (let model of models.data) {
        let opt = document.createElement("option");
        opt.innerHTML = model.id;
        opt.value = model.id;
        div.appendChild(opt);
      }
    }
  },
  
  async initdeepseekmodels() {
    let models = {data: []};
    try {
      models = await Zotero.AppBase.Engine.Core.Ai.DeepSeek.models();
    }
    catch(e)
    {
      let message = "Error getting models";
      if(e.status==401)
      {
        message = "Unauthorized access (401)";
      }
      else if(e.status==404)
      {
        message = "API URL error (404)";
      }
      else if(e.statusText && e.status)
      {
        message = e.statusText+" ("+e.status+")";
      }
      else
      {
        message = e;
      }
      
      models = {
        data: [{
          id: message,
          created: 0,
        }]
      }
    }
    const div = document.querySelector("[data-key=deepseek-model]");
    div.innerHTML = "";
    if (div) {
      for (let model of models.data) {
        let opt = document.createElement("option");
        opt.innerHTML = model.id;
        opt.value = model.id;
        div.appendChild(opt);
      }
    }
  },
  
  async initgeminimodels() {
    let models = {models: []};
    try {
      models = await Zotero.AppBase.Engine.Core.Ai.Gemini.models();
      models.models = models.models
      .filter(model =>
        model.supportedGenerationMethods.includes("generateContent")
      ).filter(model=>
        !model.description || !model.description.includes("deprecated")
      ).filter(model=>
        !model.description || !model.description.toLowerCase().includes("image")
      )
    }
    catch(e)
    {
      let message = "Error getting models";
      if(e.status==401)
      {
        message = "Unauthorized access (401)";
      }
      else if(e.status==404)
      {
        message = "API URL error (404)";
      }
      else if(e.statusText && e.status)
      {
        message = e.statusText+" ("+e.status+")";
      }
      else
      {
        message = e;
      }
      
      models = {
        models: [{
          displayName: "Error (Hover to see)",
          name: "",
          description: message,
        }]
      }
    }
    const div = document.querySelector("[data-key=gemini-model]");
    div.innerHTML = "";
    if (div) {
      for (let model of models.models) {
        let opt = document.createElement("option");
        opt.innerHTML = model.displayName;
        opt.value = model.name;
        opt.title = model.description;
        div.appendChild(opt);
      }
    }
  },
  
  async inittesseractlanguage() {
    try {
      const languages = await Zotero.AppBase.Engine.Core.Ocr.Tesseract.languages();
      const div = document.querySelector("[data-key=tesseract-language]");
      if (div) {
        for (let key in languages) {
          let opt = document.createElement("option");
          opt.innerHTML = languages[key];
          opt.value = key;
          div.appendChild(opt);
        }
      }
    } catch (error) {
      Zotero.log("Error initializing Tesseract languages:"+error);
    }
  },
  
  async initcustomailist() {
    const settings = await Zotero.AppBase.Engine.Core.Ai.CustomAI.settinglist();
    const container = document.querySelector("#custom-ai-saved");
    container.innerHTML = "";
    
    const table = document.createElement("table");
    table.style.borderCollapse = "collapse";
    table.className = "zenotes-container";

    const headerRow = document.createElement("tr");

    ["Label", "Use", "Actions"].forEach(text => {
      const th = document.createElement("th");
      th.textContent = text;
      th.style.border = "1px solid black";
      th.style.padding = "5px";
      headerRow.appendChild(th);
    });

    table.appendChild(headerRow);
    for(const key of Object.keys(settings).sort()) {
      const setting = settings[key];
      const row = document.createElement("tr");

      const labelCell = document.createElement("td");
      labelCell.textContent = setting.name;
      labelCell.style.border = "1px solid black";
      labelCell.style.padding = "5px";

      const checkboxCell = document.createElement("td");
      checkboxCell.style.border = "1px solid black";
      checkboxCell.style.textAlign = "center";
      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.checked = setting.use;
      checkbox.dataset.key = key;
      checkbox.addEventListener("change", async (event)=>{
        const key = event.currentTarget.dataset.key;
        const checked = event.currentTarget.checked;
        const data = await Zotero.AppBase.Engine.Core.Prefs.get(key)
        try {
          const newdata = JSON.parse(data);
          newdata["use"] = checked;
          Zotero.AppBase.Engine.Core.Prefs.set(key, JSON.stringify(newdata)).then(e=>{
            ZeNotes_Preferences.initcustomailist();
          })
        }
        catch(e)
        {
          alert(e);
        }
      })
      checkboxCell.appendChild(checkbox);

      const actionCell = document.createElement("td");
      actionCell.style.border = "1px solid black";
      actionCell.style.textAlign = "center";
      const deleteButton = document.createElement("button");
      deleteButton.textContent = "Delete";
      deleteButton.dataset.key = key;
      deleteButton.onclick = (event) => {
        Zotero.AppBase.Engine.Core.Ai.CustomAI.deletesetting(event.currentTarget.dataset.key).then(e=>{
          ZeNotes_Preferences.initcustomailist();
        })
      };
      actionCell.appendChild(deleteButton);

      row.appendChild(labelCell);
      row.appendChild(checkboxCell);
      row.appendChild(actionCell);

      table.appendChild(row);
    }
    container.appendChild(table);
  },
  
  async exportdropboxsettings()
  {
    const key = await Zotero.AppBase.Engine.Core.Cloud.Dropbox.exportsettings(window);
    if(key)
    {
      alert("Settings exported. Please keep this key to be used on import: \n"+key);
    }
  },
  
  async loaddropboxsettings()
  {
    const key = prompt("Please enter the encryption key: ");
    if(key)
    {
      const message = await Zotero.AppBase.Engine.Core.Cloud.Dropbox.loadsettings(window, key);
      alert(message);
    }
  },

  savecustomaisettings()
  {
    const default_value = "Custom AI ("+document.querySelector("[data-key='custom-ai-model']").value+")";
    
    const name = prompt('Insert name!\nExisting settings will be overwritten!', default_value);
    if(name)
    {
      Zotero.AppBase.Engine.Core.Ai.CustomAI.savesettings(name).then(e=>{
        ZeNotes_Preferences.initcustomailist();
      })
    }
  }
};
