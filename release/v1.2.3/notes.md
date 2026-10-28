# Ze Notes v1.2.3

Works with Zotero 7 to 11.

## Reading pass: delete several highlights at once

- With **Allow editing saved highlights** turned on, saved highlights in a pass can now be ticked. Tick some, then click the delete button at the bottom of the window. It shows how many you ticked, for example **Delete 3 highlights from the PDF**. You are asked to confirm first. The deleted highlights stay in the pass, so you can add them back later.
- A new **Select all shown** box above the list ticks or unticks every proposal the filter shows. To clear a PDF of a pass's highlights, turn on **Allow editing saved highlights**, choose **Saved**, tick **Select all shown**, then click the delete button.
- A tick now means the same thing everywhere. On a proposal not yet in Zotero, it selects it for **Save to Zotero**. On a saved highlight, it selects it for deleting. Saved highlights are never ticked when a pass opens, a highlight is unticked as soon as it is saved, and turning editing off unticks every saved highlight. So nothing is selected for deleting unless you tick it.

## Reading pass: cut-off answers are asked again

- Sometimes the AI's answer for a group of pages is cut off, most often because it reached its token limit. Before, the proposals for those pages were lost, with an error. Ze Notes now asks again for each half of those pages, and keeps halving down to a single page if needed.
- Problems are now reported by page, for example "Pages 4–7", instead of by part number.

> **Cost:** each new request uses your own API key, and your provider bills you for it.

## Batch reading: word counts

- In the batch window, some papers showed **?** in the **Words** column because Zotero had not indexed their PDF. Ze Notes now counts these after the list appears, one paper at a time, showing **…** while it counts. Counting pauses while papers are being read.
- To count, Ze Notes asks Zotero to index the PDF. That also makes the paper searchable with Zotero's full-text search.

## Claude fixes

- Current Claude models think before they answer, and the thinking counts towards the token limit. When **Max token** is left empty in **Settings → Ze Notes → Claude**, Ze Notes now allows 16,000 tokens instead of 1,024. Before, the thinking alone could use the whole limit and leave no answer. This applies everywhere Ze Notes uses Claude.
- Ze Notes now keeps only Claude's answer and ignores its thinking.
- If Claude still runs out of tokens before answering, Ze Notes now says so and suggests raising **Max token**. Max token is an upper limit: you are billed only for the tokens Claude actually uses.

---

### If you are updating from v1.2.1

v1.2.2 also included:

- **Reading pass (AI-proposed highlights).** An AI reads a PDF and proposes passages to highlight, sorted into your own columns. You review them and save the ones you want. Quotes are checked against the PDF word for word, so a quote the AI made up is never saved. Passes and their settings are kept, and a whole collection can be read as a batch. Open it from the PDF reader's right-click menu (**Ze-Notes › Reading pass…**), from a collection or a selection of items, or from **Tools › Ze Notes › Reading pass…**.
- **Browser bridge (experimental).** A connected page such as Clew can now create PDF highlights and underlines through `POST /zotero/v1/annotations`. This needs the page's **WRITE** permission.
- **Settings fixes.** Model lists reload as soon as you enter or change an API key. The Dropbox **Share settings** row is labelled correctly.
- **Documentation.** The settings guide has a table of contents and new sections on the browser bridge and Claude.
