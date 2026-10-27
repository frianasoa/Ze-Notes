// The reading pass for many papers — AI zone (see src/Core/Reading/batch.ts).
//
// It holds no logic of its own: the controller lists the papers, runs them one by one and opens a
// paper for review. This draws the list, ticks, progress and outcome. Every piece of text from
// Zotero or the AI goes in through `textContent`, never as markup.
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
    $("status").textContent = "This window has to be opened from Zotero's library.";
    return;
  }

  let running = false;
  let stopAsked = false;
  /** The rows on screen, by item id. */
  const rows = new Map();

  $("scope").textContent = io.title;
  $("columns").value = io.defaults.columns;
  $("instruction").value = io.defaults.instruction;
  $("language").value = io.defaults.language;
  $("paraphrase").checked = io.defaults.paraphrase;
  $("translation").checked = io.defaults.translation;
  const commentInputs = { language: $("language"), paraphrase: $("paraphrase"), translation: $("translation") };
  $("close").addEventListener("click", () => (host ? host.close() : window.close()));

  function el(tag, props, children) {
    const node = document.createElement(tag);
    Object.assign(node, props || {});
    for (const child of children || []) node.append(child);
    return node;
  }

  // --- Which AI (as in the reading window) ------------------------------------------------------

  let provider = null;
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
      setValue: (v) => inputs.forEach((i) => (i.checked = i.value === v)),
    };
  }

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
        provider = none
          ? null
          : radios(
              "provider",
              usable.map((p) => ({ value: p.id, label: p.label, detail: p.detail })),
              provider ? provider.value() : io.defaults.provider,
            );
        $("provider").replaceChildren(...(provider ? [provider.box] : []));
        updateSettingsLine();
        $("not-usable").hidden = none || notUsable.length === 0;
        $("not-usable-list").textContent = `Not set up: ${notUsable.map((n) => `${n.label} (${n.why})`).join(", ")}. `;
        updateButtons();
      })
      .catch((e) => {
        $("no-provider").hidden = false;
        $("provider-box").hidden = true;
        provider = null;
        $("status").textContent = `The list of AIs could not be read: ${e && e.message ? e.message : e}`;
        updateButtons();
      });
  }
  loadProviders();
  $("settings-big").addEventListener("click", () => io.openSettings());
  $("settings-small").addEventListener("click", () => io.openSettings());
  $("recheck").addEventListener("click", () => loadProviders());
  window.addEventListener("focus", () => loadProviders());

  // --- Saved settings, shared with every PDF's reading window ------------------------------------

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
  window.ZeReading.mountPresets(io, { list: $("presets"), saveButton: $("save-preset"), form, say });
  window.ZeReading.rememberFolds(io, [[$("settings-acc"), "batch.settings"]]);

  /** The closed fold's one line: which AI, which columns, what a comment holds. */
  function updateSettingsLine() {
    const f = form.get();
    $("settings-summary").textContent = window.ZeReading.settingsLine({
      aiLabel: f.ai,
      columns: f.columns.join(", "),
      comment: f.comment,
    });
  }
  for (const id of ["columns", "instruction", "language", "paraphrase", "translation", "provider"]) {
    $(id).addEventListener("input", updateSettingsLine);
    $(id).addEventListener("change", updateSettingsLine);
  }

  // --- The papers -------------------------------------------------------------------------------

  const ticked = () => [...rows.values()].filter((r) => r.check.checked && !r.check.disabled);

  /**
   * The ticked papers' size, to judge the time and the cost before pressing Read. Tokens are a
   * rough range, not a quote (the provider's bill is the measure): from the words when Zotero has
   * counted them (some 1.3 to 1.6 tokens a word), else from the pages (some 600 to 900 a page).
   */
  function showEstimate(list) {
    if (list.length === 0) {
      $("estimate").textContent = "";
      return;
    }
    let low = 0;
    let high = 0;
    let pages = 0;
    let words = 0;
    let unknown = 0;
    for (const r of list) {
      const p = r.paper;
      if (p.pages > 0) pages += p.pages;
      if (p.words > 0) {
        words += p.words;
        low += p.words * 1.3;
        high += p.words * 1.6;
      } else if (p.pages > 0) {
        low += p.pages * 600;
        high += p.pages * 900;
      } else {
        unknown += 1;
      }
    }
    const k = (n) => `${Math.max(1, Math.round(n / 1000))}k`;
    $("estimate").textContent =
      `${pages} page${pages === 1 ? "" : "s"}` +
      (words ? `, ${k(words)} words` : "") +
      (unknown ? ` (+${unknown} paper${unknown === 1 ? "" : "s"} of unknown length)` : "") +
      (high ? `, roughly ${k(low)} to ${k(high)} tokens of text sent` : "");
  }

  /** The ticks, kept for this collection a moment after the last change. */
  let tickTimer = null;
  function rememberTicksSoon() {
    if (tickTimer) window.clearTimeout(tickTimer);
    tickTimer = window.setTimeout(() => {
      tickTimer = null;
      io.rememberTicked(ticked().map((r) => r.paper.itemID)).catch(() => {});
    }, 300);
  }

  function updateButtons() {
    const n = ticked().length;
    showEstimate(ticked());
    $("run").disabled = running || n === 0 || !provider;
    $("run").textContent = n === 1 ? "Read 1 paper" : `Read ${n} papers`;
    const eligible = [...rows.values()].filter((r) => !r.check.disabled);
    $("all").checked = eligible.length > 0 && eligible.every((r) => r.check.checked);
    $("all").disabled = running || eligible.length === 0;
  }

  /** What the "Last reading pass" cell says, and whether Review is offered. */
  function showLast(r, paper) {
    r.lastCell.replaceChildren();
    if (paper.why) {
      r.lastCell.append(el("span", { className: "muted", textContent: paper.why }));
      r.review.hidden = true;
      return;
    }
    if (!paper.last) {
      r.lastCell.append(el("span", { className: "muted", textContent: "Not read yet" }));
      r.review.hidden = true;
      return;
    }
    const { date, found, saved, ai, passes } = paper.last;
    const more = passes > 1 ? ` (latest of ${passes} passes)` : "";
    r.lastCell.append(
      el("span", { textContent: `${found} found, ${saved} saved${more}` }),
      el("span", { className: "title", textContent: `${new Date(date).toLocaleString()} · ${ai}` }),
    );
    r.review.hidden = found === 0;
  }

  /**
   * A row. Ticked as it was last left for this collection, else, the first time, every paper with
   * a PDF that has not been read yet.
   */
  function addRow(paper, remembered) {
    const ticked = remembered ? remembered.has(paper.itemID) : !paper.last;
    const check = el("input", { type: "checkbox", checked: !paper.why && ticked, disabled: Boolean(paper.why) });
    check.setAttribute("aria-label", `Read ${paper.label}`);
    check.addEventListener("change", () => {
      updateButtons();
      rememberTicksSoon();
    });
    const lastCell = el("td");
    const review = el("button", { type: "button", textContent: "Review" });
    const count = (n) => (n > 0 ? n.toLocaleString() : paper.why ? "" : "?");
    const tr = el("tr", { className: paper.why ? "unavailable" : "" }, [
      el("td", {}, [check]),
      el("td", {}, [el("span", { textContent: paper.label }), el("span", { className: "title", textContent: paper.title })]),
      el("td", { className: "pages", textContent: count(paper.pages) }),
      el("td", { className: "pages", textContent: count(paper.words) }),
      lastCell,
      el("td", {}, [review]),
    ]);
    const r = { paper, check, lastCell, review, tr };
    review.addEventListener("click", () => {
      io.review(paper.itemID).catch((e) => {
        $("status").textContent = `Could not open it for review: ${e && e.message ? e.message : e}`;
      });
    });
    showLast(r, paper);
    rows.set(paper.itemID, r);
    $("paper-rows").append(tr);
  }

  $("all").addEventListener("change", () => {
    for (const r of rows.values()) if (!r.check.disabled) r.check.checked = $("all").checked;
    updateButtons();
    rememberTicksSoon();
  });

  $("status").textContent = "Looking at the papers…";
  Promise.all([io.papers(), io.ticked().catch(() => null)])
    .then(([papers, remembered]) => {
      const set = remembered ? new Set(remembered) : null;
      papers.forEach((paper) => addRow(paper, set));
      const withPdf = papers.filter((p) => !p.why).length;
      $("status").textContent = `${papers.length} paper${papers.length === 1 ? "" : "s"}, ${withPdf} with a PDF.`;
      updateButtons();
    })
    .catch((e) => {
      $("status").textContent = `The papers could not be listed: ${e && e.message ? e.message : e}`;
    });

  // --- Reading, one by one ----------------------------------------------------------------------

  $("stop").addEventListener("click", () => {
    stopAsked = true;
    $("stop").disabled = true;
    $("stop").textContent = "Stopping after this paper…";
  });

  $("run").addEventListener("click", async () => {
    const chosen = ticked();
    if (chosen.length === 0 || !provider) return;
    running = true;
    stopAsked = false;
    $("stop").hidden = false;
    $("stop").disabled = false;
    $("stop").textContent = "Stop after this paper";
    updateButtons();
    let done = 0;
    let failed = 0;
    try {
      await io.run(
        {
          provider: provider.value(),
          instruction: $("instruction").value.trim(),
          columns: $("columns").value,
          ...window.ZeReading.commentOf(commentInputs),
        },
        chosen.map((r) => r.paper.itemID),
        {
          onProgress(itemID, message) {
            const r = rows.get(itemID);
            for (const other of rows.values()) other.tr.classList.toggle("working", other === r);
            $("status").textContent = `Paper ${done + failed + 1} of ${chosen.length}, ${r ? r.paper.label : ""}: ${message}`;
          },
          onPaper(itemID, outcome) {
            const r = rows.get(itemID);
            if (outcome.ok) done += 1;
            else failed += 1;
            if (!r) return;
            r.tr.classList.remove("working");
            // Read now, so unticked, and the ticks kept that way: reopening does not read it again.
            r.check.checked = false;
            rememberTicksSoon();
            if (outcome.row) {
              r.paper = outcome.row;
              showLast(r, outcome.row);
            }
            r.lastCell.append(
              el("span", { className: `title ${outcome.ok ? "ok" : "failed"}`, textContent: outcome.ok ? `Just now: ${outcome.message}` : `Not read: ${outcome.message}` }),
            );
            updateButtons();
          },
          shouldStop: () => stopAsked,
        },
      );
      const stopped = stopAsked ? " Stopped as asked." : "";
      $("status").textContent =
        `Read ${done} paper${done === 1 ? "" : "s"}${failed ? `, ${failed} could not be read` : ""}.${stopped} ` +
        "Press Review on a paper to look over its proposals and save them.";
    } catch (e) {
      $("status").textContent = `The reading pass stopped: ${e && e.message ? e.message : e}`;
    } finally {
      running = false;
      $("stop").hidden = true;
      for (const r of rows.values()) r.tr.classList.remove("working");
      updateButtons();
    }
  });
})();
