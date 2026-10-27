// Shared by the reading pass's two windows — AI zone (see src/Core/Reading/presets.ts).
//
// The saved settings: a list of named sets (AI, columns, what to look for) with Use and Delete,
// and a way to save the form as a set. Every name and text goes in through `textContent`.
/* global window, document */
(function () {
  "use strict";

  function el(tag, props, children) {
    const node = document.createElement(tag);
    Object.assign(node, props || {});
    for (const child of children || []) node.append(child);
    return node;
  }

  /**
   * Draws the saved settings into `list` and wires `saveButton`.
   *
   * `form.get()` returns the form as `{ aiId, ai, columns, instruction }`; `form.set(settings)`
   * puts a set into it. `say(text)` reports what happened.
   */
  function mountPresets(io, { list, saveButton, form, say }) {
    async function reload() {
      let presets = [];
      try {
        presets = await io.presets();
      } catch (e) {
        say(`The saved settings could not be read: ${e && e.message ? e.message : e}`);
      }
      list.replaceChildren();
      if (presets.length === 0) {
        list.append(el("li", { className: "muted", textContent: "None yet. Save the form below to use it on any PDF." }));
        return;
      }
      for (const p of presets) {
        const use = el("button", { type: "button", className: "link", textContent: "Use" });
        const remove = el("button", { type: "button", className: "link", textContent: "Delete" });
        use.addEventListener("click", () => {
          form.set(p);
          say(`"${p.name}" is in the form.`);
        });
        remove.addEventListener("click", async () => {
          if (!window.confirm(`Delete the saved settings "${p.name}"? Passes made with them are kept.`)) return;
          await io.deletePreset(p.name);
          reload();
        });
        list.append(
          el("li", {}, [
            el("span", { className: "preset-name", textContent: p.name }),
            el("span", { className: "muted", textContent: ` ${p.columns.join(", ")} · ${p.ai || "any AI"} ` }),
            use,
            el("span", { textContent: " · " }),
            remove,
          ]),
        );
      }
    }

    /** Saves `settings` (the form's, or a pass's) under a name asked for. */
    async function saveAs(settings, suggested) {
      const name = window.prompt("Save these settings as:", suggested || "");
      if (name === null) return;
      try {
        const kept = await io.savePreset({ ...settings, name });
        say(`Saved as "${kept.name}". It is offered on every PDF.`);
        reload();
      } catch (e) {
        say(`Not saved: ${e && e.message ? e.message : e}`);
      }
    }

    saveButton.addEventListener("click", () => saveAs(form.get()));
    reload();
    return { reload, saveAs };
  }

  /**
   * Puts a set of settings into a window's form: the columns, the instruction, and the AI, by its
   * id when that AI is offered here, else by its name; when neither is offered the AI is left as it
   * is and that is said.
   */
  function applySettings(settings, { columnsInput, instructionInput, comment, provider, usable, say }) {
    columnsInput.value = (settings.columns || []).join(", ");
    instructionInput.value = settings.instruction || "";
    // A set saved before comments had options leaves those as they are.
    if (settings.comment && comment) {
      comment.language.value = settings.comment.language || comment.language.value;
      comment.paraphrase.checked = Boolean(settings.comment.paraphrase);
      comment.translation.checked = Boolean(settings.comment.translation);
    }
    if (!provider) return;
    const byId = usable.find((u) => u.id === settings.aiId);
    const byName = usable.find((u) => `${u.label} (${u.detail})` === settings.ai);
    const match = byId || byName;
    if (match) provider.setValue(match.id);
    else if (settings.ai) say(`${settings.ai} is not set up here; the AI was left as it was.`);
  }

  /** The comment options as the form has them. */
  function commentOf(comment) {
    return {
      language: comment.language.value.trim() || "English",
      paraphrase: comment.paraphrase.checked,
      translation: comment.translation.checked,
    };
  }

  /** One line saying what the settings fold holds, for when it is closed. */
  function settingsLine({ aiLabel, columns, comment }) {
    const extra = [comment.paraphrase && "paraphrase", comment.translation && "translation"].filter(Boolean);
    return [aiLabel, columns, extra.length ? `summary + ${extra.join(" + ")} in ${comment.language}` : `summary in ${comment.language}`]
      .filter(Boolean)
      .join(" · ");
  }

  /**
   * Keeps folds open or closed as they were last left: each `[details, key]` is put back when a
   * state was kept, and kept whenever it is opened or closed, by hand or by the page.
   */
  function rememberFolds(io, folds) {
    for (const [details, key] of folds) {
      const kept = io.layout ? io.layout.get(key) : null;
      if (kept !== null) details.open = kept;
      details.addEventListener("toggle", () => {
        if (io.layout) io.layout.set(key, details.open);
      });
    }
  }

  window.ZeReading = { el, mountPresets, applySettings, commentOf, settingsLine, rememberFolds };
})();
