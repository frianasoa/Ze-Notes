// HTML tag classification shared by the Docx, Html2Docx and Xlsx exporters.
const HtmlElements = {
  blockElements: new Set<string>([
    "address", "article", "aside", "audio", "blockquote", "body", "canvas", "dd", "div", "dl", "dt",
    "fieldset", "figcaption", "figure", "footer", "form", "h1", "h2", "h3", "h4", "h5", "h6",
    "header", "hr", "html", "iframe", "legend", "main", "nav", "noscript", "ol", "output", "p",
    "pre", "section", "table", "tbody", "td", "textarea", "tfoot", "th", "thead", "tr", "ul"
  ]),

  inlineElements: new Set<string>([
    "a", "abbr", "b", "bdi", "bdo", "br", "button", "cite", "code", "data", "datalist", "del",
    "dfn", "em", "i", "iframe", "img", "input", "ins", "kbd", "label", "map", "mark", "meter",
    "noscript", "object", "output", "picture", "q", "ruby", "s", "samp", "select", "small",
    "span", "strong", "sub", "sup", "svg", "template", "textarea", "time", "u", "var", "wbr"
  ]),
};

export default HtmlElements;
