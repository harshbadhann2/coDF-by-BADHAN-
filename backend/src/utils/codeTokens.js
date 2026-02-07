const { Parser } = require('htmlparser2');

function parseHighlightedTokens(highlightedHtml) {
  const tokens = [];
  const classStack = [];

  const parser = new Parser(
    {
      onopentag(name, attributes) {
        if (name === 'span') {
          classStack.push(attributes.class || '');
        }
      },
      ontext(text) {
        if (!text) {
          return;
        }

        const cssClass = classStack.filter(Boolean).join(' ');
        tokens.push({
          text,
          cssClass
        });
      },
      onclosetag(name) {
        if (name === 'span') {
          classStack.pop();
        }
      }
    },
    {
      decodeEntities: true
    }
  );

  parser.write(highlightedHtml);
  parser.end();

  return tokens;
}

function tokenColor(cssClass) {
  const value = cssClass || '';

  if (value.includes('comment')) return '#2b7a78';
  if (value.includes('keyword')) return '#7c3aed';
  if (value.includes('string')) return '#2e7d32';
  if (value.includes('built_in') || value.includes('title') || value.includes('function')) return '#d97706';
  if (value.includes('attr') || value.includes('params')) return '#2b7a78';
  if (value.includes('number') || value.includes('literal')) return '#111827';

  return '#111827';
}

module.exports = {
  parseHighlightedTokens,
  tokenColor
};
