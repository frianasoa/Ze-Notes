const Garbage = {
  addedElementIDs: [] as string[],
  collect(item: Element) {
    if (!item.id) {
      throw "Element must have an id";
    }
    this.addedElementIDs.push(item.id);
  },

  freeall(doc: Document) {
    for (const id of this.addedElementIDs) {
      const elem = doc?.getElementById(id);
      if (elem) elem.remove();
    }
  }
};

export default Garbage;
