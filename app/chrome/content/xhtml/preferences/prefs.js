window.ZeNotes_Preferences = {
  async init() {
    this.loading();
    await this.include();
    this.inittranslationlanguage();
    await this.inittesseractlanguage();
    await this.initopenaimodels();
    await this.initgeminimodels();
    await this.initdeepseekmodels();
    await this.initclaudemodels();
    await this.initactions();
    await this.initvalues();
    await this.initcustomailist();
    await this.inittesseractcorrectionaimodel();
    await ZeNotes_Bridge.init();
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
          const ischeckbox = target.type.toUpperCase() === "CHECKBOX";
          let value = target.value;
          if(ischeckbox)
          {
            value = target.checked;
          }
          
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
    
    if(key=="openai-api-key")
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
          elt.checked=value===true || value==='TRUE' || value==='true';
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

  async initclaudemodels() {
    let models = {data: []};
    try {
      models = await Zotero.AppBase.Engine.Core.Ai.Claude.models();
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
        }]
      }
    }
    const div = document.querySelector("[data-key=claude-model]");
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

  async inittesseractcorrectionaimodel() {
    const div = document.querySelector("[data-key=tesseract-correction-ai-model]");
    if (!div) return;
    div.innerHTML = "";

    const noneOpt = document.createElement("option");
    noneOpt.innerHTML = "None";
    noneOpt.value = "";
    div.appendChild(noneOpt);

    const openaiKey = await Zotero.AppBase.Engine.Core.ZPrefs.getb("openai-api-key");
    if (openaiKey) {
      const opt = document.createElement("option");
      opt.innerHTML = "OpenAI";
      opt.value = "openai";
      div.appendChild(opt);
    }

    const geminiKey = await Zotero.AppBase.Engine.Core.ZPrefs.getb("gemini-api-key");
    if (geminiKey) {
      const opt = document.createElement("option");
      opt.innerHTML = "Gemini";
      opt.value = "gemini";
      div.appendChild(opt);
    }

    const deepseekKey = (await Zotero.AppBase.Engine.Core.ZPrefs.getb("deepseek-api-key")) || (await Zotero.AppBase.Engine.Core.ZPrefs.getb("deepseek-apikey"));
    if (deepseekKey) {
      const opt = document.createElement("option");
      opt.innerHTML = "DeepSeek";
      opt.value = "deepseek";
      div.appendChild(opt);
    }

    const claudeKey = await Zotero.AppBase.Engine.Core.ZPrefs.getb("claude-api-key");
    if (claudeKey) {
      const opt = document.createElement("option");
      opt.innerHTML = "Claude";
      opt.value = "claude";
      div.appendChild(opt);
    }

    try {
      const settings = await Zotero.AppBase.Engine.Core.Ai.CustomAI.settinglist();
      for (const key of Object.keys(settings).sort()) {
        const setting = settings[key];
        const opt = document.createElement("option");
        opt.innerHTML = setting.name;
        opt.value = "custom:" + key;
        div.appendChild(opt);
      }
    } catch(e) {}

    const savedValue = Zotero.AppBase.Engine.Core.ZPrefs.get("tesseract-correction-ai-model");
    if (savedValue) div.value = savedValue;
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

// Browser bridge section (parts/bridge.xhtml). The generic .zenotes-values handler above
// saves the preferences; everything here is the part that has to talk to the server.
window.ZeNotes_Bridge = {
  timer: null,

  get bridge() {
    return Zotero.AppBase.Engine.Core.Bridge;
  },

  async init() {
    // The pane's files are served as they are; everything under `src/` reaches Zotero only
    // through the built bundle. So a profile can be running a new pane against an older
    // engine, and this must not be the thing that stops the settings window opening: the
    // whole section is guarded, and `ZeNotes_Preferences.init()` awaits this.
    try {
      await this.showtoken();
      this.initorigins();
      this.refresh();
    } catch (e) {
      Zotero.log("ZeNotes bridge settings: " + e);
    }
  },

  /** True when the built engine is new enough to know about the origins table. */
  hasrules() {
    return this.bridge && typeof this.bridge.rules === "function";
  },

  /** Said in the pane rather than thrown, because a rebuild is a thing a person can do. */
  needsbuild(container) {
    const line = document.createElement("div");
    line.textContent =
      "This part needs the rebuilt plugin: run npm run build in Ze-Notes, then restart Zotero.";
    line.style.opacity = "0.75";
    container.appendChild(line);
  },

  /**
   * The origins table: one row per page, a checkbox per capability, and Remove.
   *
   * Built the way the Custom AI list is built - a table made in script, each control saving
   * as it is touched - because the rows are data, not fields, and there is no fixed number
   * of them to bind to.
   *
   * Nothing here restarts the server: every check reads the preference when the request
   * arrives, so a change is in force by the time the next one comes in and an open event
   * stream is not dropped over a permission that did not concern it.
   */
  initorigins() {
    const container = document.getElementById("bridge-origins-table");
    if (!container) {
      return;
    }

    if (!this.hasrules()) {
      container.innerHTML = "";
      this.needsbuild(container);
      return;
    }

    // Reading the rules migrates the old one-per-line list on the fly; writing them back
    // once makes that the stored answer, so the old field stops being the source of truth.
    const rules = this.bridge.rules();
    this.bridge.setRules(rules);

    container.innerHTML = "";

    if (rules.length === 0) {
      const empty = document.createElement("div");
      empty.textContent = "No pages yet. Nothing can connect.";
      empty.style.opacity = "0.75";
      container.appendChild(empty);
      return;
    }

    const capabilities = this.bridge.capabilities();
    const titles = {
      read: "Read the table, the notes, the annotations and the change stream.",
      arrange: "Change how the table is arranged - hide a column, colour it, sort it. Not the notes.",
      write: "Change notes and annotation comments. Also needs Allow writes below.",
      ai: "Ask this Zotero to run AI, translation or OCR. That spends your own API quota.",
      files: "Hand a PDF from your library to this page, so it can be analysed there. The page keeps its own copy.",
    };

    const table = document.createElement("table");
    table.className = "zenotes-container";
    table.style.borderCollapse = "collapse";

    const headerRow = document.createElement("tr");
    for (const text of ["Page", ...capabilities.map((c) => c.toUpperCase()), ""]) {
      const th = document.createElement("th");
      th.textContent = text;
      th.style.border = "1px solid black";
      th.style.padding = "5px";
      if (titles[text.toLowerCase()]) {
        th.title = titles[text.toLowerCase()];
      }
      headerRow.appendChild(th);
    }
    table.appendChild(headerRow);

    for (const rule of rules) {
      const row = document.createElement("tr");

      const originCell = document.createElement("td");
      originCell.textContent = rule.origin;
      originCell.style.border = "1px solid black";
      originCell.style.padding = "5px";
      row.appendChild(originCell);

      for (const capability of capabilities) {
        const cell = document.createElement("td");
        cell.style.border = "1px solid black";
        cell.style.textAlign = "center";

        const box = document.createElement("input");
        box.type = "checkbox";
        box.checked = rule[capability] === true;
        box.title = titles[capability] || capability;
        box.setAttribute("aria-label", rule.origin + ": " + capability);
        box.addEventListener("change", (event) => {
          ZeNotes_Bridge.setcapability(rule.origin, capability, event.currentTarget.checked);
        });

        cell.appendChild(box);
        row.appendChild(cell);
      }

      const actionCell = document.createElement("td");
      actionCell.style.border = "1px solid black";
      actionCell.style.textAlign = "center";
      const remove = document.createElement("button");
      remove.textContent = "Remove";
      remove.onclick = () => ZeNotes_Bridge.removeorigin(rule.origin);
      actionCell.appendChild(remove);
      row.appendChild(actionCell);

      table.appendChild(row);
    }

    container.appendChild(table);
  },

  /**
   * Adds a page.
   *
   * It arrives able to read and to arrange the table, which is what "let this page work with
   * my library" has always meant here, and **not** able to write, to run anything or to take
   * files: those are the ones that cost something, so they are ticked on purpose or not at all.
   *
   * An origin is a scheme, a host and a port - no path, no trailing slash - because that is
   * the exact string a browser sends and the exact string it is compared against.
   */
  addorigin() {
    const field = document.getElementById("bridge-origin-new");
    if (!field) {
      return;
    }
    if (!this.hasrules()) {
      alert("This part needs the rebuilt plugin: run npm run build in Ze-Notes, then restart Zotero.");
      return;
    }

    const typed = String(field.value || "").trim().replace(/\/+$/, "");
    if (typed === "") {
      return;
    }

    let origin = "";
    try {
      const url = new URL(typed);
      origin = url.origin;
    } catch (e) {
      origin = "";
    }
    if (!origin || origin === "null") {
      alert(
        "That is not an address a browser can send.\n" +
          "Use the scheme, the host and the port, for example https://ariadne.alefa.net or http://localhost:5173"
      );
      return;
    }

    const rules = this.bridge.rules();
    if (rules.some((r) => r.origin === origin)) {
      field.value = "";
      return;
    }

    rules.push({ origin: origin, read: true, arrange: true, write: false, ai: false, files: false });
    this.bridge.setRules(rules);
    field.value = "";
    this.initorigins();
    this.refresh();
  },

  setcapability(origin, capability, allowed) {
    const rules = this.bridge.rules().map((rule) => {
      if (rule.origin !== origin) {
        return rule;
      }
      const next = Object.assign({}, rule);
      next[capability] = allowed === true;
      return next;
    });
    this.bridge.setRules(rules);
    this.initorigins();
    this.refresh();
  },

  removeorigin(origin) {
    const ok = window.confirm("Stop " + origin + " from connecting?");
    if (!ok) {
      return;
    }
    this.bridge.setRules(this.bridge.rules().filter((rule) => rule.origin !== origin));
    this.initorigins();
    this.refresh();
  },

  async showtoken() {
    const field = document.getElementById("bridge-token");
    if (field) {
      field.value = await this.bridge.token();
    }
  },

  refresh() {
    const line = document.getElementById("bridge-status");
    if (!line) {
      return;
    }
    const status = this.bridge.status();
    let text = "Stopped";
    let colour = "";
    if (status.state === "listening") {
      text = "Listening on 127.0.0.1:" + status.port;
      colour = "#2f5d50";
      if (status.origins === 0) {
        // Enabled, listening, and nothing allowed through: the one state that looks like
        // a bug but is a setting.
        text += " · no pages allowed in yet, so nothing can connect";
        colour = "#8a6d1f";
      } else {
        text += " · " + status.origins + (status.origins === 1 ? " page" : " pages");
        text += status.writes ? " · writing allowed" : " · reading only";
        // Worth its own words: this is the permission that spends the user's own money.
        if (status.commands > 0) {
          text += " · " + status.commands + " may run commands";
        }
        if (status.streams > 0) {
          text += " · " + status.streams + " open stream(s)";
        }
      }
    } else if (status.state === "error") {
      text = "Error: " + status.message;
      colour = "#9c2c2c";
    }
    line.textContent = text;
    line.style.color = colour;
  },

  // The generic handler saves the preference asynchronously; wait for it to land before
  // restarting the server, so the new value is the one that takes effect.
  changed() {
    window.clearTimeout(this.timer);
    this.timer = window.setTimeout(async () => {
      await this.bridge.restart();
      this.refresh();
    }, 400);
  },

  async copytoken() {
    const token = await this.bridge.token();
    if (!token) {
      return;
    }
    Zotero.Utilities.Internal.copyTextToClipboard(token);
    await this.showtoken();
  },

  async regenerate() {
    const ok = window.confirm(
      "Regenerate the pairing token? Anything already paired will have to be paired again."
    );
    if (!ok) {
      return;
    }
    await this.bridge.regenerateToken();
    await this.showtoken();
    await this.bridge.restart();
    this.refresh();
  },
};
