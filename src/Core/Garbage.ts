const Garbage = {
  addedElementIDs: [] as string[],
  w: null as Window | null,

  init(w: Window) {
    this.w = w;
  },

  collect(item: HTMLElement) {
    if (!item.id) {
      throw "Element must have an id";
    }
    this.addedElementIDs.push(item.id);
  },

  freeall() {
    const doc = this.w?.document;
    for (const id of this.addedElementIDs) {
      const elem = doc?.getElementById(id);
      if (elem) elem.remove();
    }
  }
};
