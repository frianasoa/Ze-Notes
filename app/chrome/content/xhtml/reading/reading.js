// The reading pass's window — AI zone (see src/Core/Extensions.ts and src/Core/Reading/).
//
// It holds no logic of its own: the controller from `src/Core/Reading/index.ts` reads the PDF,
// asks the AI, checks the quotes, keeps every pass, and saves, edits and deletes highlights. This
// draws the form, the passes, one pass's proposals and the results. Every piece of text from the
// AI or the PDF goes in through `textContent`, never as markup.
/* global window, document */
(function () {
  "use strict";
  // In a tab of the Reading pass window, the frame element hands over the controller and a way
  // to close the tab; in a window of its own, `window.arguments` does.
  const frame = window.frameElement;
  const io =
    (frame && frame.zeIO) ||
    (window.arguments && window.arguments[0] && window.arguments[0].wrappedJSObject);
  const host = frame && frame.zeHost;
  if (host) document.body.classList.add("framed");
  const $ = (id) => document.getElementById(id);
  if (!io) {
    $("status").textContent = "This window has to be opened from a PDF in Zotero's reader.";
    return;
  }

  /** The pass on screen, and its proposals as rows. */
  let pass = null;
  let rows = [];
  let running = false;

  $("paper").textContent = io.title;
  $("columns").value = io.defaults.columns;
  $("instruction").value = io.defaults.instruction;
  $("language").value = io.defaults.language;
  $("paraphrase").checked = io.defaults.paraphrase;
  $("translation").checked = io.defaults.translation;
  $("close").addEventListener("click", () => (host ? host.close() : window.close()));
  const commentInputs = { language: $("language"), paraphrase: $("paraphrase"), translation: $("translation") };

  function el(tag, props, children) {
    const node = document.createElement(tag);
    Object.assign(node, props || {});
    for (const child of children || []) node.append(child);
    return node;
  }

  const plural = (n, word) => `${n} ${word}${n === 1 ? "" : "s"}`;
  const reason = (e) => (e && e.message ? e.message : String(e));

  /**
   * A row of radio buttons: `choices` as `{ value, label, detail? }`, `current` checked. Returned
   * with what a <select> was used for, and a way to switch the whole row on and off.
   */
  function radios(name, choices, current) {
    const box = el("div", { className: "choices" });
    box.setAttribute("role", "radiogroup");
    const inputs = choices.map((choice) => {
      const input = el("input", { type: "radio", name, value: choice.value, checked: choice.value === current });
      const parts = [input, el("span", { textContent: choice.label })];
      if (choice.detail) parts.push(el("span", { className: "detail", textContent: `(${choice.detail})` }));
      box.append(el("label", {}, parts));
      return input;
    });
    if (!inputs.some((i) => i.checked) && inputs[0]) inputs[0].checked = true;
    return {
      box,
      value: () => (inputs.find((i) => i.checked) || { value: "" }).value,
      onChange: (fn) => inputs.forEach((i) => i.addEventListener("change", fn)),
      setDisabled: (off) => inputs.forEach((i) => (i.disabled = off)),
      setValue: (v) => inputs.forEach((i) => (i.checked = i.value === v)),
    };
  }

  // --- Which AI ---------------------------------------------------------------------------------

  let provider = null;
  /** The AIs offered, as the controller gave them, to put a saved set's AI back. */
  let usableAis = [];
  function loadProviders() {
    if (running) return Promise.resolve();
    return io
      .providers()
      .then(({ usable, notUsable }) => {
        usableAis = usable;
        const none = usable.length === 0;
        $("no-provider").hidden = !none;
        $("provider-box").hidden = none;
        $("run").disabled = none;
        provider = none
          ? null
          : radios(
              "provider",
              usable.map((p) => ({ value: p.id, label: p.label, detail: p.detail })),
              provider ? provider.value() : io.defaults.provider,
            );
        $("provider").replaceChildren(...(provider ? [provider.box] : []));
        if (provider) provider.onChange(updateSettingsLine);
        updateSettingsLine();
        $("not-usable").hidden = none || notUsable.length === 0;
        $("not-usable-list").textContent = `Not set up: ${notUsable.map((n) => `${n.label} (${n.why})`).join(", ")}. `;
      })
      .catch((e) => {
        // Said, never left blank: an empty AI section with nothing to press is no answer.
        $("no-provider").hidden = false;
        $("provider-box").hidden = true;
        $("run").disabled = true;
        $("status").textContent = `The list of AIs could not be read: ${reason(e)}`;
      });
  }
  loadProviders();
  $("settings-big").addEventListener("click", () => io.openSettings());
  $("settings-small").addEventListener("click", () => io.openSettings());
  $("recheck").addEventListener("click", () => loadProviders());
  // Coming back from the settings window: look again, so a key just added is offered at once.
  window.addEventListener("focus", () => loadProviders());

  // --- Saved settings, for any PDF ----------------------------------------------------------------

  const say = (text) => {
    $("status").textContent = text;
  };
  const form = {
    get() {
      const ai = usableAis.find((u) => provider && u.id === provider.value());
      return {
        aiId: ai ? ai.id : "",
        ai: ai ? `${ai.label} (${ai.detail})` : "",
        columns: $("columns").value.split(",").map((c) => c.trim()).filter(Boolean),
        instruction: $("instruction").value.trim(),
        comment: window.ZeReading.commentOf(commentInputs),
      };
    },
    set(settings) {
      window.ZeReading.applySettings(settings, {
        columnsInput: $("columns"),
        instructionInput: $("instruction"),
        comment: commentInputs,
        provider,
        usable: usableAis,
        say,
      });
      updateSettingsLine();
    },
  };
  const presets = window.ZeReading.mountPresets(io, {
    list: $("presets"),
    saveButton: $("save-preset"),
    form,
    say,
  });

  /** The closed fold's one line: which AI, which columns, what a comment holds. */
  function updateSettingsLine() {
    const f = form.get();
    $("settings-summary").textContent = window.ZeReading.settingsLine({
      aiLabel: f.ai,
      columns: f.columns.join(", "),
      comment: f.comment,
    });
  }
  for (const id of ["columns", "instruction", "language", "paraphrase", "translation"]) {
    $(id).addEventListener("input", updateSettingsLine);
    $(id).addEventListener("change", updateSettingsLine);
  }
  $("provider").addEventListener("change", updateSettingsLine);

  // How the window opens: in front of Zotero by default, so it stays in sight while "Go to" moves
  // the PDF. Modal was dropped: with Zotero blocked, "Go to" waited for the window to close.
  const windowMode = radios(
    "window-mode",
    [
      { value: "front", label: "In front of Zotero (recommended)" },
      { value: "normal", label: "Separate window" },
    ],
    io.windowMode,
  );
  $("window-mode").replaceChildren(windowMode.box);
  windowMode.onChange(() => io.setWindowMode(windowMode.value()));

  // The folds as they were last left; the settings' own first-time rule only when none was kept.
  const settingsKept = io.layout ? io.layout.get("pdf.settings") : null;
  window.ZeReading.rememberFolds(io, [
    [$("settings-acc"), "pdf.settings"],
    [$("passes-acc"), "pdf.passes"],
    [$("review-acc"), "pdf.review"],
  ]);

  // --- The passes on this PDF -------------------------------------------------------------------

  let passChoice = null;
  /** Lists the passes, newest first, and opens `openID` (else the one open, else the newest). */
  let firstLoad = true;
  async function loadPasses(openID) {
    const list = await io.passes();
    $("passes-box").hidden = list.length === 0;
    $("passes-count").textContent = list.length ? `(${list.length})` : "";
    // Never set before: the settings fold is open while there is nothing to review, folded once
    // there is. After that, it stays as the person left it.
    if (firstLoad && settingsKept === null) $("settings-acc").open = list.length === 0;
    // With nothing to review, the settings are what there is to see, whatever was kept.
    if (firstLoad && list.length === 0) $("settings-acc").open = true;
    firstLoad = false;
    if (list.length === 0) {
      pass = null;
      rows = [];
      $("review").hidden = true;
      updateButtons();
      return;
    }
    const known = list.some((p) => p.id === (openID || (pass && pass.id)));
    const want = known ? openID || pass.id : list[0].id;
    $("passes").replaceChildren();
    const inputs = list.map((p) => {
      const input = el("input", { type: "radio", name: "pass", value: p.id, checked: p.id === want });
      input.addEventListener("change", () => openPass(p.id));
      const remove = el("button", { type: "button", className: "link pass-delete", textContent: "Delete" });
      remove.addEventListener("click", (event) => {
        event.preventDefault();
        deletePass(p);
      });
      $("passes").append(
        el("label", {}, [
          input,
          el("span", {}, [
            el("span", { textContent: `${new Date(p.date).toLocaleString()} · ${p.ai}` }),
            el("span", {
              className: "title",
              textContent: `${p.columns.join(", ")} · ${p.found} found, ${p.saved} saved · ${p.instruction}`,
            }),
          ]),
          remove,
        ]),
      );
      return input;
    });
    passChoice = inputs;
    if (!pass || pass.id !== want) await openPass(want);
  }

  /**
   * Forgets a pass. Highlights it saved stay in Zotero unless the person also says to delete them,
   * which is asked apart, so a highlight is never lost by answering the first question.
   */
  async function deletePass(p) {
    const when = new Date(p.date).toLocaleString();
    if (!window.confirm(`Delete the pass of ${when} (${p.ai})? Its ${plural(p.found, "proposal")} will be forgotten.`)) return;
    const withHighlights =
      p.saved > 0 &&
      window.confirm(
        `It saved ${plural(p.saved, "highlight")} in Zotero. Delete those from the PDF too?\n\nOK deletes them; Cancel keeps them in the PDF.`,
      );
    try {
      const deleted = await io.deletePass(p.id, withHighlights);
      if (pass && pass.id === p.id) pass = null;
      $("result").textContent = withHighlights
        ? `Pass deleted, with ${plural(deleted, "highlight")}.`
        : "Pass deleted. Its saved highlights stay in Zotero.";
      await loadPasses();
    } catch (e) {
      $("result").textContent = `Not deleted: ${reason(e)}`;
    }
  }

  async function openPass(id) {
    const opened = await io.openPass(id);
    if (opened) draw(opened);
  }

  // --- One pass's proposals ---------------------------------------------------------------------

  const filter = radios(
    "filter",
    [
      { value: "all", label: "All" },
      { value: "ticked", label: "Ticked" },
      { value: "saved", label: "Saved" },
      { value: "unsaved", label: "Not saved" },
    ],
    "all",
  );
  $("filter").replaceWith(filter.box);
  filter.box.id = "filter";
  filter.onChange(applyFilter);

  function applyFilter() {
    const show = filter.value();
    for (const r of rows) {
      const visible =
        show === "all" ||
        (show === "ticked" && r.check.checked) ||
        (show === "saved" && r.saved) ||
        (show === "unsaved" && !r.saved);
      r.li.hidden = !visible;
    }
  }

  $("allow-edit").addEventListener("change", () => rows.forEach(paintRow));

  let rowCount = 0;
  function columnChoice(current) {
    const columns = pass.columns;
    const names = columns.includes(current) || !current ? columns : [current, ...columns];
    const choices = [...names.map((n) => ({ value: n, label: n })), { value: "", label: "No column" }];
    return radios(`column-${rowCount++}`, choices, current);
  }

  /** Unsaved edits, kept a moment after the last one, so closing the window loses none. */
  let rememberTimer = null;
  const edits = () =>
    rows.map((r) => ({ column: r.column.value(), comment: r.comment.value.trim(), checked: r.check.checked }));
  function rememberSoon() {
    if (!pass) return;
    if (rememberTimer) window.clearTimeout(rememberTimer);
    const id = pass.id;
    rememberTimer = window.setTimeout(() => {
      rememberTimer = null;
      io.remember(id, edits()).catch(() => {});
    }, 400);
  }
  window.addEventListener("unload", () => {
    if (rememberTimer && pass) io.remember(pass.id, edits()).catch(() => {});
  });

  /** What a row shows and allows: unsaved, saved (locked or editable), or deleted from the PDF. */
  function paintRow(r) {
    const editing = $("allow-edit").checked;
    const colour = io.colourOf(r.column.value());
    r.swatch.style.background = colour;
    r.quote.style.borderLeftColor = colour;
    r.li.classList.toggle("saved", r.saved && !editing);
    r.li.classList.toggle("deleted", r.deleted);
    r.check.disabled = r.saved;
    if (r.saved) r.check.checked = true;
    const locked = r.saved && !editing;
    r.column.setDisabled(locked);
    r.comment.disabled = locked;
    // "Go to" is always there; changing or deleting a saved highlight only while editing is on.
    r.update.hidden = !(r.saved && editing);
    r.remove.hidden = !(r.saved && editing);
    r.update.disabled = r.column.value() === r.savedColumn && r.comment.value.trim() === r.savedComment;
    r.state.textContent = r.saved
      ? "Saved in Zotero"
      : r.deleted
        ? "Deleted from the PDF: tick it to add it again"
        : "";
  }

  function draw(opened) {
    pass = opened;
    rows = [];
    $("found").replaceChildren();
    opened.items.forEach((item, index) => {
      const check = el("input", { type: "checkbox", checked: item.checked });
      const swatch = el("span", { className: "swatch" });
      const column = columnChoice(item.column);
      const comment = el("textarea", { rows: 2, value: item.comment });
      const quote = el("blockquote", { textContent: `“${item.found.located.text}”` });
      const state = el("span", { className: "muted state" });
      const goTo = el("button", { type: "button", textContent: "Go to" });
      const update = el("button", { type: "button", textContent: "Update in Zotero" });
      const remove = el("button", { type: "button", textContent: "Delete from PDF" });
      const actions = el("div", { className: "item-actions" }, [goTo, update, remove]);
      goTo.addEventListener("click", () => {
        io.goTo(pass.id, index).catch((e) => {
          $("result").textContent = `Could not go there: ${reason(e)}`;
        });
      });
      const li = el("li", {}, [
        el("label", { className: "head" }, [
          check,
          swatch,
          el("span", { textContent: `p. ${item.found.pageLabel}` }),
          state,
        ]),
        quote,
        el("div", { className: "row" }, [column.box, comment]),
        actions,
      ]);
      const r = {
        index,
        check,
        swatch,
        column,
        comment,
        quote,
        state,
        update,
        remove,
        actions,
        li,
        saved: Boolean(opened.saved[index]),
        deleted: !opened.saved[index] && Boolean(item.savedOnce),
        savedColumn: item.column,
        savedComment: item.comment,
      };
      column.onChange(() => {
        paintRow(r);
        if (!r.saved) rememberSoon();
      });
      comment.addEventListener("input", () => {
        paintRow(r);
        if (!r.saved) rememberSoon();
      });
      check.addEventListener("change", () => {
        updateButtons();
        rememberSoon();
      });
      update.addEventListener("click", () => editRow(r));
      remove.addEventListener("click", () => removeRow(r));
      rows.push(r);
      paintRow(r);
      $("found").append(li);
    });

    const n = opened.items.length;
    $("run-info").textContent = `Pass of ${new Date(opened.date).toLocaleString()} with ${opened.ai}.`;
    $("summary").textContent =
      n === 0
        ? "Nothing to highlight: no passage proposed by the AI was found in the PDF."
        : `${plural(n, "passage")} found in the PDF.`;
    showSettings(opened.settings);

    $("missing").replaceChildren();
    for (const m of opened.missing) {
      $("missing").append(el("li", { textContent: `“${m.quote}” (${m.column || "no column"})` }));
    }
    $("missing-box").hidden = opened.missing.length === 0;
    $("missing-summary").textContent = `${opened.missing.length} not found in the PDF, not saved`;
    $("problems").replaceChildren(...opened.problems.map((p) => el("li", { textContent: p })));
    $("problems-box").hidden = opened.problems.length === 0;

    $("review").hidden = false;
    applyFilter();
    updateButtons();
  }

  /** The settings a pass ran with, the prompt word for word, shown on request. */
  function showSettings(settings) {
    const s = settings || {};
    const entries = [
      ["AI", s.ai],
      ["Columns", (s.columns || []).join(", ")],
      ["What to look for", s.instruction],
      [
        "Comments",
        s.comment
          ? window.ZeReading.settingsLine({ aiLabel: "", columns: "", comment: s.comment })
          : "summary only (recorded before comments had options)",
      ],
      ["Prompt sent to the AI", s.systemPrompt],
      ["How it was sent", s.chunkChars ? `parts of up to ${s.chunkChars} characters, at most ${s.maxPerChunk} passages each` : "(not recorded)"],
    ];
    $("settings").replaceChildren(
      ...entries.flatMap(([k, v]) => [
        el("dt", { textContent: k }),
        el("dd", { className: k.startsWith("Prompt") ? "prompt" : "", textContent: v || "" }),
      ]),
    );
  }
  $("show-settings").addEventListener("click", () => {
    $("settings-box").hidden = !$("settings-box").hidden;
    $("show-settings").textContent = $("settings-box").hidden ? "Settings used" : "Hide settings";
  });
  // A pass's settings back into the form, ready to run again, here or (saved) on any PDF.
  $("use-settings").addEventListener("click", () => {
    if (!pass) return;
    form.set(pass.settings);
    // The form and its Read button are in the settings fold, so it opens to show them.
    $("settings-acc").open = true;
    say("The settings of this pass are in the form above. Press Read this PDF to run them.");
    $("instruction").scrollIntoView({ block: "center" });
    $("instruction").focus();
  });
  $("save-settings").addEventListener("click", () => {
    if (!pass) return;
    const s = pass.settings;
    presets.saveAs(
      {
        aiId: s.aiId || "",
        ai: s.ai || "",
        columns: s.columns || [],
        instruction: s.instruction || "",
        ...(s.comment ? { comment: s.comment } : {}),
      },
      (s.columns || []).join(", "),
    );
  });

  function updateButtons() {
    const n = rows.filter((r) => !r.saved && r.check.checked).length;
    $("save").disabled = n === 0 || running;
    $("save").textContent = n === 1 ? "Save 1 highlight to Zotero" : `Save ${n} highlights to Zotero`;
    applyFilter();
  }

  async function editRow(r) {
    r.update.disabled = true;
    const result = await io.edit(pass.id, r.index, { column: r.column.value(), comment: r.comment.value.trim() });
    if (result.ok) {
      r.savedColumn = r.column.value();
      r.savedComment = r.comment.value.trim();
      $("result").textContent = "Updated in Zotero.";
      loadPasses(pass.id);
    } else {
      $("result").textContent = `Not updated: ${result.message || result.error}`;
    }
    paintRow(r);
  }

  async function removeRow(r) {
    if (!window.confirm("Delete this highlight from the PDF? It stays in this pass, and can be added again.")) return;
    const result = await io.remove(pass.id, r.index);
    if (result.ok) {
      r.saved = false;
      r.deleted = true;
      r.check.checked = false;
      $("result").textContent = "Deleted from the PDF.";
      loadPasses(pass.id);
    } else {
      $("result").textContent = `Not deleted: ${result.message || result.error}`;
    }
    paintRow(r);
    updateButtons();
  }

  // This PDF's passes, newest open, so nothing a run cost is ever lost.
  loadPasses().catch(() => {});

  // --- Reading and saving -----------------------------------------------------------------------

  $("run").addEventListener("click", async () => {
    running = true;
    $("run").disabled = true;
    updateButtons();
    $("result").textContent = "";
    $("status").textContent = "Starting…";
    try {
      const opened = await io.run(
        {
          provider: provider ? provider.value() : "",
          instruction: $("instruction").value.trim(),
          columns: $("columns").value,
          ...window.ZeReading.commentOf(commentInputs),
        },
        (message) => {
          $("status").textContent = message;
        },
      );
      $("status").textContent = "";
      draw(opened);
      // The new pass is added beside the others, never in place of one.
      await loadPasses(opened.id);
      // On to the review: the settings fold away, the proposals open, and the focus leaves the
      // button, so a space or Enter meant for scrolling does not read again.
      $("settings-acc").open = false;
      $("review-acc").open = true;
      $("review-acc").querySelector("summary").focus();
    } catch (e) {
      $("status").textContent = `The reading pass stopped: ${reason(e)}`;
    } finally {
      running = false;
      $("run").disabled = !provider;
      updateButtons();
    }
  });

  $("save").addEventListener("click", async () => {
    const chosen = rows.filter((r) => !r.saved && r.check.checked);
    if (chosen.length === 0) return;
    $("save").disabled = true;
    $("result").textContent = "Saving…";
    try {
      const results = await io.save(
        pass.id,
        chosen.map((r) => ({ index: r.index, column: r.column.value(), comment: r.comment.value.trim() })),
      );
      let saved = 0;
      const refused = [];
      results.forEach((res, i) => {
        const r = chosen[i];
        if (res && res.key) {
          saved += 1;
          r.saved = true;
          r.deleted = false;
          r.savedColumn = r.column.value();
          r.savedComment = r.comment.value.trim();
          paintRow(r);
        } else if (res) {
          refused.push(res.message || res.error);
        }
      });
      $("result").textContent =
        `Saved ${plural(saved, "highlight")} in Zotero.` + (refused.length ? ` ${refused.length} not saved: ${refused[0]}` : "");
      loadPasses(pass.id);
    } catch (e) {
      $("result").textContent = `Nothing was saved: ${reason(e)}`;
    } finally {
      updateButtons();
    }
  });
})();
