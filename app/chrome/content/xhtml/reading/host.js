// The one Reading pass window — AI zone (see src/Core/Reading/host.ts).
//
// A tab per thing being read: a batch of papers, or a PDF. Each tab is a frame showing its page
// (`batch.xhtml`, `reading.xhtml`), handed its controller through the frame element (`zeIO`), the
// way a window of its own was handed it through `window.arguments`. Selecting a tab runs its
// `onSelect`, which brings a PDF up in Zotero. Closing the last tab closes the window. Every title
// goes in through `textContent`.
/* global window, document */
(function () {
  "use strict";
  const io = window.arguments && window.arguments[0] && window.arguments[0].wrappedJSObject;
  if (!io) return;
  const $ = (id) => document.getElementById(id);

  const PAGES = {
    pdf: "chrome://zenotes/content/xhtml/reading/reading.xhtml",
    batch: "chrome://zenotes/content/xhtml/reading/batch.xhtml",
  };

  /** The tabs, by id, in the order they were opened. */
  const tabs = new Map();
  let selected = null;

  function select(id) {
    const tab = tabs.get(id);
    if (!tab) return;
    selected = id;
    for (const [other, t] of tabs) {
      const on = other === id;
      t.frame.hidden = !on;
      t.button.setAttribute("aria-selected", String(on));
      t.button.classList.toggle("selected", on);
    }
    document.title = `${tab.spec.title} · Reading pass · Ze-Notes`;
    try {
      if (tab.spec.onSelect) tab.spec.onSelect();
    } catch {
      // A PDF that cannot be brought up in Zotero leaves the tab usable all the same.
    }
  }

  function close(id) {
    const tab = tabs.get(id);
    if (!tab) return;
    tab.frame.remove();
    tab.button.remove();
    tabs.delete(id);
    if (tabs.size === 0) {
      window.close();
      return;
    }
    if (selected === id) select([...tabs.keys()].pop());
  }

  /** Opens a tab for `spec`, or selects the one already open for it. */
  function addTab(spec) {
    if (tabs.has(spec.id)) {
      select(spec.id);
      return;
    }
    const label = document.createElement("span");
    label.textContent = spec.title;
    const shut = document.createElement("span");
    shut.className = "tab-close";
    shut.textContent = "×";
    shut.setAttribute("role", "button");
    shut.setAttribute("aria-label", `Close ${spec.title}`);
    const button = document.createElement("button");
    button.type = "button";
    button.className = `tab tab-${spec.kind}`;
    button.setAttribute("role", "tab");
    button.title = spec.title;
    button.append(label, shut);
    button.addEventListener("click", (event) => {
      if (event.target === shut) close(spec.id);
      else select(spec.id);
    });
    button.addEventListener("auxclick", (event) => {
      if (event.button === 1) close(spec.id);
    });

    const frame = document.createElement("iframe");
    frame.className = "tab-frame";
    // Handed over before the page loads: the page reads them as it starts.
    frame.zeIO = spec.controller;
    frame.zeHost = { close: () => close(spec.id) };
    frame.src = PAGES[spec.kind];

    tabs.set(spec.id, { spec, button, frame });
    $("tabs").append(button);
    $("frames").append(frame);
    select(spec.id);
  }

  window.ZeHost = { addTab };
  for (const spec of io.takePending()) addTab(spec);

  window.addEventListener("unload", () => {
    io.saveGeometry({ x: window.screenX, y: window.screenY, w: window.outerWidth, h: window.outerHeight });
    io.onClosed();
  });
})();
