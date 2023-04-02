var TurndownPluginGfmService = (function (exports) {
  'use strict';

  var highlightRegExp = /highlight-(?:text|source)-([a-z0-9]+)/;

  function highlightedCodeBlock (turndownService) {
    turndownService.addRule('highlightedCodeBlock', {
      filter: function (node) {
        var firstChild = node.firstChild;
        return (
          node.nodeName === 'DIV' &&
          highlightRegExp.test(node.className) &&
          firstChild &&
          firstChild.nodeName === 'PRE'
        )
      },
      replacement: function (content, node, options) {
        var className = node.className || '';
        var language = (className.match(highlightRegExp) || [null, ''])[1];

        return (
          '\n\n' + options.fence + language + '\n' +
          node.firstChild.textContent +
          '\n' + options.fence + '\n\n'
        )
      }
    });
  }

  function strikethrough (turndownService) {
    turndownService.addRule('strikethrough', {
      filter: ['del', 's', 'strike'],
      replacement: function (content) {
        return '~' + content + '~'
      }
    });
  }

  var indexOf = Array.prototype.indexOf;
  var rules = {};

  rules.tableCell = {
    filter: ['th', 'td'],
    replacement: function (content, node) {
      return cell(content, node) + spannedCells(node, '')
    }
  };

  rules.tableRow = {
    filter: 'tr',
    replacement: function (content, node) {
      var borderCells = '';
      var alignMap = { left: ':--', right: '--:', center: ':-:' };

      if (isHeadingRow(node)) {
        for (var i = 0; i < node.childNodes.length; i++) {
          var border = '---';
          var align = (
            node.childNodes[i].getAttribute('align') || ''
          ).toLowerCase();

          if (align) border = alignMap[align] || border;

          borderCells += cell(border, node.childNodes[i]) + spannedCells(node.childNodes[i], border);
        }
      }
      return '\n' + content + (borderCells ? '\n' + borderCells : '')
    }
  };

  rules.table = {
    // Only convert tables that are not nested in another table, they are kept using `keep` (see below).
    // TODO: nested tables should be converted to plain text in a strict (non HTML) gfm
    filter: function (node) {
      return node.nodeName === 'TABLE' && !isNestedTable(node)
    },

    replacement: function (content) {
      // Ensure there are no blank lines
      content = content.replace('\n\n', '\n');
      return '\n\n' + content + '\n\n'
    }
  };

  rules.tableSection = {
    filter: ['thead', 'tbody', 'tfoot'],
    replacement: function (content) {
      return content
    }
  };

  rules.captionSection = {
    // only return content if caption if the first node immediately after TABLE
    filter: 'caption',
    replacement: function (content, node) {
      if (node.parentNode.nodeName === 'TABLE' && node.parentNode.childNodes[0] === node) return content
      return ''
    }
  };

  function isHeadingRow (tr) {
    var parentNode = tr.parentNode;
    var tableNode = parentNode;
    if (parentNode.nodeName === 'THEAD' ||
       parentNode.nodeName === 'TFOOT' ||
       parentNode.nodeName === 'TBODY') {
      tableNode = parentNode.parentNode;
    }
    return (tableNode.nodeName === 'TABLE' && tableNode.rows[0] === tr)
  }

  function cell (content, node) {
    var index = indexOf.call(node.parentNode.childNodes, node);
    var prefix = ' ';
    if (index === 0) prefix = '| ';
    // Ensure single line per cell (both windows and unix EoL)
    // TODO: allow gfm non-strict mode to replace new lines by `<br/>`
    content = content.replace(/\r\n/g, '\n').replace(/\n/g, ' ');
    // | must be escaped as \|
    content = content.replace(/\|/g, '\\|');
    return prefix + content + ' |'
  }

  function spannedCells (node, spannedCellContent) {
    var colspan = node.getAttribute('colspan') || 1;
    if (colspan <= 1) return ''
    return (' ' + spannedCellContent + ' |').repeat(colspan - 1)
  }

  function isNestedTable (tableNode) {
    var currentNode = tableNode.parentNode;
    while (currentNode) {
      if (currentNode.nodeName === 'TABLE') return true
      currentNode = currentNode.parentNode;
    }
    return false
  }

  function tables (turndownService) {
    turndownService.keep(function (node) {
      return node.nodeName === 'TABLE' && isNestedTable(node)
    });
    for (var key in rules) turndownService.addRule(key, rules[key]);
  }

  function taskListItems (turndownService) {
    turndownService.addRule('taskListItems', {
      filter: function (node) {
        return node.type === 'checkbox' && node.parentNode.nodeName === 'LI'
      },
      replacement: function (content, node) {
        return (node.checked ? '[x]' : '[ ]') + ' '
      }
    });
  }

  function gfm (turndownService) {
    turndownService.use([
      highlightedCodeBlock,
      strikethrough,
      tables,
      taskListItems
    ]);
  }

  exports.gfm = gfm;
  exports.highlightedCodeBlock = highlightedCodeBlock;
  exports.strikethrough = strikethrough;
  exports.tables = tables;
  exports.taskListItems = taskListItems;

  Object.defineProperty(exports, '__esModule', { value: true });

  return exports;

}({}));
