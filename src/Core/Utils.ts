import ZPrefs from "./ZPrefs";
import sanitizeHtml from "sanitize-html";

const Utils = {
  splitregex: /(?:<b>)?\[\[([^\[]+?)\]\](?:<\/b>)?\s*([\s\S]*?)(?=(?:<b>)?\[\[|$)/g,
  toxhtml(html: string) {
    const clean = sanitizeHtml(html, {
      allowedTags: sanitizeHtml.defaults.allowedTags.concat(["img", "br"]),
      allowedAttributes: {
        img: ["src", "srcset", "alt", "title", "width", "height", "loading", "data-attachment-key"],
      },
      allowedSchemes: ["data", "http", "https"],
      disallowedTagsMode: "recursiveEscape",
    });
    return clean;
  },

  showState(msg: string) {
    const statusBar = document.getElementById("zn-status-bar");
    if (statusBar) {
      statusBar.innerHTML = msg;
      setTimeout(() => {
        statusBar.innerHTML = "";
      }, 10000);
    }
  },

  sanitizeannotation(html: string) {
    const clean = sanitizeHtml(html, {
      allowedTags: sanitizeHtml.defaults.allowedTags.concat(["br"]),
      disallowedTagsMode: "recursiveEscape",
    });
    return clean;
  },

  splitcomment(comment: string): { [key: string]: string } {
    return this.splitcontents(comment, false);
  },

  splithtmlcomment(comment: string): { [key: string]: string } {
    return this.splitcontents(comment, true);
  },

  // Shared implementation behind splitcomment (plain text) and
  // splithtmlcomment (html: contents are auto-closed and content before the
  // first title only counts when meaningful).
  splitcontents(comment: string, html: boolean): { [key: string]: string } {
    const maincommentlabel = ZPrefs.get("main-comment-label", "");
    const result: { [key: string]: string } = {};
    const regex = this.splitregex;
    const process = (s: string) => (html ? this.autoCloseTags(s) : s);

    let match;
    let lastIndex = 0; // Keep track of last processed index
    let hasPreContent = false; // Track if there is valid content before the first title

    while ((match = regex.exec(comment)) !== null) {
      // Handle content before the first `[title]`
      if (match.index > lastIndex && (!html || !hasPreContent)) {
        const preContent = comment.slice(lastIndex, match.index).trim();
        if (preContent) {
          const processed = process(preContent);
          if (html) {
            if (this.isContentMeaningful(processed)) {
              result[maincommentlabel] = processed;
              hasPreContent = true;
            }
          } else {
            result[maincommentlabel] =
              (result[maincommentlabel] || "") + (result[maincommentlabel] ? " " : "") + processed;
          }
        }
      }

      let title = match[1].trim();
      const content = match[2].trim();

      // Handle duplicate keys
      if (result[title] !== undefined) {
        let counter = 1;
        while (result[`${title} ${counter}`] !== undefined) {
          counter++;
        }
        title = `${title} ${counter}`;
      }

      result[title] = process(content);
      lastIndex = regex.lastIndex; // Update last processed index
    }

    // Handle any remaining content after the last match
    if (lastIndex < comment.length) {
      const remainingContent = comment.slice(lastIndex).trim();
      if (remainingContent) {
        const processed = process(remainingContent);
        if (!html || this.isContentMeaningful(processed)) {
          result[maincommentlabel] =
            (result[maincommentlabel] || "") + (result[maincommentlabel] ? " " : "") + processed;
        }
      }
    }

    // Remove empty main comment if it exists
    if (html && result[maincommentlabel] && !this.isContentMeaningful(result[maincommentlabel])) {
      delete result[maincommentlabel];
    }

    return result;
  },

  autoCloseTags(html: string) {
    try {
      // Use DOMParser to parse the HTML
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, "text/html");

      // Serialize the content back to a string to auto-close tags
      const serializer = new XMLSerializer();
      return serializer.serializeToString(doc.body);
    } catch (error) {
      Zotero.log("Error parsing HTML: " + error);
      return html; // Return original content if parsing fails
    }
  },

  removeHiddenText(input: string) {
    return input
      .replace(/<<[^>]*>>\s*<br\s*\/?>?/g, "") // Removes unescaped <<>> and any <br>/<br/> following it
      .replace(/&lt;&lt;.*?&gt;&gt;\s*<br\s*\/?>?/g, "") // Removes escaped <<>> and any <br>/<br/> following it
      .replace(/<<[^>]*>>/g, "") // Removes any standalone unescaped <<>> (without <br>)
      .replace(/&lt;&lt;.*?&gt;&gt;/g, ""); // Removes any standalone escaped <<>> (without <br>)
  },

  isContentMeaningful(content: string): boolean {
    // Remove all empty tags and whitespace
    const cleanedContent = content
      .replace(/<[^>]+>/g, "") // Remove all tags
      .trim(); // Remove leading/trailing whitespace
    return content.includes("<img") || cleanedContent.length > 0; // Content is meaningful if there's any non-whitespace text
  },

  headersafe(v: string) {
    var charsToEncode = /[^\x00-\x7F]/g;
    return v.replace(charsToEncode, function (c) {
      return "\\u" + ("000" + c.charCodeAt(0).toString(16)).slice(-4);
    });
  },
};

export default Utils;
